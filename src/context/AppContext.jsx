// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Estado global de la aplicación.
//
// ── CORRECCIONES APLICADAS ────────────────────────────────────────────────────
//
// CORRECCIONES v4 aplicadas en este archivo:
//
//  1. DEMO_TXNS: eliminado payment_account_id. En v4 solo existe account_id.
//     Las transacciones con tarjeta de crédito usan account_id = id_de_la_tarjeta.
//
//  2. bankAccounts / cards: ELIMINADOS como derivados separados.
//     Reemplazados por:
//       assetAccounts  → cuentas de activo (checking/savings/investment/cash)
//       creditAccounts → cuentas de crédito (credit_card/credit_line)
//     Los componentes que necesiten filtrar lo hacen con CREDIT_SUBTYPES.
//
//  3. selPm / setSelPm: ELIMINADOS (era el filtro por "forma de pago").
//     El filtro ahora es solo por account_id (unificado).
//
//  4. filteredTxns: ya no filtra por payment_account_id (no existe).
//
//  5. addTxn / editTxn: eliminado p_payment_account_id del RPC call.
//
//  6. addAccount: eliminado p_nature del RPC call (v4 lo deriva del subtype).
//
//  7. Auto-transacciones demo: eliminado payment_account_id de los objetos.
//
//  8. markRecPaid demo: corrección — Hydro/Bell usan acc-4 (credit_card),
//     que es correcto porque se pagan con la Visa. El gasto queda en la tarjeta.
// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIONES v4 aplicadas en este archivo:
//
//  1. DEMO_TXNS: eliminado payment_account_id. En v4 solo existe account_id.
//     Las transacciones con tarjeta de crédito usan account_id = id_de_la_tarjeta.
//
//  2. bankAccounts / cards: ELIMINADOS como derivados separados.
//     Reemplazados por:
//       assetAccounts  → cuentas de activo (checking/savings/investment/cash)
//       creditAccounts → cuentas de crédito (credit_card/credit_line)
//     Los componentes que necesiten filtrar lo hacen con CREDIT_SUBTYPES.
//
//  3. selPm / setSelPm: ELIMINADOS (era el filtro por "forma de pago").
//     El filtro ahora es solo por account_id (unificado).
//
//  4. filteredTxns: ya no filtra por payment_account_id (no existe).
//
//  5. addTxn / editTxn: eliminado p_payment_account_id del RPC call.
//
//  6. addAccount: eliminado p_nature del RPC call (v4 lo deriva del subtype).
//
//  7. Auto-transacciones demo: eliminado payment_account_id de los objetos.
//
//  8. markRecPaid demo: corrección — Hydro/Bell usan acc-4 (credit_card),
//     que es correcto porque se pagan con la Visa. El gasto queda en la tarjeta.
// ─────────────────────────────────────────────────────────────────────────────
// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIONES v4 aplicadas en este archivo:
//
//  1. DEMO_TXNS: eliminado payment_account_id. En v4 solo existe account_id.
//     Las transacciones con tarjeta de crédito usan account_id = id_de_la_tarjeta.
//
//  2. bankAccounts / cards: ELIMINADOS como derivados separados.
//     Reemplazados por:
//       assetAccounts  → cuentas de activo (checking/savings/investment/cash)
//       creditAccounts → cuentas de crédito (credit_card/credit_line)
//     Los componentes que necesiten filtrar lo hacen con CREDIT_SUBTYPES.
//
//  3. selPm / setSelPm: ELIMINADOS (era el filtro por "forma de pago").
//     El filtro ahora es solo por account_id (unificado).
//
//  4. filteredTxns: ya no filtra por payment_account_id (no existe).
//
//  5. addTxn / editTxn: eliminado p_payment_account_id del RPC call.
//
//  6. addAccount: eliminado p_nature del RPC call (v4 lo deriva del subtype).
//
//  7. Auto-transacciones demo: eliminado payment_account_id de los objetos.
//
//  8. markRecPaid demo: corrección — Hydro/Bell usan acc-4 (credit_card),
//     que es correcto porque se pagan con la Visa. El gasto queda en la tarjeta.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react'
import { supabase } from '../lib/supabase'
import T from '../lib/translations'
import { CREDIT_SUBTYPES, thisMo, toDay } from '../lib/constants'

// ── Datos demo ─────────────────────────────────────────────────────────────
// IMPORTANTE: En v4, account_id en una transacción puede ser:
//   - Una cuenta de activo (checking/savings) → gasto baja el saldo
//   - Una tarjeta de crédito → gasto sube la deuda de la tarjeta
// Ya NO existe payment_account_id.

const DEMO_PROFILE = {
  id: 'demo-1', display_name: 'Deivid García', email: 'deivid@demo.ca',
  family_id: 'fam-1', role: 'owner', status: 'active', is_kid: false,
  avatar_emoji: '👨', avatar_color: '#4f7cff', lang: 'es', theme: 'dark',
  onboarded: true, created_at: '2025-01-15T10:00:00Z',
}

const DEMO_FAMILY = {
  id: 'fam-1', name: 'Familia García', plan: 'pro',
  invite_code: 'garcia2025', currency: 'CAD', locale: 'es',
}

const DEMO_MEMBERS = [
  { id: 'demo-1', display_name: 'Deivid', email: 'deivid@demo.ca', role: 'owner', status: 'active', is_kid: false, avatar_emoji: '👨', avatar_color: '#4f7cff' },
  { id: 'demo-2', display_name: 'Andrea', email: 'andrea@demo.ca', role: 'member', status: 'active', is_kid: false, avatar_emoji: '👩', avatar_color: '#e879f9' },
  { id: 'demo-3', display_name: 'Mateo', email: '', role: 'member', status: 'active', is_kid: true, avatar_emoji: '👦', avatar_color: '#2dd4a0' },
  { id: 'demo-4', display_name: 'Valeria', email: '', role: 'member', status: 'pending', is_kid: false, avatar_emoji: '👧', avatar_color: '#fbbf24' },
]

// Cuentas unificadas v4: activos + crédito en la misma lista
// Campos de activos: balance (saldo calculado), opening_balance
// Campos de crédito: credit_limit, month_debt (deuda mes), available (disponible)
const DEMO_ACCOUNTS = [
  {
    id: 'acc-1', name: 'TD Savings', subtype: 'savings',
    color: '#4f7cff', owner_name: 'Deivid', owner_profile: 'demo-1',
    institution: 'TD Bank', is_active: true,
    opening_balance: 10000,
    // balance = opening + ingresos - gastos - ahorros (calculado)
    balance: 14200, total_income: 32400, total_expense: 18200,
  },
  {
    id: 'acc-2', name: 'RBC Savings', subtype: 'savings',
    color: '#e879f9', owner_name: 'Andrea', owner_profile: 'demo-2',
    institution: 'RBC', is_active: true,
    opening_balance: 5000,
    balance: 8750, total_income: 21000, total_expense: 12250,
  },
  {
    id: 'acc-3', name: 'TD Chequing', subtype: 'checking',
    color: '#2dd4a0', owner_name: 'Familia', owner_profile: 'demo-1',
    institution: 'TD Bank', is_active: true,
    opening_balance: 2000,
    balance: 3820, total_income: 9000, total_expense: 5180,
  },
  {
    // TARJETA DE CRÉDITO: no tiene balance, tiene month_debt y available
    id: 'acc-4', name: 'TD Visa', subtype: 'credit_card',
    color: '#ff6b6b', owner_name: 'Deivid', owner_profile: 'demo-1',
    institution: 'TD Bank', last_four: '4521', is_active: true,
    credit_limit: 8000,
    month_debt: 2340,       // deuda acumulada en el mes actual
    available: 5660,        // credit_limit - month_debt
    opening_balance: 0,
  },
  {
    id: 'acc-5', name: 'RBC MC', subtype: 'credit_card',
    color: '#fbbf24', owner_name: 'Andrea', owner_profile: 'demo-2',
    institution: 'RBC', last_four: '8833', is_active: true,
    credit_limit: 5000,
    month_debt: 890,
    available: 4110,
    opening_balance: 0,
  },
]

const DEMO_DEBTS = [
  { id: 'd-1', name: 'Hipoteca TD', category: 'mortgage', total_amount: 320000, paid_amount: 52000, monthly_payment: 1850, interest_rate: 4.5, start_date: '2020-01-01', is_active: true, linked_account_id: 'acc-3' },
  { id: 'd-2', name: 'Auto Honda CR-V', category: 'car', total_amount: 28000, paid_amount: 14000, monthly_payment: 520, interest_rate: 5.9, start_date: '2022-06-01', is_active: true, linked_account_id: 'acc-3' },
]

const DEMO_RECURRING = [
  // Pago de hipoteca → desde cuenta de chequing (acc-3), vinculado a deuda d-1
  { id: 'r-1', name: 'Hipoteca TD', amount: 1850, frequency: 'monthly', category: 'mortgage', account_id: 'acc-3', next_due: '2025-06-01', is_active: true, notes: '', linked_debt_id: 'd-1' },
  // Pago auto → desde cuenta de chequing (acc-3), vinculado a deuda d-2
  { id: 'r-2', name: 'Auto Honda', amount: 520, frequency: 'monthly', category: 'car', account_id: 'acc-3', next_due: '2025-06-05', is_active: true, notes: '', linked_debt_id: 'd-2' },
  // Servicios → pagados con tarjeta de crédito (acc-4 = TD Visa)
  { id: 'r-3', name: 'Hydro-Québec', amount: 110, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-10', is_active: true, notes: '', linked_debt_id: null },
  { id: 'r-4', name: 'Bell Internet', amount: 85, frequency: 'monthly', category: 'utilities', account_id: 'acc-4', next_due: '2025-06-15', is_active: true, notes: '', linked_debt_id: null },
  { id: 'r-5', name: 'Seguro auto', amount: 180, frequency: 'monthly', category: 'insurance', account_id: 'acc-4', next_due: '2025-06-20', is_active: true, notes: '', linked_debt_id: null },
]

// DEMO_TXNS v4: solo account_id (sin payment_account_id)
// La cuenta puede ser activo o crédito — la lógica la determina el subtype
const DEMO_TXNS = [
  // Ingresos → van a cuentas de activo
  { id: 't-1', type: 'income', category: 'salary', description: 'Salario Mayo — Deivid', amount: 5200, date: '2025-05-01', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-2', type: 'income', category: 'salary', description: 'Salario Mayo — Andrea', amount: 4200, date: '2025-05-01', account_id: 'acc-2', auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-7', type: 'income', category: 'freelance', description: 'Proyecto web', amount: 1200, date: '2025-05-10', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-10', type: 'income', category: 'salary', description: 'Salario Abril — Deivid', amount: 5200, date: '2025-04-01', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  // Gastos con tarjeta de crédito (acc-4 = TD Visa)
  // La deuda de acc-4 sube, el disponible baja
  { id: 't-3', type: 'expense', category: 'food', description: 'IGA Supermercado', amount: 320, date: '2025-05-03', account_id: 'acc-4', auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-8', type: 'expense', category: 'food', description: 'Costco', amount: 380, date: '2025-04-20', account_id: 'acc-4', auto_source: null, created_by: 'demo-1', is_void: false },
  // Gastos desde débito (acc-3 = TD Chequing)
  // El saldo de acc-3 baja
  { id: 't-5', type: 'expense', category: 'transport', description: 'Gasolina Shell', amount: 95, date: '2025-05-07', account_id: 'acc-3', auto_source: null, created_by: 'demo-1', is_void: false },
  // Pago automático recurrente de Hydro → cargo en tarjeta (acc-4)
  { id: 't-4', type: 'expense', category: 'utilities', description: 'Hydro-Québec', amount: 110, date: '2025-05-05', account_id: 'acc-4', auto_source: 'recurring', source_id: 'r-3', created_by: 'demo-1', is_void: false },
  // Pago automático de hipoteca → desde chequing (acc-3), abona a deuda d-1
  { id: 't-9', type: 'expense', category: 'mortgage', description: 'Pago: Hipoteca TD', amount: 1850, date: '2025-05-01', account_id: 'acc-3', auto_source: 'debt_payment', source_id: 'd-1', created_by: 'demo-1', is_void: false },
  // Depósito en meta de ahorro → desde acc-2 (RBC Savings)
  { id: 't-6', type: 'saving', category: 'goal', description: 'Ahorro: Vacaciones', amount: 400, date: '2025-05-08', account_id: 'acc-2', auto_source: 'savings_deposit', source_id: 'g-1', created_by: 'demo-2', is_void: false },
]

const DEMO_GOALS = [
  { id: 'g-1', name: 'Vacaciones 2025', target_amount: 3000, current_amount: 700, emoji: '✈️', color: '#4f7cff', status: 'active', deadline: '', notes: '', owner_profile: 'demo-1', account_id: 'acc-2' },
  { id: 'g-2', name: 'Fondo emergencias', target_amount: 5000, current_amount: 1800, emoji: '🛡️', color: '#2dd4a0', status: 'active', deadline: '', notes: '', owner_profile: 'demo-1', account_id: 'acc-2' },
  { id: 'g-3', name: 'Laptop nueva', target_amount: 1500, current_amount: 1500, emoji: '💻', color: '#a78bfa', status: 'completed', deadline: '', notes: '', owner_profile: 'demo-2', account_id: 'acc-2' },
]

const DEMO_KIDS_GOALS = [
  { id: 'kg-1', kid_profile: 'demo-3', kid_name: 'Mateo', name: 'Nintendo Switch', emoji: '🎮', color: '#818cf8', target_amount: 350, current_amount: 210, status: 'active', reward_text: '¡Vamos campeón!' },
  { id: 'kg-2', kid_profile: 'demo-3', kid_name: 'Mateo', name: 'Colección Pokémon', emoji: '⭐', color: '#fbbf24', target_amount: 120, current_amount: 45, status: 'active', reward_text: '¡Sigue así!' },
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
    { category: 'health', value: 120 },
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

// rpc_net_worth v4 devuelve 3 campos distintos
const DEMO_NET_WORTH = {
  assets: 26770,   // suma de saldos en cuentas de activo
  credit_debt: 3230,   // deuda acumulada en tarjetas (acc-4 + acc-5)
  long_debt: 282000,  // deuda restante en préstamos (hipoteca + auto)
  liabilities: 285230,
  net: -258460, // assets - credit_debt - long_debt
}

// ── Contexto ────────────────────────────────────────────────────────────────
const AppCtx = createContext({})
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const isDemoMode = !supabase

  // ── Auth state ─────────────────────────────────────────────────────────
  const [session, setSession] = useState(isDemoMode ? { user: { id: 'demo-1', email: 'deivid@demo.ca' } } : null)
  const [profile, setProfile] = useState(isDemoMode ? DEMO_PROFILE : null)
  const [family, setFamily] = useState(isDemoMode ? DEMO_FAMILY : null)
  const [authLoading, setAuthLoading] = useState(!isDemoMode)
  const [onboardingState, setOnboardingState] = useState(isDemoMode ? 'ready' : 'loading')

  // ── Datos financieros ──────────────────────────────────────────────────
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

  // ── UI state ───────────────────────────────────────────────────────────
  const [lang, setLangState] = useState('es')
  const [tab, setTab] = useState('dashboard')
  const [filterType, setFilterType] = useState('all')
  const [pMode, setPMode] = useState('month')
  const [selMonth, setSelMonth] = useState(thisMo())
  const [rFrom, setRFrom] = useState('2025-01-01')
  const [rTo, setRTo] = useState(toDay())
  const [af, setAf] = useState({ from: thisMo() + '-01', to: toDay() })
  // selAcc: filtrar por cuenta (unificado — ya no hay selPm separado)
  const [selAcc, setSelAcc] = useState(null)
  const [modal, setModal] = useState(null)

  const setLang = (l) => {
    setLangState(l)
    setProfile(prev => prev ? { ...prev, lang: l } : prev)
    if (supabase && profile?.id)
      supabase.rpc('rpc_update_profile', { p_lang: l }).catch(console.error)
  }

  // ── Derivados ──────────────────────────────────────────────────────────
  const t = T[lang] || T.es
  const isKid = profile?.is_kid || false
  const isOwner = profile?.role === 'owner'
  const isFamilyAdmin = ['owner', 'admin'].includes(profile?.role)
  const kids = members.filter(m => m.is_kid)
  const pendingMembers = members.filter(m => m.status === 'pending')

  // v4: cuentas de activo (débito, ahorro, inversión, efectivo)
  const assetAccounts = useMemo(() =>
    accounts.filter(a => !CREDIT_SUBTYPES.includes(a.subtype))
    , [accounts])

  // v4: cuentas de crédito (tarjetas, líneas de crédito)
  const creditAccounts = useMemo(() =>
    accounts.filter(a => CREDIT_SUBTYPES.includes(a.subtype))
    , [accounts])

  // filteredTxns v4: filtra solo por account_id (sin payment_account_id)
  const filteredTxns = useMemo(() =>
    txns.filter(tx => {
      if (tx.is_void) return false
      const inPeriod = tx.date >= af.from && tx.date <= af.to
      const inAcc = !selAcc || tx.account_id === selAcc
      return inPeriod && inAcc
    })
    , [txns, af, selAcc])

  // ── Efecto auth ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return
    let cancelled = false

    const timeout = setTimeout(() => {
      if (!cancelled) { setAuthLoading(false); setOnboardingState('unauthenticated') }
    }, 8000)

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (cancelled) return
      clearTimeout(timeout)
      if (error || !session?.user) {
        setAuthLoading(false); setOnboardingState('unauthenticated'); return
      }
      setSession(session)
      await resolveProfile(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        if (!session) {
          setSession(null); setProfile(null); setFamily(null)
          setOnboardingState('unauthenticated'); setAuthLoading(false)
          return
        }
        setSession(session)
        await resolveProfile(session.user)
      }
    )

    return () => { cancelled = true; clearTimeout(timeout); subscription.unsubscribe() }
  }, [isDemoMode])

  const resolveProfile = async (user) => {
    try {
      let { data: prof, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()

      if (pErr?.code === 'PGRST116' || !prof) {
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] || 'Usuario'
        const { data: newProf, error: insErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id, email: user.email, display_name: displayName,
            role: 'member', status: 'active', is_kid: false,
            avatar_emoji: '🧑', avatar_color: '#4f7cff', lang: 'es', theme: 'dark'
          })
          .select().single()
        if (insErr) { setAuthLoading(false); setOnboardingState('no_profile'); return }
        prof = newProf
      } else if (pErr) {
        setAuthLoading(false); setOnboardingState('unauthenticated'); return
      }

      setProfile(prof)
      setLangState(prof.lang || 'es')

      if (!prof.family_id) { setAuthLoading(false); setOnboardingState('no_family'); return }
      if (prof.status === 'pending') {
        const { data: fam } = await supabase.from('families').select('*').eq('id', prof.family_id).single()
        if (fam) setFamily(fam)
        setAuthLoading(false); setOnboardingState('pending'); return
      }

      const { data: fam, error: fErr } = await supabase
        .from('families').select('*').eq('id', prof.family_id).single()
      if (fErr || !fam) {
        await supabase.from('profiles').update({ family_id: null }).eq('id', user.id)
        setProfile(prev => prev ? { ...prev, family_id: null } : prev)
        setAuthLoading(false); setOnboardingState('no_family'); return
      }

      setFamily(fam)
      setAuthLoading(false)
      setOnboardingState('ready')
    } catch (err) {
      console.error('[MiFinanza] resolveProfile:', err)
      setAuthLoading(false); setOnboardingState('unauthenticated')
    }
  }

  const reloadProfile = useCallback(async () => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setOnboardingState('loading'); setAuthLoading(true)
      await resolveProfile(session.user)
    }
  }, [])

  // ── loadData ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (isDemoMode || !family?.id) return
    setDataLoading(true)
    const fid = family.id
    try {
      const results = await Promise.allSettled([
        // v4: una sola tabla accounts para todo
        supabase.from('account_balances').select('*').eq('family_id', fid),
        supabase.from('transactions').select('*').eq('family_id', fid).eq('is_void', false).order('date', { ascending: false }).limit(500),
        supabase.from('debts').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('recurring_with_details').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('savings_goals').select('*').eq('family_id', fid),
        supabase.from('kids_goals').select('*').eq('family_id', fid),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ])

      const [accs, txnsData, debtsData, recData, goalsData, kgData, membersData] =
        results.map(r => r.status === 'fulfilled' ? r.value.data : null)

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
      console.error('[MiFinanza] loadData:', err)
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

  // ── MUTACIONES ─────────────────────────────────────────────────────────

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null); setProfile(null); setFamily(null)
    setOnboardingState('unauthenticated')
    setMembers([]); setAccounts([]); setTxns([])
    setDebts([]); setRecurring([]); setGoals([]); setKidsGoals([])
  }

  const createFamily = async (name, currency = 'CAD') => {
    if (!supabase) return { error: new Error('Modo demo') }
    const { data, error } = await supabase.rpc('rpc_create_family',
      { p_name: name.trim(), p_currency: currency, p_locale: 'es' })
    if (!error) await reloadProfile()
    return { data, error }
  }

  const joinFamily = async (inviteCode) => {
    if (!supabase) return { error: new Error('Modo demo') }
    const { data, error } = await supabase.rpc('rpc_join_family',
      { p_invite_code: inviteCode.trim().toLowerCase() })
    if (!error) await reloadProfile()
    return { data, error }
  }

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

  // ── Transacciones ──────────────────────────────────────────────────────

  const addTxn = async (tx) => {
    if (isDemoMode) {
      // v4: sin payment_account_id
      const newTx = {
        ...tx, id: 't-' + Date.now(),
        auto_source: null, is_void: false, created_by: profile?.id,
      }
      setTxns(prev => [newTx, ...prev])
      return { error: null }
    }
    // v4: RPC sin p_payment_account_id
    const { data, error } = await supabase.rpc('rpc_add_transaction', {
      p_type: tx.type,
      p_category: tx.category,
      p_description: tx.description,
      p_amount: parseFloat(tx.amount),
      p_date: tx.date,
      p_account_id: tx.account_id || null,
      p_notes: tx.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  const editTxn = async (id, changes) => {
    if (isDemoMode) {
      setTxns(prev => prev.map(tx => tx.id === id
        ? { ...tx, ...changes, amount: parseFloat(changes.amount || tx.amount) }
        : tx
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
      p_notes: changes.notes || null,
    })
    if (!error) await loadData()
    return { error }
  }

  const deleteTxn = async (id) => {
    const tx = txns.find(t => t.id === id)
    if (isDemoMode) {
      if (tx?.auto_source)
        setTxns(prev => prev.map(t => t.id === id ? { ...t, is_void: true } : t))
      else
        setTxns(prev => prev.filter(t => t.id !== id))
      return
    }
    if (tx?.auto_source)
      await supabase.from('transactions').update({ is_void: true }).eq('id', id)
    else
      await supabase.from('transactions').delete().eq('id', id)
    await loadData()
  }

  // ── Cuentas (modelo unificado v4) ─────────────────────────────────────

  const addAccount = async (acc) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el administrador puede crear cuentas') }
    if (isDemoMode) {
      const isCredit = CREDIT_SUBTYPES.includes(acc.subtype)
      const newAcc = {
        ...acc,
        id: 'acc-' + Date.now(),
        is_active: true,
        opening_balance: isCredit ? 0 : (parseFloat(acc.opening_balance) || 0),
        // Para activos: balance inicial = opening_balance
        ...(isCredit
          ? { credit_limit: parseFloat(acc.credit_limit), month_debt: 0, available: parseFloat(acc.credit_limit) }
          : { balance: parseFloat(acc.opening_balance || 0), total_income: 0, total_expense: 0 }
        ),
      }
      setAccounts(prev => [...prev, newAcc])
      return { error: null }
    }
    // v4: rpc_add_account sin p_nature (se deriva del subtype en el backend)
    const { data, error } = await supabase.rpc('rpc_add_account', {
      p_name: acc.name,
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

  const editAccount = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a))
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
    if (isDemoMode) { setAccounts(prev => prev.filter(a => a.id !== id)); return }
    await supabase.from('accounts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  // ── Deudas ─────────────────────────────────────────────────────────────

  const addDebt = async (debt) => {
    if (isDemoMode) {
      setDebts(prev => [...prev, {
        ...debt, id: 'd-' + Date.now(),
        paid_amount: parseFloat(debt.paid_amount || 0),
        total_amount: parseFloat(debt.total_amount),
        monthly_payment: parseFloat(debt.monthly_payment || 0),
        interest_rate: parseFloat(debt.interest_rate || 0),
        is_active: true,
      }])
      return { error: null }
    }
    const { data, error } = await supabase.from('debts').insert({
      family_id: family.id, created_by: profile?.id, ...debt,
      total_amount: parseFloat(debt.total_amount),
      paid_amount: parseFloat(debt.paid_amount || 0),
      monthly_payment: debt.monthly_payment ? parseFloat(debt.monthly_payment) : null,
      interest_rate: parseFloat(debt.interest_rate || 0),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

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

  const deleteDebt = async (id) => {
    if (isDemoMode) { setDebts(prev => prev.filter(d => d.id !== id)); return }
    await supabase.from('debts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  // payDebt: solo llamado internamente desde markRecPaid cuando hay linked_debt_id
  // En v4 el usuario NO paga deudas manualmente desde Debts.jsx
  const payDebt = async (debtId, amount, date = toDay()) => {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return { error: new Error('Deuda no encontrada') }
    const newPaid = Math.min(debt.total_amount, debt.paid_amount + amount)

    if (isDemoMode) {
      setDebts(prev => prev.map(d => d.id === debtId
        ? { ...d, paid_amount: newPaid, is_active: newPaid < d.total_amount }
        : d
      ))
      // Auto-transacción: gasto desde la cuenta linked_account_id de la deuda
      // (que es una cuenta de activo, no una tarjeta)
      const already = txns.some(tx =>
        tx.source_id === debtId && tx.auto_source === 'debt_payment'
        && tx.date === date && tx.amount === amount
      )
      if (!already) {
        setTxns(prev => [{
          id: 'auto-d-' + Date.now(),
          type: 'expense',
          category: debt.category || 'mortgage',
          description: 'Pago: ' + debt.name,
          amount, date,
          account_id: debt.linked_account_id || null, // cuenta de activo (chequing)
          auto_source: 'debt_payment',
          source_id: debtId,
          is_void: false,
          created_by: profile?.id,
        }, ...prev])
      }
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_pay_debt',
      { p_debt_id: debtId, p_amount: amount, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Recurrentes ────────────────────────────────────────────────────────

  const addRecurring = async (rec) => {
    if (isDemoMode) {
      setRecurring(prev => [...prev, {
        ...rec, id: 'r-' + Date.now(),
        amount: parseFloat(rec.amount), is_active: true,
      }])
      return { error: null }
    }
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: family.id, created_by: profile?.id, ...rec,
      amount: parseFloat(rec.amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editRecurring = async (id, changes) => {
    if (isDemoMode) {
      setRecurring(prev => prev.map(r => r.id === id ? {
        ...r, ...changes,
        amount: changes.amount ? parseFloat(changes.amount) : r.amount,
      } : r))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_recurring', {
      p_rec_id: id,
      p_name: changes.name || null,
      p_amount: changes.amount ? parseFloat(changes.amount) : null,
      p_frequency: changes.frequency || null,
      p_category: changes.category || null,
      p_account_id: changes.account_id || null,
      p_linked_debt_id: changes.linked_debt_id || null,
      p_next_due: changes.next_due || null,
      p_notes: changes.notes || null,
      p_is_active: changes.is_active ?? null,
      p_clear_debt: changes.clear_debt || false,
    })
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
      // Avanzar next_due
      const nx = new Date(rec.next_due)
      if (rec.frequency === 'monthly') nx.setMonth(nx.getMonth() + 1)
      else if (rec.frequency === 'yearly') nx.setMonth(nx.getMonth() + 12)
      else if (rec.frequency === 'biweekly') nx.setDate(nx.getDate() + 14)
      else nx.setDate(nx.getDate() + 7)

      setRecurring(prev => prev.map(r =>
        r.id === id ? { ...r, next_due: nx.toISOString().slice(0, 10) } : r
      ))

      // Auto-transacción: gasto en la cuenta del recurrente (puede ser débito o crédito)
      const already = txns.some(tx =>
        tx.source_id === id && tx.auto_source === 'recurring' && tx.date === date
      )
      if (!already) {
        setTxns(prev => [{
          id: 'auto-r-' + Date.now(),
          type: 'expense',
          category: rec.category,
          description: rec.name,
          amount: rec.amount,
          date,
          account_id: rec.account_id || null,  // puede ser débito o crédito
          auto_source: 'recurring',
          source_id: id,
          is_void: false,
          created_by: profile?.id,
        }, ...prev])
      }

      // Si tiene deuda vinculada, también abonar a ella
      if (rec.linked_debt_id) {
        await payDebt(rec.linked_debt_id, rec.amount, date)
      }

      return { error: null }
    }

    const { error } = await supabase.rpc('rpc_mark_recurring_paid',
      { p_rec_id: id, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Metas ──────────────────────────────────────────────────────────────

  const addGoal = async (goal) => {
    if (isDemoMode) {
      setGoals(prev => [...prev, { ...goal, id: 'g-' + Date.now(), current_amount: 0, status: 'active' }])
      return { error: null }
    }
    const { data, error } = await supabase.from('savings_goals').insert({
      family_id: family.id, owner_profile: profile?.id, ...goal,
      target_amount: parseFloat(goal.target_amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editGoal = async (id, changes) => {
    if (isDemoMode) {
      setGoals(prev => prev.map(g => g.id === id ? {
        ...g, ...changes,
        target_amount: changes.target_amount ? parseFloat(changes.target_amount) : g.target_amount,
      } : g))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_savings_goal', {
      p_goal_id: id,
      p_name: changes.name || null,
      p_target_amount: changes.target_amount ? parseFloat(changes.target_amount) : null,
      p_emoji: changes.emoji || null,
      p_color: changes.color || null,
      p_deadline: changes.deadline || null,
      p_status: changes.status || null,
      p_notes: changes.notes || null,
    })
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
      setGoals(prev => prev.map(g => g.id === id ? {
        ...g, current_amount: newAmt,
        status: newAmt >= g.target_amount ? 'completed' : g.status,
      } : g))
      // Auto-transacción tipo 'saving' en cuenta de activo
      setTxns(prev => [{
        id: 'auto-s-' + Date.now(),
        type: 'saving', category: 'goal',
        description: 'Ahorro: ' + goal.name,
        amount, date,
        account_id: goal.account_id || null,
        auto_source: 'savings_deposit', source_id: id,
        is_void: false, created_by: profile?.id,
      }, ...prev])
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_deposit_savings_goal', {
      p_goal_id: id, p_amount: amount, p_date: date,
      p_account_id: goal.account_id || null,
    })
    if (!error) await loadData()
    return { error }
  }

  const addKidGoal = async (goal) => {
    if (isDemoMode) {
      setKidsGoals(prev => [...prev, { ...goal, id: 'kg-' + Date.now(), current_amount: 0, status: 'active' }])
      return { error: null }
    }
    const { data, error } = await supabase.from('kids_goals').insert({
      family_id: family.id, ...goal, target_amount: parseFloat(goal.target_amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const depositKidGoal = async (id, amount) => {
    if (isDemoMode) {
      setKidsGoals(prev => prev.map(g => {
        if (g.id !== id) return g
        const n = Math.min(g.target_amount, g.current_amount + amount)
        return { ...g, current_amount: n, status: n >= g.target_amount ? 'completed' : g.status }
      }))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_kids_deposit',
      { p_goal_id: id, p_amount: amount })
    if (!error) await loadData()
    return { error }
  }

  // ── Miembros ───────────────────────────────────────────────────────────

  const setMemberStatus = async (memberId, status) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_status',
      { p_member_id: memberId, p_status: status })
    if (!error) await loadData()
    return { error }
  }

  const setMemberRole = async (memberId, role) => {
    if (profile?.role !== 'owner') return { error: new Error('Solo el propietario') }
    if (isDemoMode) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_set_member_role',
      { p_member_id: memberId, p_role: role })
    if (!error) await loadData()
    return { error }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)
  const openModal = (name) => setModal(name)
  const closeModal = () => setModal(null)

  // ── Contexto expuesto ──────────────────────────────────────────────────
  const ctx = {
    // Auth / Onboarding
    session, profile, family, members, authLoading, isDemoMode,
    onboardingState, signOut, updateProfile, createFamily, joinFamily, reloadProfile,

    // Datos financieros
    accounts,
    assetAccounts,   // v4: cuentas de activo (antes: bankAccounts)
    creditAccounts,  // v4: cuentas de crédito (antes: cards)
    debts, recurring, txns, goals, kidsGoals,
    summary, netWorth, dataLoading, filteredTxns,

    // UI
    t, lang, setLang, tab, setTab,
    isKid, isOwner, isFamilyAdmin, kids, pendingMembers,
    filterType, setFilterType,
    pMode, setPMode, selMonth, setSelMonth,
    rFrom, setRFrom, rTo, setRTo,
    af, applyFilter,
    selAcc, setSelAcc,  // v4: un solo filtro de cuenta (sin selPm)
    modal, openModal, closeModal,

    // Mutaciones
    addTxn, editTxn, deleteTxn,
    addAccount, editAccount, deleteAccount,
    addDebt, editDebt, deleteDebt, payDebt,
    addRecurring, editRecurring, deleteRecurring, markRecPaid,
    addGoal, editGoal, deleteGoal, depositGoal,
    addKidGoal, depositKidGoal,
    setMemberStatus, setMemberRole,
    getAccount, getMember,
    reload: loadData,

    // Setters directos (para edición inline en demo)
    setAccounts, setDebts, setRecurring, setTxns, setGoals, setKidsGoals, setMembers,
  }

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}