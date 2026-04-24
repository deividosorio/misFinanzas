// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Estado global de la aplicación — el corazón de MiFinanza.
//
// PATRÓN: React Context + Provider
//   Todos los componentes acceden al estado y las funciones vía useApp().
//   Elimina el prop-drilling (pasar props de padre a hijo a nieto).
//
// MODO DEMO vs PRODUCCIÓN:
//   isDemoMode = !supabase (cuando no hay .env.local configurado)
//   - Demo:       datos en memoria, mutaciones actualizan useState local
//   - Producción: datos en Supabase, mutaciones llaman a funciones RPC
//
// AUTO-TRANSACCIONES (Regla de negocio crítica):
//   Cuando un usuario paga una deuda, marca un recurrente o deposita
//   en una meta, se crea automáticamente una transacción en el historial.
//   En producción: los RPCs de Supabase hacen esto internamente.
//   En demo: las mutaciones simulan el mismo comportamiento.
//   Idempotencia: se verifica source_id + auto_source para evitar duplicados.
//
// GESTIÓN DE MIEMBROS:
//   - status: pending → requiere aprobación del admin
//   - status: active  → puede usar la app
//   - status: suspended → bloqueado
//   Solo owner y admin pueden cambiar el status de otros miembros.
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
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react'
import { supabase } from '../lib/supabase'
import T from '../lib/translations'
import { thisMo, toDay } from '../lib/constants'

// ── Datos de demostración ────────────────────────────────────────────────────
// Se usan cuando no hay Supabase configurado (modo demo).
// Representan una familia típica canadiense con hipoteca, autos y niños.

const DEMO_PROFILE = {
  id: 'demo-user-1',
  display_name: 'Deivid',
  email: 'deivid@mifinanza.ca',
  family_id: 'demo-fam-1',
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
  id: 'demo-fam-1',
  name: 'Familia García',
  plan: 'pro',
  invite_code: 'garcia2025',
  currency: 'CAD',
  locale: 'es',
}

const DEMO_MEMBERS = [
  {
    id: 'demo-user-1', display_name: 'Deivid', email: 'deivid@mifinanza.ca',
    role: 'owner', status: 'active', is_kid: false,
    avatar_emoji: '👨', avatar_color: '#4f7cff',
  },
  {
    id: 'demo-user-2', display_name: 'Martha', email: 'martha@mifinanza.ca',
    role: 'member', status: 'active', is_kid: false,
    avatar_emoji: '👩', avatar_color: '#e879f9',
  },
  {
    id: 'demo-user-3', display_name: 'Mateo', email: '',
    role: 'member', status: 'active', is_kid: true,
    avatar_emoji: '👦', avatar_color: '#2dd4a0',
  },
  {
    id: 'demo-user-4', display_name: 'Valeria', email: '',
    role: 'member', status: 'pending', is_kid: false,  // pendiente de aprobación
    avatar_emoji: '👧', avatar_color: '#fbbf24',
  },
]

const DEMO_ACCOUNTS = [
  { id: 'acc-1', name: 'TD Savings', subtype: 'savings', color: '#4f7cff', owner_name: 'Deivid', owner_profile: 'demo-user-1', institution: 'TD Bank', balance: 14200, total_income: 32400, total_expense: 18200, opening_balance: 0, is_active: true },
  { id: 'acc-2', name: 'RBC Savings', subtype: 'savings', color: '#e879f9', owner_name: 'Martha', owner_profile: 'demo-user-2', institution: 'RBC', balance: 8750, total_income: 21000, total_expense: 12250, opening_balance: 0, is_active: true },
  { id: 'acc-3', name: 'TD Chequing', subtype: 'checking', color: '#2dd4a0', owner_name: 'Familia', owner_profile: 'demo-user-1', institution: 'TD Bank', balance: 3820, total_income: 9000, total_expense: 5180, opening_balance: 0, is_active: true },
  { id: 'acc-4', name: 'TD Visa', subtype: 'credit_card', color: '#ff6b6b', owner_name: 'Deivid', owner_profile: 'demo-user-1', institution: 'TD Bank', balance: 2340, credit_limit: 8000, last_four: '4521', opening_balance: 0, is_active: true },
  { id: 'acc-5', name: 'RBC MC', subtype: 'credit_card', color: '#fbbf24', owner_name: 'Martha', owner_profile: 'demo-user-2', institution: 'RBC', balance: 890, credit_limit: 5000, last_four: '8833', opening_balance: 0, is_active: true },
]

const DEMO_DEBTS = [
  {
    id: 'd-1', name: 'Hipoteca TD', category: 'mortgage',
    total_amount: 320000, paid_amount: 52000, monthly_payment: 1850,
    interest_rate: 4.5, start_date: '2020-01-01', is_active: true, notes: '',
    linked_account_id: 'acc-3',
  },
  {
    id: 'd-2', name: 'Auto Honda CR-V', category: 'car',
    total_amount: 28000, paid_amount: 14000, monthly_payment: 520,
    interest_rate: 5.9, start_date: '2022-06-01', is_active: true, notes: '',
    linked_account_id: 'acc-3',
  },
]

const DEMO_RECURRING = [
  { id: 'r-1', name: 'Hipoteca TD', amount: 1850, frequency: 'monthly', category: 'mortgage', account_id: 'acc-3', next_due: '2025-06-01', is_active: true, notes: '' },
  { id: 'r-2', name: 'Auto Honda', amount: 520, frequency: 'monthly', category: 'car', account_id: 'acc-3', next_due: '2025-06-05', is_active: true, notes: '' },
  { id: 'r-3', name: 'Hydro-Québec', amount: 110, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-10', is_active: true, notes: '' },
  { id: 'r-4', name: 'Bell Internet', amount: 85, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-15', is_active: true, notes: '' },
  { id: 'r-5', name: 'Seguro auto', amount: 180, frequency: 'monthly', category: 'insurance', account_id: 'acc-4', next_due: '2025-06-20', is_active: true, notes: '' },
]

const DEMO_TXNS = [
  { id: 't-1', type: 'income', category: 'salary', description: 'Salario Mayo — Deivid', amount: 5200, date: '2025-05-01', account_id: 'acc-1', payment_account_id: null, auto_source: null, created_by: 'demo-user-1' },
  { id: 't-2', type: 'income', category: 'salary', description: 'Salario Mayo — Martha', amount: 4200, date: '2025-05-01', account_id: 'acc-2', payment_account_id: null, auto_source: null, created_by: 'demo-user-2' },
  { id: 't-3', type: 'expense', category: 'food', description: 'IGA Supermercado', amount: 320, date: '2025-05-03', account_id: 'acc-3', payment_account_id: 'acc-4', auto_source: null, created_by: 'demo-user-2' },
  { id: 't-4', type: 'expense', category: 'utilities', description: 'Hydro-Québec', amount: 110, date: '2025-05-05', account_id: 'acc-3', payment_account_id: 'acc-4', auto_source: 'recurring', source_id: 'r-3', created_by: 'demo-user-1' },
  { id: 't-5', type: 'expense', category: 'transport', description: 'Gasolina Shell', amount: 95, date: '2025-05-07', account_id: 'acc-1', payment_account_id: 'acc-4', auto_source: null, created_by: 'demo-user-1' },
  { id: 't-6', type: 'saving', category: 'goal', description: 'Ahorro: Vacaciones 2025', amount: 400, date: '2025-05-08', account_id: 'acc-2', payment_account_id: null, auto_source: 'savings_deposit', source_id: 'g-1', created_by: 'demo-user-2' },
  { id: 't-7', type: 'expense', category: 'mortgage', description: 'Pago: Hipoteca TD', amount: 1850, date: '2025-05-01', account_id: 'acc-3', payment_account_id: null, auto_source: 'debt_payment', source_id: 'd-1', created_by: 'demo-user-1' },
  { id: 't-8', type: 'income', category: 'freelance', description: 'Proyecto web', amount: 1200, date: '2025-05-10', account_id: 'acc-1', payment_account_id: null, auto_source: null, created_by: 'demo-user-1' },
  { id: 't-9', type: 'expense', category: 'food', description: 'Costco', amount: 380, date: '2025-04-20', account_id: 'acc-3', payment_account_id: 'acc-4', auto_source: null, created_by: 'demo-user-1' },
  { id: 't-10', type: 'income', category: 'salary', description: 'Salario Abril — Deivid', amount: 5200, date: '2025-04-01', account_id: 'acc-1', payment_account_id: null, auto_source: null, created_by: 'demo-user-1' },
]

const DEMO_GOALS = [
  { id: 'g-1', name: 'Vacaciones 2025', target_amount: 3000, current_amount: 700, emoji: '✈️', color: '#4f7cff', status: 'active', deadline: '', notes: '', owner_profile: 'demo-user-1', account_id: 'acc-2' },
  { id: 'g-2', name: 'Fondo emergencias', target_amount: 5000, current_amount: 1800, emoji: '🛡️', color: '#2dd4a0', status: 'active', deadline: '', notes: '', owner_profile: 'demo-user-1', account_id: 'acc-2' },
  { id: 'g-3', name: 'Laptop nueva', target_amount: 1500, current_amount: 1500, emoji: '💻', color: '#a78bfa', status: 'completed', deadline: '', notes: '', owner_profile: 'demo-user-2', account_id: 'acc-2' },
]

const DEMO_KIDS_GOALS = [
  { id: 'kg-1', kid_profile: 'demo-user-3', kid_name: 'Mateo', name: 'Nintendo Switch', emoji: '🎮', color: '#818cf8', target_amount: 350, current_amount: 210, status: 'active', reward_text: '¡Vamos campeón!' },
  { id: 'kg-2', kid_profile: 'demo-user-3', kid_name: 'Mateo', name: 'Colección Pokémon', emoji: '⭐', color: '#fbbf24', target_amount: 120, current_amount: 45, status: 'active', reward_text: '¡Sigue así!' },
]

const DEMO_SUMMARY = {
  income: 12400, expense: 7820, saving: 1200, balance: 3380, savings_rate: 9.7,
  by_category: [
    { category: 'housing', value: 1800 },
    { category: 'food', value: 1240 },
    { category: 'mortgage', value: 1850 },
    { category: 'car', value: 520 },
    { category: 'utilities', value: 310 },
    { category: 'entertainment', value: 290 },
    { category: 'transport', value: 280 },
    { category: 'health', value: 120 },
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

// ── Contexto React ────────────────────────────────────────────────────────────
const AppCtx = createContext({})

/**
 * useApp — Hook para acceder al contexto desde cualquier componente.
 * @returns {object} Todo el estado y las funciones del contexto
 */
export const useApp = () => useContext(AppCtx)

// ── Provider principal ────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const isDemoMode = !supabase

  // ── Estado de autenticación ────────────────────────────────────────────────
   // ── AUTH STATE ─────────────────────────────────────────────────────────────
  // IMPORTANTE: En modo demo, authLoading = false DESDE EL INICIO.
  // No hay nada que esperar — los datos demo ya están listos.
  const [session,     setSession]     = useState(
    isDemoMode ? { user: { id:'demo-1', email:'deivid@demo.ca' } } : null
  )
  const [profile,     setProfile]     = useState(isDemoMode ? DEMO_PROFILE : null)
  const [family,      setFamily]      = useState(isDemoMode ? DEMO_FAMILY  : null)
  const [authLoading, setAuthLoading] = useState(!isDemoMode)

  // ── ESTADO DE ONBOARDING ───────────────────────────────────────────────────
  // Controla qué pantalla muestra App.jsx.
  // Valores: 'loading' | 'unauthenticated' | 'no_profile' | 'no_family' | 'pending' | 'ready'
  const [onboardingState, setOnboardingState] = useState(
    isDemoMode ? 'ready' : 'loading'
  )

  // ── Estado de datos financieros ────────────────────────────────────────────
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

  // ── Estado de UI ───────────────────────────────────────────────────────────
  const [lang, setLangState] = useState('es')
  const [tab, setTab] = useState('dashboard')
  const [filterType, setFilterType] = useState('all')

  // Filtros de período
  const [pMode, setPMode] = useState('month')
  const [selMonth, setSelMonth] = useState(thisMo())
  const [rFrom, setRFrom] = useState('2025-01-01')
  const [rTo, setRTo] = useState(toDay())
  const [af, setAf] = useState({ from: thisMo() + '-01', to: toDay() })

  // Filtros de cuenta
  const [selAcc, setSelAcc] = useState(null)
  const [selPm, setSelPm] = useState(null)

  // Modales: string con el nombre del modal activo, o null
  const [modal, setModal] = useState(null)

  // Cambiar idioma también actualiza profile
  const setLang = (l) => {
    setLangState(l)
    setProfile(prev => prev ? { ...prev, lang: l } : prev)
    // Persistir en Supabase si está disponible (fire-and-forget)
    if (supabase && profile?.id) {
      supabase.rpc('rpc_update_profile', { p_lang: l }).catch(console.error)
    }
  }

  // ── Derivados ──────────────────────────────────────────────────────────────
  const t = T[lang] || T.es
  const isKid = profile?.is_kid || false
  const isOwner = profile?.role === 'owner'
  const isFamilyAdmin = ['owner', 'admin'].includes(profile?.role)
  const kids = members.filter(m => m.is_kid)
  const pendingMembers = members.filter(m => m.status === 'pending')

  // Separar cuentas bancarias de tarjetas de crédito
  const bankAccounts = useMemo(() =>
    accounts.filter(a => !['credit_card', 'debit_card', 'credit_line'].includes(a.subtype)),
    [accounts])

  const cards = useMemo(() =>
    accounts.filter(a => ['credit_card', 'debit_card', 'credit_line'].includes(a.subtype)),
    [accounts])

  // Transacciones filtradas por período y cuenta (cálculo en cliente — inmediato)
  const filteredTxns = useMemo(() => txns.filter(tx => {
    if (tx.is_void) return false
    const inPeriod = tx.date >= af.from && tx.date <= af.to
    const inAcc = !selAcc || tx.account_id === selAcc
    const inCard = !selPm || tx.payment_account_id === selPm
    return inPeriod && inAcc && inCard
  }), [txns, af, selAcc, selPm])

  // ── EFECTO: autenticación Supabase ─────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return

    let resolved = false

    // Timeout de seguridad: si en 5 segundos no responde Supabase,
    // forzar authLoading = false para no dejar la app colgada
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[MiFinanza] Supabase getSession timeout — mostrando pantalla de auth')
        resolved = true
        setAuthLoading(false)
      }
    }, 5000)

    // ── Verificar sesión existente ────────────────────────────────────────────
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (resolved) return  // Ya se resolvió por timeout
      resolved = true
      clearTimeout(timeout)

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
        if (resolved) return

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
          user.user_metadata?.full_name    ||
          user.email?.split('@')[0]        ||
          'Usuario'

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id:           user.id,
            display_name: displayName,
            email:        user.email,
            role:         'member',    // Se cambia a 'owner' cuando crea familia
            status:       'active',
            is_kid:       false,
            avatar_emoji: '🧑',
            avatar_color: '#4f7cff',
            lang:         'es',
            theme:        'dark',
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
        supabase.from('transactions').select('*').eq('family_id', fid).eq('is_void', false).order('date', { ascending:false }).limit(500),
        supabase.from('debts').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('recurring_payments').select('*').eq('family_id', fid).eq('is_active', true).order('next_due'),
        supabase.from('savings_goals').select('*').eq('family_id', fid),
        supabase.from('kids_goals').select('*').eq('family_id', fid),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ])

      const [accs, txnsData, debtsData, recData, goalsData, kgData, membersData] = results.map(r =>
        r.status === 'fulfilled' ? r.value.data : null
      )

      if (accs)        setAccounts(accs)
      if (txnsData)    setTxns(txnsData)
      if (debtsData)   setDebts(debtsData)
      if (recData)     setRecurring(recData)
      if (goalsData)   setGoals(goalsData)
      if (kgData)      setKidsGoals(kgData)
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
    to:   pMode === 'month' ? selMonth + '-31' : rTo,
  })


  // ─────────────────────────────────────────────────────────────────────────
  // MUTACIONES — Toda la lógica de negocio
  // Cada función tiene rama demo (estado local) y producción (Supabase RPC)
  // ─────────────────────────────────────────────────────────────────────────

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
      p_name:     name.trim(),
      p_currency: currency,
      p_locale:   'es',
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
      p_lang:         changes.lang         ?? null,
      p_theme:        changes.theme        ?? null,
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

  // ── TRANSACCIONES ──────────────────────────────────────────────────────────
  /**
   * addTxn — Agrega una nueva transacción.
   * En producción: llama a rpc_add_transaction
   */
  const addTxn = async (tx) => {
    if (isDemoMode) {
      const newTx = { ...tx, id: 't-' + Date.now(), auto_source: null, is_void: false, created_by: profile?.id }
      setTxns(prev => [newTx, ...prev])
      return { data: newTx, error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_transaction', {
      p_type: tx.type,
      p_category: tx.category,
      p_description: tx.description,
      p_amount: parseFloat(tx.amount),
      p_date: tx.date,
      p_account_id: tx.account_id || null,
      p_payment_account_id: tx.payment_account_id || null,
      p_notes: tx.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  /**
   * editTxn — Edita una transacción existente.
   * En producción: llama a rpc_update_transaction
   */
  const editTxn = async (id, changes) => {
    if (isDemoMode) {
      setTxns(prev => prev.map(tx =>
        tx.id === id ? { ...tx, ...changes, amount: parseFloat(changes.amount || tx.amount) } : tx
      ))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_transaction', {
      p_txn_id: id,
      p_type: changes.type || null,
      p_category: changes.category || null,
      p_description: changes.description || null,
      p_amount: changes.amount ? parseFloat(changes.amount) : null,
      p_date: changes.date || null,
      p_account_id: changes.account_id || null,
      p_payment_account_id: changes.payment_account_id || null,
      p_notes: changes.notes || null,
    })
    if (!error) await loadData()
    return { error }
  }

  /**
   * deleteTxn — Elimina o anula una transacción.
   * Las transacciones automáticas se anulan (is_void=true), no se borran,
   * para mantener la integridad del historial.
   */
  const deleteTxn = async (id) => {
    const tx = txns.find(t => t.id === id)
    if (isDemoMode) {
      if (tx?.auto_source) {
        // Anular en lugar de borrar (transacciones automáticas)
        setTxns(prev => prev.map(t => t.id === id ? { ...t, is_void: true } : t))
      } else {
        setTxns(prev => prev.filter(t => t.id !== id))
      }
      return
    }
    if (tx?.auto_source) {
      await supabase.from('transactions').update({ is_void: true }).eq('id', id)
    } else {
      await supabase.from('transactions').delete().eq('id', id)
    }
    await loadData()
  }

  // ── CUENTAS (solo admin/owner) ─────────────────────────────────────────────

  /**
   * addAccount — Crea una nueva cuenta bancaria o tarjeta.
   * En producción: rpc_add_account (valida permisos de admin)
   */
  const addAccount = async (acc) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el administrador puede crear cuentas') }
    if (isDemoMode) {
      const newAcc = { ...acc, id: 'acc-' + Date.now(), balance: acc.opening_balance || 0, total_income: 0, total_expense: 0, is_active: true }
      setAccounts(prev => [...prev, newAcc])
      return { data: newAcc, error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_account', {
      p_name: acc.name,
      p_nature: acc.nature || 'asset',
      p_subtype: acc.subtype,
      p_owner_profile: acc.owner_profile || null,
      p_color: acc.color || '#4f7cff',
      p_institution: acc.institution || null,
      p_last_four: acc.last_four || null,
      p_credit_limit: acc.credit_limit ? parseFloat(acc.credit_limit) : null,
      p_opening_balance: acc.opening_balance ? parseFloat(acc.opening_balance) : 0,
      p_notes: acc.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  /**
   * editAccount — Edita una cuenta existente.
   */
  const editAccount = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) {
      setAccounts(prev => prev.map(a =>
        a.id === id ? { ...a, ...changes, credit_limit: changes.credit_limit ? parseFloat(changes.credit_limit) : a.credit_limit } : a
      ))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_account', {
      p_account_id: id,
      p_name: changes.name || null,
      p_color: changes.color || null,
      p_institution: changes.institution || null,
      p_credit_limit: changes.credit_limit ? parseFloat(changes.credit_limit) : null,
      p_notes: changes.notes || null,
      p_is_active: changes.is_active ?? null,
    })
    if (!error) await loadData()
    return { error }
  }

  const deleteAccount = async (id) => {
    if (!isFamilyAdmin) return
    if (isDemoMode) { setAccounts(prev => prev.filter(a => a.id !== id)); return }
    await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  // ── DEUDAS ─────────────────────────────────────────────────────────────────

  /**
   * (solo vista y edición — el pago se hace desde Recurrentes)
   * En producción: rpc_pay_debt hace todo atómicamente.
  */

  /**
   * editDebt — Edita los datos de una deuda.
   */
  const editDebt = async (id, changes) => {
    if (isDemoMode) {
      setDebts(prev => prev.map(d => d.id === id ? {
        ...d, ...changes,
        total_amount: changes.total_amount ? parseFloat(changes.total_amount) : d.total_amount,
        monthly_payment: changes.monthly_payment ? parseFloat(changes.monthly_payment) : d.monthly_payment,
        interest_rate: changes.interest_rate ? parseFloat(changes.interest_rate) : d.interest_rate,
      } : d))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_debt', { p_debt_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  /**
 * deleteDebt — Elimina una deuda.
 */
  const deleteDebt = async (id) => {
    if (isDemoMode) { setDebts(prev => prev.filter(d => d.id !== id)); return }
    await supabase.from('debts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const addDebt = async (debt) => {
    if (isDemoMode) {
      const newDebt = {
        ...debt, id: 'd-' + Date.now(),
        paid_amount: parseFloat(debt.paid_amount || 0),
        total_amount: parseFloat(debt.total_amount),
        monthly_payment: parseFloat(debt.monthly_payment || 0),
        interest_rate: parseFloat(debt.interest_rate || 0),
        is_active: true,
      }
      setDebts(prev => [...prev, newDebt])
      return { data: newDebt, error: null }
    }
    const { data, error } = await supabase.from('debts').insert({
      family_id: family.id, created_by: profile?.id, ...debt,
      total_amount: parseFloat(debt.total_amount),
      paid_amount: parseFloat(debt.paid_amount || 0),
      monthly_payment: parseFloat(debt.monthly_payment || 0),
      interest_rate: parseFloat(debt.interest_rate || 0),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  // Pago de deuda — solo desde Recurrentes cuando el recurrente tiene linked_debt_id
  const payDebt = async (debtId, amount, date = toDay()) => {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return { error: new Error('Deuda no encontrada') }
    const newPaid = Math.min(debt.total_amount, debt.paid_amount + amount)

    if (isDemoMode) {
      setDebts(prev => prev.map(d => d.id === debtId
        ? { ...d, paid_amount: newPaid, is_active: newPaid < d.total_amount } : d
      ))
      // Crear transacción automática
      const already = txns.some(tx =>
        tx.source_id === debtId && tx.auto_source === 'debt_payment' && tx.date === date && tx.amount === amount
      )
      if (!already) {
        setTxns(prev => [{
          id: 'auto-debt-' + Date.now(), type: 'expense',
          category: debt.category || 'mortgage',
          description: 'Pago: ' + debt.name,
          amount, date, account_id: debt.linked_account_id || null,
          payment_account_id: null, auto_source: 'debt_payment',
          source_id: debtId, is_void: false, created_by: profile?.id,
        }, ...prev])
      }
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_pay_debt', {
      p_debt_id: debtId, p_amount: amount, p_date: date,
    })
    if (!error) await loadData()
    return { error }
  }

  // ── PAGOS RECURRENTES ──────────────────────────────────────────────────────

  /**
   * markRecPaid — Marca un pago recurrente como pagado.
   * AUTO-TRANSACCIÓN: crea un movimiento de tipo 'expense'.
   * Avanza next_due al siguiente período según la frecuencia.
   */
  // Recurrentes — el pago puede vincular a una deuda
  const addRecurring = async (rec) => {
    if (isDemoMode) {
      const newRec = { ...rec, id: 'r-' + Date.now(), amount: parseFloat(rec.amount), is_active: true }
      setRecurring(prev => [...prev, newRec])
      return { data: newRec, error: null }
    }
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: family.id, created_by: profile?.id, ...rec, amount: parseFloat(rec.amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  /**
   * editRecurring — Edita un pago recurrente existente.
   */
  const editRecurring = async (id, changes) => {
    if (isDemoMode) {
      setRecurring(prev => prev.map(r => r.id === id ? {
        ...r, ...changes,
        amount: changes.amount ? parseFloat(changes.amount) : r.amount,
      } : r))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_recurring', { p_rec_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  const deleteRecurring = async (id) => {
    if (isDemoMode) { setRecurring(prev => prev.filter(r => r.id !== id)); return }
    await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  /**
   * markRecPaid — Marca un recurrente como pagado.
   * Si tiene linked_debt_id, también registra el abono en la deuda.
   * Crea una transacción automática en ambos casos.
   */
  const markRecPaid = async (id, date = toDay()) => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return { error: new Error('No encontrado') }

    if (isDemoMode) {
      // Avanzar next_due
      const nx = new Date(rec.next_due)
      const freqDays = { weekly: 7, biweekly: 14, monthly: 1, yearly: 12 }
      if (rec.frequency === 'monthly') nx.setMonth(nx.getMonth() + 1)
      else if (rec.frequency === 'yearly') nx.setMonth(nx.getMonth() + 12)
      else nx.setDate(nx.getDate() + freqDays[rec.frequency])

      setRecurring(prev => prev.map(r =>
        r.id === id ? { ...r, next_due: nx.toISOString().slice(0, 10) } : r
      ))

      // Crear transacción automática
      const already = txns.some(tx =>
        tx.source_id === id && tx.auto_source === 'recurring' && tx.date === date
      )
      if (!already) {
        setTxns(prev => [{
          id: 'auto-rec-' + Date.now(), type: 'expense',
          category: rec.category, description: rec.name,
          amount: rec.amount, date,
          account_id: rec.account_id || null,
          payment_account_id: null,
          auto_source: 'recurring', source_id: id,
          is_void: false, created_by: profile?.id,
        }, ...prev])
      }

      // Si tiene deuda vinculada, abonar también
      if (rec.linked_debt_id) {
        await payDebt(rec.linked_debt_id, rec.amount, date)
      }

      return { error: null }
    }

    const { error } = await supabase.rpc('rpc_mark_recurring_paid', {
      p_rec_id: id, p_date: date,
    })
    // Si tiene deuda vinculada, registrar abono también
    if (!error && rec.linked_debt_id) {
      await supabase.rpc('rpc_pay_debt', {
        p_debt_id: rec.linked_debt_id, p_amount: rec.amount, p_date: date,
      })
    }
    if (!error) await loadData()
    return { error }
  }

  // ── METAS DE AHORRO ────────────────────────────────────────────────────────

  /**
   * depositGoal — Deposita en una meta de ahorro.
   * AUTO-TRANSACCIÓN: crea un movimiento de tipo 'saving'.
   */
  const depositGoal = async (id, amount, date = toDay()) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: new Error('Meta no encontrada') }
    if (amount <= 0) return { error: new Error('Monto debe ser mayor que cero') }

    const newAmount = Math.min(goal.target_amount, goal.current_amount + amount)

    if (isDemoMode) {
      setGoals(prev => prev.map(g =>
        g.id === id ? { ...g, current_amount: newAmount, status: newAmount >= g.target_amount ? 'completed' : g.status } : g
      ))
      setTxns(prev => [{
        id: 'auto-save-' + Date.now(),
        type: 'saving',
        category: 'goal',
        description: 'Ahorro: ' + goal.name,
        amount: amount,
        date: date,
        account_id: goal.account_id || null,
        payment_account_id: null,
        auto_source: 'savings_deposit',
        source_id: id,
        is_void: false,
        created_by: profile?.id,
      }, ...prev])
      return { data: { current_amount: newAmount }, error: null }
    }

    const { data, error } = await supabase.rpc('rpc_deposit_savings_goal', {
      p_goal_id: id,
      p_amount: amount,
      p_date: date,
      p_account_id: goal.account_id || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  /**
   * editGoal — Edita una meta de ahorro.
   */
  const editGoal = async (id, changes) => {
    if (isDemoMode) {
      setGoals(prev => prev.map(g =>
        g.id === id ? {
          ...g, ...changes,
          target_amount: changes.target_amount ? parseFloat(changes.target_amount) : g.target_amount,
        } : g
      ))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_savings_goal', {
      p_goal_id: id,
      p_name: changes.name || null,
      p_target_amount: changes.target_amount ? parseFloat(changes.target_amount) : null,
      p_emoji: changes.emoji || null,
      p_color: changes.color || null,
      p_deadline: changes.deadline || null,
      p_notes: changes.notes || null,
    })
    if (!error) await loadData()
    return { error }
  }

  const addGoal = async (goal) => {
    if (isDemoMode) {
      const newGoal = { ...goal, id: 'g-' + Date.now(), current_amount: 0, status: 'active' }
      setGoals(prev => [...prev, newGoal])
      return { data: newGoal, error: null }
    }
    const { data, error } = await supabase.from('savings_goals').insert({
      family_id: family.id,
      owner_profile: profile?.id,
      ...goal,
      target_amount: parseFloat(goal.target_amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const deleteGoal = async (id) => {
    if (isDemoMode) { setGoals(prev => prev.filter(g => g.id !== id)); return }
    await supabase.from('savings_goals').delete().eq('id', id)
    await loadData()
  }

  // ── METAS KIDS ─────────────────────────────────────────────────────────────

  const depositKidGoal = async (id, amount) => {
    if (isDemoMode) {
      setKidsGoals(prev => prev.map(g => {
        if (g.id !== id) return g
        const newAmt = Math.min(g.target_amount, g.current_amount + amount)
        return { ...g, current_amount: newAmt, status: newAmt >= g.target_amount ? 'completed' : g.status }
      }))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_kids_deposit', { p_goal_id: id, p_amount: amount })
    if (!error) await loadData()
    return { error }
  }

  const addKidGoal = async (goal) => {
    if (isDemoMode) {
      const newGoal = { ...goal, id: 'kg-' + Date.now(), current_amount: 0, status: 'active' }
      setKidsGoals(prev => [...prev, newGoal])
      return { data: newGoal, error: null }
    }
    const { data, error } = await supabase.from('kids_goals').insert({
      family_id: family.id, ...goal, target_amount: parseFloat(goal.target_amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  // ── GESTIÓN DE MIEMBROS (solo admin/owner) ─────────────────────────────────

  /**
   * setMemberStatus — Aprueba o suspende un miembro.
   * pending → active (aprobar)
   * active → suspended (suspender)
   */
  const setMemberStatus = async (memberId, status) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }

    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_status', {
      p_member_id: memberId,
      p_status: status,
    })
    if (!error) await loadData()
    return { error }
  }

  /**
   * setMemberRole — Cambia el rol de un miembro (solo owner).
   */
  const setMemberRole = async (memberId, role) => {
    if (profile?.role !== 'owner') return { error: new Error('Solo el propietario') }

    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_role', {
      p_member_id: memberId,
      p_role: role,
    })
    if (!error) await loadData()
    return { error }
  }

  // ── PERFIL ─────────────────────────────────────────────────────────────────

  /**
   * updateProfile — Actualiza preferencias del perfil propio.
   */
  const updateProfile = async (changes) => {
    if (isDemoMode) {
      setProfile(prev => ({ ...prev, ...changes }))
      if (changes.lang) setLang(changes.lang)
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_profile', {
      p_display_name: changes.display_name || null,
      p_avatar_emoji: changes.avatar_emoji || null,
      p_avatar_color: changes.avatar_color || null,
      p_lang: changes.lang || null,
      p_theme: changes.theme || null,
    })
    if (!error) {
      setProfile(prev => ({ ...prev, ...changes }))
      if (changes.lang) setLang(changes.lang)
    }
    return { error }
  }

  // ── AUTENTICACIÓN ──────────────────────────────────────────────────────────

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null); setProfile(null); setFamily(null)
  }

  // ── HELPERS DE BÚSQUEDA ────────────────────────────────────────────────────
  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)

  // ── MODALES ────────────────────────────────────────────────────────────────
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

    // Mutaciones — Transacciones
    addTxn, editTxn, deleteTxn,

    // Mutaciones — Cuentas
    addAccount, editAccount, deleteAccount,

    // Mutaciones — Deudas
    addDebt, editDebt, deleteDebt, payDebt,

    // Mutaciones — Recurrentes
    addRecurring, editRecurring, deleteRecurring, markRecPaid,

    // Mutaciones — Metas
    addGoal, editGoal, deleteGoal, depositGoal,
    addKidGoal, depositKidGoal,

    // Mutaciones — Miembros
    setMemberStatus, setMemberRole,

    // Helpers
    getAccount, getMember, reload: loadData,

    // Setters directos (para demo y casos edge)
    setAccounts, setDebts, setRecurring, setTxns, setGoals, setKidsGoals, setMembers,
  }

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}
