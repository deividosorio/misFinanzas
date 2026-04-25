// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Estado global de la aplicación.
//
// ── CORRECCIONES APLICADAS ────────────────────────────────────────────────────
//
// PROBLEMA 1: authLoading nunca terminaba
//   CAUSA: loadProfile() podía lanzar excepciones silenciosas o quedarse
//          esperando si el perfil no existía en la BD.
//   SOLUCIÓN: try/catch completo + finally que SIEMPRE llama setAuthLoading(false)
//             + timeout de 8 segundos como red de seguridad.
//
// PROBLEMA 2: Usuario sin family_id no veía FamilySetupScreen
//   CAUSA: App.jsx solo evaluaba si había sesión, no el estado del onboarding.
//   SOLUCIÓN: El contexto expone `onboardingState` con estos valores:
//     'loading'        → esperando respuesta de Supabase
//     'unauthenticated'→ no hay sesión activa
//     'no_profile'     → hay sesión pero el perfil no existe en BD (trigger falló)
//     'no_family'      → perfil existe pero family_id = null
//     'pending'        → en familia pero status = 'pending' (esperando aprobación)
//     'ready'          → todo OK, mostrar la app
//   App.jsx usa este valor para decidir qué pantalla renderizar.
//
// PROBLEMA 3: Role vacío en primer usuario
//   CAUSA: El trigger handle_new_user() en PostgreSQL no siempre se ejecuta
//          (especialmente si el schema no está instalado correctamente).
//   SOLUCIÓN: loadProfile() tiene lógica de rescate:
//     Si el perfil no existe → lo crea manualmente con INSERT
//     Si el rol está vacío → lo defaultea a 'member'
//     El owner se asigna SOLO cuando llama a rpc_create_family()
//
// PROBLEMA 4: Sin opción de cerrar sesión en pantallas de onboarding
//   SOLUCIÓN: signOut() está disponible en el contexto desde el primer render,
//             incluso antes de que haya familia asignada.
//
// ── MÁQUINA DE ESTADOS DE ONBOARDING ─────────────────────────────────────────
//
//   signUp()
//     │
//     ▼
//   Trigger handle_new_user() crea profiles con family_id = NULL
//     │
//     ▼
//   onboardingState = 'no_family'
//     │
//     ├── "Crear familia" → rpc_create_family() → role = 'owner' → 'ready'
//     └── "Unirme"        → rpc_join_family()   → status = 'pending'
//                               │
//                               ▼
//                         onboardingState = 'pending'
//                               │
//                         Admin aprueba → status = 'active'
//                               │
//                               ▼
//                         onboardingState = 'ready'
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react'
import { supabase } from '../lib/supabase'
import T from '../lib/translations'
import { thisMo, toDay } from '../lib/constants'

// ── Datos de demostración ─────────────────────────────────────────────────────
// Usados cuando supabase = null (modo demo / sin .env.local)

const DEMO_PROFILE = {
  id: 'demo-1',
  display_name: 'Deivid García',
  email: 'deivid@demo.ca',
  family_id: 'fam-1',
  role: 'owner',
  status: 'active',
  is_kid: false,
  avatar_emoji: '👨',
  avatar_color: '#4f7cff',
  lang: 'es',
  theme: 'dark',
  onboarded: true,
  created_at: '2025-01-15T10:00:00Z',
}

const DEMO_FAMILY = {
  id: 'fam-1',
  name: 'Familia García',
  plan: 'pro',
  invite_code: 'garcia2025',
  currency: 'CAD',
  locale: 'es',
}

const DEMO_MEMBERS = [
  { id: 'demo-1', display_name: 'Deivid', email: 'deivid@demo.ca', role: 'owner', status: 'active', is_kid: false, avatar_emoji: '👨', avatar_color: '#4f7cff' },
  { id: 'demo-2', display_name: 'Andrea', email: 'andrea@demo.ca', role: 'member', status: 'active', is_kid: false, avatar_emoji: '👩', avatar_color: '#e879f9' },
  { id: 'demo-3', display_name: 'Mateo', email: '', role: 'member', status: 'active', is_kid: true, avatar_emoji: '👦', avatar_color: '#2dd4a0' },
  { id: 'demo-4', display_name: 'Valeria', email: '', role: 'member', status: 'pending', is_kid: false, avatar_emoji: '👧', avatar_color: '#fbbf24' },
]

const DEMO_ACCOUNTS = [
  { id: 'acc-1', name: 'TD Savings', subtype: 'savings', color: '#4f7cff', owner_name: 'Deivid', balance: 14200, total_income: 32400, total_expense: 18200, is_active: true },
  { id: 'acc-2', name: 'RBC Savings', subtype: 'savings', color: '#e879f9', owner_name: 'Andrea', balance: 8750, total_income: 21000, total_expense: 12250, is_active: true },
  { id: 'acc-3', name: 'TD Chequing', subtype: 'checking', color: '#2dd4a0', owner_name: 'Familia', balance: 3820, total_income: 9000, total_expense: 5180, is_active: true },
  { id: 'acc-4', name: 'TD Visa', subtype: 'credit_card', color: '#ff6b6b', owner_name: 'Deivid', balance: 2340, credit_limit: 8000, last_four: '4521', is_active: true },
  { id: 'acc-5', name: 'RBC MC', subtype: 'credit_card', color: '#fbbf24', owner_name: 'Andrea', balance: 890, credit_limit: 5000, last_four: '8833', is_active: true },
]

const DEMO_DEBTS = [
  { id: 'd-1', name: 'Hipoteca TD', category: 'mortgage', total_amount: 320000, paid_amount: 52000, monthly_payment: 1850, interest_rate: 4.5, start_date: '2020-01-01', is_active: true, linked_account_id: 'acc-3' },
  { id: 'd-2', name: 'Auto Honda CR-V', category: 'car', total_amount: 28000, paid_amount: 14000, monthly_payment: 520, interest_rate: 5.9, start_date: '2022-06-01', is_active: true, linked_account_id: 'acc-3' },
]

const DEMO_RECURRING = [
  { id: 'r-1', name: 'Hipoteca TD', amount: 1850, frequency: 'monthly', category: 'mortgage', account_id: 'acc-3', next_due: '2025-06-01', is_active: true, notes: '', linked_debt_id: 'd-1' },
  { id: 'r-2', name: 'Auto Honda', amount: 520, frequency: 'monthly', category: 'car', account_id: 'acc-3', next_due: '2025-06-05', is_active: true, notes: '', linked_debt_id: 'd-2' },
  { id: 'r-3', name: 'Hydro-Québec', amount: 110, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-10', is_active: true, notes: '', linked_debt_id: null },
  { id: 'r-4', name: 'Bell Internet', amount: 85, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-15', is_active: true, notes: '', linked_debt_id: null },
  { id: 'r-5', name: 'Seguro auto', amount: 180, frequency: 'monthly', category: 'insurance', account_id: 'acc-4', next_due: '2025-06-20', is_active: true, notes: '', linked_debt_id: null },
]

const DEMO_TXNS = [
  { id: 't-1', type: 'income', category: 'salary', description: 'Salario Mayo — Deivid', amount: 5200, date: '2025-05-01', account_id: 'acc-1', payment_account_id: null, auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-2', type: 'income', category: 'salary', description: 'Salario Mayo — Andrea', amount: 4200, date: '2025-05-01', account_id: 'acc-2', payment_account_id: null, auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-3', type: 'expense', category: 'food', description: 'IGA Supermercado', amount: 320, date: '2025-05-03', account_id: 'acc-3', payment_account_id: 'acc-4', auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-4', type: 'expense', category: 'mortgage', description: 'Pago: Hipoteca TD', amount: 1850, date: '2025-05-01', account_id: 'acc-3', payment_account_id: null, auto_source: 'debt_payment', source_id: 'd-1', created_by: 'demo-1', is_void: false },
  { id: 't-5', type: 'saving', category: 'goal', description: 'Ahorro: Vacaciones', amount: 400, date: '2025-05-08', account_id: 'acc-2', payment_account_id: null, auto_source: 'savings_deposit', source_id: 'g-1', created_by: 'demo-2', is_void: false },
  { id: 't-6', type: 'income', category: 'freelance', description: 'Proyecto web', amount: 1200, date: '2025-05-10', account_id: 'acc-1', payment_account_id: null, auto_source: null, created_by: 'demo-1', is_void: false },
]

const DEMO_GOALS = [
  { id: 'g-1', name: 'Vacaciones 2025', target_amount: 3000, current_amount: 700, emoji: '✈️', color: '#4f7cff', status: 'active', owner_profile: 'demo-1', account_id: 'acc-2' },
  { id: 'g-2', name: 'Fondo emergencias', target_amount: 5000, current_amount: 1800, emoji: '🛡️', color: '#2dd4a0', status: 'active', owner_profile: 'demo-1', account_id: 'acc-2' },
]

const DEMO_KIDS_GOALS = [
  { id: 'kg-1', kid_profile: 'demo-3', kid_name: 'Mateo', name: 'Nintendo Switch', emoji: '🎮', color: '#818cf8', target_amount: 350, current_amount: 210, status: 'active', reward_text: '¡Vamos campeón!' },
]

const DEMO_SUMMARY = {
  income: 12400, expense: 7820, saving: 1200, balance: 3380, savings_rate: 9.7,
  by_category: [
    { category: 'mortgage', value: 1850 },
    { category: 'food', value: 1240 },
    { category: 'housing', value: 800 },
    { category: 'car', value: 520 },
    { category: 'utilities', value: 310 },
    { category: 'entertainment', value: 290 },
    { category: 'transport', value: 280 },
    { category: 'insurance', value: 180 },
  ],
  monthly_trend: [
    { month: '2024-10', income: 9800, expense: 5200, saving: 900 },
    { month: '2024-11', income: 10200, expense: 5800, saving: 1000 },
    { month: '2024-12', income: 14200, expense: 8200, saving: 1400 },
    { month: '2025-01', income: 9600, expense: 4900, saving: 1100 },
    { month: '2025-02', income: 10400, expense: 5100, saving: 1200 },
    { month: '2025-03', income: 10780, expense: 4745, saving: 1100 },
    { month: '2025-04', income: 11600, expense: 7300, saving: 1050 },
    { month: '2025-05', income: 12400, expense: 7820, saving: 1200 },
  ],
}

const DEMO_NET_WORTH = { assets: 26770, liabilities: 282000, net: -255230 }

// ── Contexto ──────────────────────────────────────────────────────────────────
const AppCtx = createContext({})
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const isDemoMode = !supabase

  // ── AUTH STATE ─────────────────────────────────────────────────────────────
  // IMPORTANTE: En modo demo, authLoading = false DESDE EL INICIO.
  // No hay nada que esperar — los datos demo ya están listos.
  const [session, setSession] = useState(
    isDemoMode ? { user: { id: 'demo-1', email: 'deivid@demo.ca' } } : null
  )
  const [profile, setProfile] = useState(isDemoMode ? DEMO_PROFILE : null)
  const [family, setFamily] = useState(isDemoMode ? DEMO_FAMILY : null)
  const [authLoading, setAuthLoading] = useState(!isDemoMode)

  // ── ESTADO DE ONBOARDING ───────────────────────────────────────────────────
  // Controla qué pantalla muestra App.jsx.
  // Valores: 'loading' | 'unauthenticated' | 'no_profile' | 'no_family' | 'pending' | 'ready'
  const [onboardingState, setOnboardingState] = useState(
    isDemoMode ? 'ready' : 'loading'
  )

  // ── DATOS FINANCIEROS ──────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState(isDemoMode ? DEMO_ACCOUNTS : [])
  const [debts, setDebts] = useState(isDemoMode ? DEMO_DEBTS : [])
  const [recurring, setRecurring] = useState(isDemoMode ? DEMO_RECURRING : [])
  const [txns, setTxns] = useState(isDemoMode ? DEMO_TXNS : [])
  const [goals, setGoals] = useState(isDemoMode ? DEMO_GOALS : [])
  const [kidsGoals, setKidsGoals] = useState(isDemoMode ? DEMO_KIDS_GOALS : [])
  const [members, setMembers] = useState(isDemoMode ? DEMO_MEMBERS : [])
  const [summary, setSummary] = useState(isDemoMode ? DEMO_SUMMARY : null)
  const [netWorth, setNetWorth] = useState(isDemoMode ? DEMO_NET_WORTH : null)
  const [dataLoading, setDataLoading] = useState(false)

  // ── UI STATE ───────────────────────────────────────────────────────────────
  const [lang, setLangState] = useState('es')
  const [tab, setTab] = useState('dashboard')
  const [filterType, setFilterType] = useState('all')
  const [pMode, setPMode] = useState('month')
  const [selMonth, setSelMonth] = useState(thisMo())
  const [rFrom, setRFrom] = useState('2025-01-01')
  const [rTo, setRTo] = useState(toDay())
  const [af, setAf] = useState({ from: thisMo() + '-01', to: toDay() })
  const [selAcc, setSelAcc] = useState(null)
  const [selPm, setSelPm] = useState(null)
  const [modal, setModal] = useState(null)

  // Helper para cambiar idioma (también persiste en perfil si está autenticado)
  const setLang = (l) => {
    setLangState(l)
    setProfile(prev => prev ? { ...prev, lang: l } : prev)
    // Persistir en Supabase si está disponible (fire-and-forget)
    if (supabase && profile?.id) {
      supabase.rpc('rpc_update_profile', { p_lang: l }).catch(console.error)
    }
  }

  // ── DERIVADOS ──────────────────────────────────────────────────────────────
  const t = T[lang] || T.es
  const isKid = profile?.is_kid || false
  const isOwner = profile?.role === 'owner'
  const isFamilyAdmin = ['owner', 'admin'].includes(profile?.role)
  const kids = members.filter(m => m.is_kid)
  const pendingMembers = members.filter(m => m.status === 'pending')

  const bankAccounts = useMemo(() =>
    accounts.filter(a => !['credit_card', 'debit_card', 'credit_line'].includes(a.subtype)),
    [accounts])

  const cards = useMemo(() =>
    accounts.filter(a => ['credit_card', 'debit_card', 'credit_line'].includes(a.subtype)),
    [accounts])

  const filteredTxns = useMemo(() =>
    txns.filter(tx => {
      if (tx.is_void) return false
      const inPeriod = tx.date >= af.from && tx.date <= af.to
      const inAcc = !selAcc || tx.account_id === selAcc
      const inCard = !selPm || tx.payment_account_id === selPm
      return inPeriod && inAcc && inCard
    }),
    [txns, af, selAcc, selPm])

  // ── EFECTO DE AUTENTICACIÓN ────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return // En demo no hay nada que verificar

    let cancelled = false // Para evitar actualizar estado en componentes desmontados

    // ── Timeout de seguridad ─────────────────────────────────────────────────
    // Si Supabase no responde en 8 segundos (red lenta, offline, claves incorrectas)
    // forzamos el estado a 'unauthenticated' para que el usuario pueda hacer algo.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[MiFinanza] Supabase timeout — mostrando pantalla de login')
        setAuthLoading(false)
        setOnboardingState('unauthenticated')
      }
    }, 8000)

    // ── Verificar sesión existente ────────────────────────────────────────────
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (cancelled) return
      clearTimeout(safetyTimeout)

      if (error) {
        console.error('[MiFinanza] getSession error:', error.message)
        setAuthLoading(false)
        setOnboardingState('unauthenticated')
        return
      }

      if (!session?.user) {
        // No hay sesión activa → mostrar login
        setSession(null)
        setAuthLoading(false)
        setOnboardingState('unauthenticated')
        return
      }

      // Hay sesión → cargar el perfil
      setSession(session)
      await resolveProfile(session.user)
    })

    // ── Escuchar cambios de auth ──────────────────────────────────────────────
    // Se activa cuando el usuario hace login, logout, o refresca el token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return

        console.log('[MiFinanza] Auth event:', event)

        if (event === 'SIGNED_OUT' || !session) {
          setSession(null)
          setProfile(null)
          setFamily(null)
          setOnboardingState('unauthenticated')
          setAuthLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(session)
          await resolveProfile(session.user)
        }
      }
    )

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [isDemoMode])

  // ── resolveProfile ────────────────────────────────────────────────────────
  /**
   * Carga el perfil del usuario y determina el estado de onboarding.
   *
   * FLUJO:
   *   1. Buscar perfil en la tabla profiles
   *   2. Si NO existe → crearlo (el trigger falló o es usuario muy nuevo)
   *   3. Si existe sin family_id → estado 'no_family' → mostrar FamilySetupScreen
   *   4. Si existe con family_id y status='pending' → estado 'pending'
   *   5. Si existe con family_id y status='active' → cargar familia → estado 'ready'
   *
   * @param {object} user - Objeto de usuario de supabase.auth
   */
  const resolveProfile = async (user) => {
    try {
      // Intentar obtener el perfil existente
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Si el perfil no existe (el trigger no corrió), crearlo manualmente
      if (profileError?.code === 'PGRST116' || !profileData) {
        console.warn('[MiFinanza] Perfil no encontrado — creando manualmente')
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Usuario'

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            display_name: displayName,
            email: user.email,
            role: 'member',    // Se cambia a 'owner' cuando crea familia
            status: 'active',
            is_kid: false,
            avatar_emoji: '🧑',
            avatar_color: '#4f7cff',
            lang: 'es',
            theme: 'dark',
          })
          .select()
          .single()

        if (insertError) {
          console.error('[MiFinanza] Error creando perfil:', insertError.message)
          setAuthLoading(false)
          setOnboardingState('no_profile')
          return
        }

        profileData = newProfile
      }

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[MiFinanza] Error cargando perfil:', profileError.message)
        setAuthLoading(false)
        setOnboardingState('unauthenticated')
        return
      }

      // Asegurar que el rol no esté vacío
      if (!profileData.role) {
        await supabase.from('profiles').update({ role: 'member' }).eq('id', user.id)
        profileData = { ...profileData, role: 'member' }
      }

      setProfile(profileData)
      setLangState(profileData.lang || 'es')

      // ── CASO: Sin familia asignada ─────────────────────────────────────────
      if (!profileData.family_id) {
        setAuthLoading(false)
        setOnboardingState('no_family')
        return
      }

      // ── CASO: Con familia pero pendiente de aprobación ─────────────────────
      if (profileData.status === 'pending') {
        // Cargar la familia para mostrar el nombre en la pantalla de espera
        const { data: familyData } = await supabase
          .from('families')
          .select('*')
          .eq('id', profileData.family_id)
          .single()
        if (familyData) setFamily(familyData)
        setAuthLoading(false)
        setOnboardingState('pending')
        return
      }

      // ── CASO: Activo con familia ───────────────────────────────────────────
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', profileData.family_id)
        .single()

      if (familyError || !familyData) {
        // La familia no existe (fue eliminada) → resetear family_id
        console.warn('[MiFinanza] Familia no encontrada, reseteando family_id')
        await supabase.from('profiles').update({ family_id: null }).eq('id', user.id)
        setProfile(prev => prev ? { ...prev, family_id: null } : prev)
        setAuthLoading(false)
        setOnboardingState('no_family')
        return
      }

      setFamily(familyData)
      setAuthLoading(false)
      setOnboardingState('ready')

    } catch (err) {
      console.error('[MiFinanza] resolveProfile error inesperado:', err)
      setAuthLoading(false)
      setOnboardingState('unauthenticated')
    }
  }

  // ── RECARGAR PERFIL ────────────────────────────────────────────────────────
  /**
   * Fuerza la recarga del perfil desde Supabase.
   * Útil después de aprobar un miembro, cambiar familia, etc.
   */
  const reloadProfile = useCallback(async () => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setOnboardingState('loading')
      setAuthLoading(true)
      await resolveProfile(session.user)
    }
  }, [])

  // ── CARGAR DATOS FINANCIEROS ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (isDemoMode || !family?.id) return
    setDataLoading(true)
    const fid = family.id

    try {
      const results = await Promise.allSettled([
        supabase.from('accounts').select('*').eq('family_id', fid).eq('is_active', true).order('created_at'),
        supabase.from('transactions').select('*').eq('family_id', fid).eq('is_void', false).order('date', { ascending: false }).limit(500),
        supabase.from('debts').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('recurring_payments').select('*').eq('family_id', fid).eq('is_active', true).order('next_due'),
        supabase.from('savings_goals').select('*').eq('family_id', fid),
        supabase.from('kids_goals').select('*').eq('family_id', fid),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ])

      const [accs, txnsData, debtsData, recData, goalsData, kgData, membersData] = results.map(r =>
        r.status === 'fulfilled' ? r.value.data : null
      )

      if (accs) setAccounts(accs)
      if (txnsData) setTxns(txnsData)
      if (debtsData) setDebts(debtsData)
      if (recData) setRecurring(recData)
      if (goalsData) setGoals(goalsData)
      if (kgData) setKidsGoals(kgData)
      if (membersData) setMembers(membersData)

      const { data: sumData } = await supabase.rpc('rpc_dashboard_summary', {
        p_from: af.from, p_to: af.to, p_account_id: selAcc || null,
      })
      if (sumData) setSummary(sumData)

      const { data: nwData } = await supabase.rpc('rpc_net_worth')
      if (nwData) setNetWorth(nwData)

    } catch (err) {
      console.error('[MiFinanza] loadData error:', err)
    } finally {
      setDataLoading(false)
    }
  }, [family?.id, af, selAcc, isDemoMode])

  useEffect(() => {
    if (family?.id && onboardingState === 'ready') loadData()
  }, [loadData, onboardingState])

  const applyFilter = () => setAf({
    from: pMode === 'month' ? selMonth + '-01' : rFrom,
    to: pMode === 'month' ? selMonth + '-31' : rTo,
  })

  // ── MUTACIONES ─────────────────────────────────────────────────────────────

  /**
   * signOut — Cierra la sesión del usuario.
   * Disponible incluso durante el onboarding para que el usuario
   * pueda salir si se equivocó de cuenta.
   */
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setFamily(null)
    setOnboardingState('unauthenticated')
    setMembers([])
    setAccounts([])
    setTxns([])
    setDebts([])
    setRecurring([])
    setGoals([])
    setKidsGoals([])
  }

  /**
   * createFamily — Crea una nueva familia y asigna al usuario actual como owner.
   * Solo se llama desde FamilySetupScreen cuando el usuario elige "Crear familia".
   */
  const createFamily = async (name, currency = 'CAD') => {
    if (!supabase) return { error: new Error('Modo demo — no se puede crear familia') }

    const { data, error } = await supabase.rpc('rpc_create_family', {
      p_name: name.trim(),
      p_currency: currency,
      p_locale: 'es',
    })

    if (error) return { data: null, error }

    // Recargar el perfil para obtener el family_id y role=owner asignados
    await reloadProfile()
    return { data, error: null }
  }

  /**
   * joinFamily — Unirse a una familia existente con un código de invitación.
   * El usuario queda con status='pending' hasta que el admin lo apruebe.
   */
  const joinFamily = async (inviteCode) => {
    if (!supabase) return { error: new Error('Modo demo') }

    const { data, error } = await supabase.rpc('rpc_join_family', {
      p_invite_code: inviteCode.trim().toLowerCase(),
    })

    if (error) return { data: null, error }

    // Recargar perfil para obtener family_id y status=pending
    await reloadProfile()
    return { data, error: null }
  }

  /**
   * updateProfile — Actualiza las preferencias del perfil propio.
   */
  const updateProfile = async (changes) => {
    if (isDemoMode) {
      setProfile(prev => prev ? { ...prev, ...changes } : prev)
      if (changes.lang) setLangState(changes.lang)
      return { error: null }
    }

    const { error } = await supabase.rpc('rpc_update_profile', {
      p_display_name: changes.display_name ?? null,
      p_avatar_emoji: changes.avatar_emoji ?? null,
      p_avatar_color: changes.avatar_color ?? null,
      p_lang: changes.lang ?? null,
      p_theme: changes.theme ?? null,
    })

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...changes } : prev)
      if (changes.lang) setLangState(changes.lang)
    }

    return { error }
  }

  // Miembros
  const setMemberStatus = async (memberId, status) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_status', { p_member_id: memberId, p_status: status })
    if (!error) await loadData()
    return { error }
  }

  const setMemberRole = async (memberId, role) => {
    if (profile?.role !== 'owner') return { error: new Error('Solo el propietario') }
    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_role', { p_member_id: memberId, p_role: role })
    if (!error) await loadData()
    return { error }
  }

  // Transacciones (implementación simplificada — extender según necesidad)
  const addTxn = async (tx) => {
    if (isDemoMode) {
      setTxns(prev => [{ ...tx, id: 't-' + Date.now(), auto_source: null, is_void: false, created_by: profile?.id }, ...prev])
      return { error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_transaction', {
      p_type: tx.type, p_category: tx.category, p_description: tx.description,
      p_amount: parseFloat(tx.amount), p_date: tx.date,
      p_account_id: tx.account_id || null,
      p_payment_account_id: tx.payment_account_id || null,
      p_notes: tx.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  const deleteTxn = async (id) => {
    const tx = txns.find(t => t.id === id)
    if (isDemoMode) {
      if (tx?.auto_source) setTxns(prev => prev.map(t => t.id === id ? { ...t, is_void: true } : t))
      else setTxns(prev => prev.filter(t => t.id !== id))
      return
    }
    if (tx?.auto_source) await supabase.from('transactions').update({ is_void: true }).eq('id', id)
    else await supabase.from('transactions').delete().eq('id', id)
    await loadData()
  }

  const editTxn = async (id, changes) => {
    if (isDemoMode) {
      setTxns(prev => prev.map(tx => tx.id === id ? { ...tx, ...changes, amount: parseFloat(changes.amount || tx.amount) } : tx))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_transaction', { p_txn_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  // Cuentas
  const addAccount = async (acc) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el administrador puede crear cuentas') }
    if (isDemoMode) {
      setAccounts(prev => [...prev, { ...acc, id: 'acc-' + Date.now(), balance: acc.opening_balance || 0, total_income: 0, total_expense: 0, is_active: true }])
      return { error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_account', {
      p_name: acc.name, p_nature: acc.nature || 'asset', p_subtype: acc.subtype,
      p_owner_profile: acc.owner_profile || null, p_color: acc.color || '#4f7cff',
      p_institution: acc.institution || null, p_last_four: acc.last_four || null,
      p_credit_limit: acc.credit_limit ? parseFloat(acc.credit_limit) : null,
      p_opening_balance: parseFloat(acc.opening_balance || 0),
    })
    if (!error) await loadData()
    return { data, error }
  }

  const editAccount = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) { setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_account', { p_account_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  // Deudas
  const addDebt = async (debt) => {
    if (isDemoMode) {
      setDebts(prev => [...prev, { ...debt, id: 'd-' + Date.now(), paid_amount: parseFloat(debt.paid_amount || 0), total_amount: parseFloat(debt.total_amount), monthly_payment: parseFloat(debt.monthly_payment || 0), interest_rate: parseFloat(debt.interest_rate || 0), is_active: true }])
      return { error: null }
    }
    const { data, error } = await supabase.from('debts').insert({ family_id: family.id, created_by: profile?.id, ...debt, total_amount: parseFloat(debt.total_amount), paid_amount: parseFloat(debt.paid_amount || 0), monthly_payment: parseFloat(debt.monthly_payment || 0), interest_rate: parseFloat(debt.interest_rate || 0) }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editDebt = async (id, changes) => {
    if (isDemoMode) { setDebts(prev => prev.map(d => d.id === id ? { ...d, ...changes, total_amount: changes.total_amount ? parseFloat(changes.total_amount) : d.total_amount, monthly_payment: changes.monthly_payment ? parseFloat(changes.monthly_payment) : d.monthly_payment, interest_rate: changes.interest_rate ? parseFloat(changes.interest_rate) : d.interest_rate } : d)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_debt', { p_debt_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  const deleteDebt = async (id) => {
    if (isDemoMode) { setDebts(prev => prev.filter(d => d.id !== id)); return }
    await supabase.from('debts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const payDebt = async (debtId, amount, date = toDay()) => {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return { error: new Error('Deuda no encontrada') }
    const newPaid = Math.min(debt.total_amount, debt.paid_amount + amount)
    if (isDemoMode) {
      setDebts(prev => prev.map(d => d.id === debtId ? { ...d, paid_amount: newPaid, is_active: newPaid < d.total_amount } : d))
      const already = txns.some(tx => tx.source_id === debtId && tx.auto_source === 'debt_payment' && tx.date === date && tx.amount === amount)
      if (!already) setTxns(prev => [{ id: 'auto-d-' + Date.now(), type: 'expense', category: debt.category || 'mortgage', description: 'Pago: ' + debt.name, amount, date, account_id: debt.linked_account_id || null, payment_account_id: null, auto_source: 'debt_payment', source_id: debtId, is_void: false, created_by: profile?.id }, ...prev])
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_pay_debt', { p_debt_id: debtId, p_amount: amount, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // Recurrentes
  const addRecurring = async (rec) => {
    if (isDemoMode) { setRecurring(prev => [...prev, { ...rec, id: 'r-' + Date.now(), amount: parseFloat(rec.amount), is_active: true }]); return { error: null } }
    const { data, error } = await supabase.from('recurring_payments').insert({ family_id: family.id, created_by: profile?.id, ...rec, amount: parseFloat(rec.amount) }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editRecurring = async (id, changes) => {
    if (isDemoMode) { setRecurring(prev => prev.map(r => r.id === id ? { ...r, ...changes, amount: changes.amount ? parseFloat(changes.amount) : r.amount } : r)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_recurring', { p_rec_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  const deleteRecurring = async (id) => {
    if (isDemoMode) { setRecurring(prev => prev.filter(r => r.id !== id)); return }
    await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const markRecPaid = async (id, date = toDay()) => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return { error: new Error('No encontrado') }
    if (isDemoMode) {
      const nx = new Date(rec.next_due)
      if (rec.frequency === 'monthly') nx.setMonth(nx.getMonth() + 1)
      else if (rec.frequency === 'yearly') nx.setMonth(nx.getMonth() + 12)
      else if (rec.frequency === 'biweekly') nx.setDate(nx.getDate() + 14)
      else nx.setDate(nx.getDate() + 7)
      setRecurring(prev => prev.map(r => r.id === id ? { ...r, next_due: nx.toISOString().slice(0, 10) } : r))
      const already = txns.some(tx => tx.source_id === id && tx.auto_source === 'recurring' && tx.date === date)
      if (!already) setTxns(prev => [{ id: 'auto-r-' + Date.now(), type: 'expense', category: rec.category, description: rec.name, amount: rec.amount, date, account_id: rec.account_id || null, payment_account_id: null, auto_source: 'recurring', source_id: id, is_void: false, created_by: profile?.id }, ...prev])
      if (rec.linked_debt_id) await payDebt(rec.linked_debt_id, rec.amount, date)
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_mark_recurring_paid', { p_rec_id: id, p_date: date })
    if (!error && rec.linked_debt_id) await supabase.rpc('rpc_pay_debt', { p_debt_id: rec.linked_debt_id, p_amount: rec.amount, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // Metas
  const addGoal = async (goal) => {
    if (isDemoMode) { setGoals(prev => [...prev, { ...goal, id: 'g-' + Date.now(), current_amount: 0, status: 'active' }]); return { error: null } }
    const { data, error } = await supabase.from('savings_goals').insert({ family_id: family.id, owner_profile: profile?.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editGoal = async (id, changes) => {
    if (isDemoMode) { setGoals(prev => prev.map(g => g.id === id ? { ...g, ...changes, target_amount: changes.target_amount ? parseFloat(changes.target_amount) : g.target_amount } : g)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_savings_goal', { p_goal_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  const deleteGoal = async (id) => {
    if (isDemoMode) { setGoals(prev => prev.filter(g => g.id !== id)); return }
    await supabase.from('savings_goals').delete().eq('id', id)
    await loadData()
  }

  const depositGoal = async (id, amount, date = toDay()) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: new Error('Meta no encontrada') }
    const newAmt = Math.min(goal.target_amount, goal.current_amount + amount)
    if (isDemoMode) {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: newAmt, status: newAmt >= g.target_amount ? 'completed' : g.status } : g))
      setTxns(prev => [{ id: 'auto-s-' + Date.now(), type: 'saving', category: 'goal', description: 'Ahorro: ' + goal.name, amount, date, account_id: goal.account_id || null, payment_account_id: null, auto_source: 'savings_deposit', source_id: id, is_void: false, created_by: profile?.id }, ...prev])
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_deposit_savings_goal', { p_goal_id: id, p_amount: amount, p_date: date, p_account_id: goal.account_id || null })
    if (!error) await loadData()
    return { error }
  }

  const addKidGoal = async (goal) => {
    if (isDemoMode) { setKidsGoals(prev => [...prev, { ...goal, id: 'kg-' + Date.now(), current_amount: 0, status: 'active' }]); return { error: null } }
    const { data, error } = await supabase.from('kids_goals').insert({ family_id: family.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const depositKidGoal = async (id, amount) => {
    if (isDemoMode) { setKidsGoals(prev => prev.map(g => { if (g.id !== id) return g; const n = Math.min(g.target_amount, g.current_amount + amount); return { ...g, current_amount: n, status: n >= g.target_amount ? 'completed' : g.status } })); return { error: null } }
    const { error } = await supabase.rpc('rpc_kids_deposit', { p_goal_id: id, p_amount: amount })
    if (!error) await loadData()
    return { error }
  }

  // Helpers
  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)
  const openModal = (name) => setModal(name)
  const closeModal = () => setModal(null)

  // ── VALOR DEL CONTEXTO ─────────────────────────────────────────────────────
  const ctx = {
    // Auth + onboarding
    session, profile, family, members, authLoading, isDemoMode,
    onboardingState, signOut, updateProfile, createFamily, joinFamily, reloadProfile,
    // Datos
    accounts, bankAccounts, cards, debts, recurring, txns,
    goals, kidsGoals, summary, netWorth, dataLoading, filteredTxns,
    // Derivados
    t, lang, setLang, tab, setTab,
    isKid, isOwner, isFamilyAdmin, kids, pendingMembers,
    // Filtros
    filterType, setFilterType,
    pMode, setPMode, selMonth, setSelMonth,
    rFrom, setRFrom, rTo, setRTo,
    af, applyFilter, selAcc, setSelAcc, selPm, setSelPm,
    // Modales
    modal, openModal, closeModal,
    // Mutaciones
    addTxn, editTxn, deleteTxn,
    addAccount, editAccount,
    addDebt, editDebt, deleteDebt, payDebt,
    addRecurring, editRecurring, deleteRecurring, markRecPaid,
    addGoal, editGoal, deleteGoal, depositGoal,
    addKidGoal, depositKidGoal,
    setMemberStatus, setMemberRole,
    getAccount, getMember, reload: loadData,
    setAccounts, setDebts, setRecurring, setTxns, setGoals, setKidsGoals, setMembers,
  }

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}