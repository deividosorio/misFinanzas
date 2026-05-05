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
// BUGS CORREGIDOS:
//
// BUG 1 — Race condition en auth (CAUSA PRINCIPAL DE PANTALLA EN BLANCO)
//   PROBLEMA: getSession() y onAuthStateChange(SIGNED_IN) se ejecutaban
//   en paralelo. Ambos llamaban resolveProfile() al mismo tiempo.
//   El segundo llamado sobreescribía estados mientras el primero aún corría,
//   dejando onboardingState en un valor inconsistente ('loading' final).
//   SOLUCIÓN: flag `resolvingRef` — solo un resolveProfile() corre a la vez.
//   onAuthStateChange ignora SIGNED_IN si getSession() ya está procesando.
//
// BUG 2 — onAuthStateChange INITIAL_SESSION
//   Supabase dispara 'INITIAL_SESSION' al montar el listener, antes de que
//   getSession() resuelva. Este evento traía session=null aunque hubiera
//   sesión activa, seteando onboardingState='unauthenticated' prematuramente.
//   SOLUCIÓN: Ignorar el evento 'INITIAL_SESSION'.
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react'
import { supabase } from '../lib/supabase'
import T from '../lib/translations'
import { CREDIT_SUBTYPES, thisMo, toDay } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'

// ── Datos demo ─────────────────────────────────────────────────────────────
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
const DEMO_ACCOUNTS = [
  { id: 'acc-1', name: 'TD Savings', subtype: 'savings', color: '#4f7cff', owner_name: 'Deivid', owner_profile: 'demo-1', institution: 'TD Bank', is_active: true, opening_balance: 10000, balance: 14200, total_income: 32400, total_expense: 18200 },
  { id: 'acc-2', name: 'RBC Savings', subtype: 'savings', color: '#e879f9', owner_name: 'Andrea', owner_profile: 'demo-2', institution: 'RBC', is_active: true, opening_balance: 5000, balance: 8750, total_income: 21000, total_expense: 12250 },
  { id: 'acc-3', name: 'TD Chequing', subtype: 'checking', color: '#2dd4a0', owner_name: 'Familia', owner_profile: 'demo-1', institution: 'TD Bank', is_active: true, opening_balance: 2000, balance: 3820, total_income: 9000, total_expense: 5180 },
  { id: 'acc-4', name: 'TD Visa', subtype: 'credit_card', color: '#ff6b6b', owner_name: 'Deivid', owner_profile: 'demo-1', institution: 'TD Bank', is_active: true, last_four: '4521', credit_limit: 8000, month_debt: 2340, available: 5660, opening_balance: 0 },
  { id: 'acc-5', name: 'RBC MC', subtype: 'credit_card', color: '#fbbf24', owner_name: 'Andrea', owner_profile: 'demo-2', institution: 'RBC', is_active: true, last_four: '8833', credit_limit: 5000, month_debt: 890, available: 4110, opening_balance: 0 },
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
  { id: 't-1', type: 'income', category: 'salary', description: 'Salario Mayo — Deivid', amount: 5200, date: '2025-05-01', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-2', type: 'income', category: 'salary', description: 'Salario Mayo — Andrea', amount: 4200, date: '2025-05-01', account_id: 'acc-2', auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-7', type: 'income', category: 'freelance', description: 'Proyecto web', amount: 1200, date: '2025-05-10', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-10', type: 'income', category: 'salary', description: 'Salario Abril — Deivid', amount: 5200, date: '2025-04-01', account_id: 'acc-1', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-3', type: 'expense', category: 'food', description: 'IGA Supermercado', amount: 320, date: '2025-05-03', account_id: 'acc-4', auto_source: null, created_by: 'demo-2', is_void: false },
  { id: 't-8', type: 'expense', category: 'food', description: 'Costco', amount: 380, date: '2025-04-20', account_id: 'acc-4', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-5', type: 'expense', category: 'transport', description: 'Gasolina Shell', amount: 95, date: '2025-05-07', account_id: 'acc-3', auto_source: null, created_by: 'demo-1', is_void: false },
  { id: 't-4', type: 'expense', category: 'utilities', description: 'Hydro-Québec', amount: 110, date: '2025-05-05', account_id: 'acc-4', auto_source: 'recurring', source_id: 'r-3', created_by: 'demo-1', is_void: false },
  { id: 't-9', type: 'expense', category: 'mortgage', description: 'Pago: Hipoteca TD', amount: 1850, date: '2025-05-01', account_id: 'acc-3', auto_source: 'debt_payment', source_id: 'd-1', created_by: 'demo-1', is_void: false },
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
    { category: 'mortgage', value: 1850 }, { category: 'food', value: 1240 },
    { category: 'housing', value: 800 }, { category: 'car', value: 520 },
    { category: 'utilities', value: 310 }, { category: 'entertainment', value: 290 },
    { category: 'transport', value: 280 }, { category: 'insurance', value: 180 },
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
const DEMO_NET_WORTH = { assets: 26770, credit_debt: 3230, long_debt: 282000, liabilities: 285230, net: -258460 }

// ── Contexto ────────────────────────────────────────────────────────────────
const AppCtx = createContext({})
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const isDemoMode = !supabase

  // ── HOOK DE AUTENTICACIÓN ──────────────────────────────────────────────
  // Encapsula: getSession, onAuthStateChange, race condition prevention,
  // profile creation, family loading, onboarding state transitions
  const auth = useAuth()

  // ── Variables derivadas (compatibilidad con código existente) ───────────
  const session = auth.user ? { user: auth.user } : null
  const profile = auth.profile
  const family = auth.family
  const onboardingState = auth.onboardingState

  // ── Delegamos funciones de auth al hook ─────────────────────────────────
  const reloadProfile = auth.reloadProfile

  // ── Datos ──────────────────────────────────────────────────────────────
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

  // ── UI ─────────────────────────────────────────────────────────────────
  const [lang, setLangState] = useState('es')
  const [tab, setTab] = useState('dashboard')
  const [filterType, setFilterType] = useState('all')
  const [pMode, setPMode] = useState('month')
  const [selMonth, setSelMonth] = useState(thisMo())
  const [rFrom, setRFrom] = useState('2025-01-01')
  const [rTo, setRTo] = useState(toDay())
  const [af, setAf] = useState({ from: thisMo() + '-01', to: toDay() })
  const [selAcc, setSelAcc] = useState(null)
  const [modal, setModal] = useState(null)

  const setLang = (l) => {
    setLangState(l)
    // Profile is now immutable from hook, can't update lang here
    // Language persists via Supabase RPC call below
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

  const assetAccounts = useMemo(() =>
    accounts.filter(a => !CREDIT_SUBTYPES.includes(a.subtype))
    , [accounts])

  const creditAccounts = useMemo(() =>
    accounts.filter(a => CREDIT_SUBTYPES.includes(a.subtype))
    , [accounts])

  const filteredTxns = useMemo(() =>
    txns.filter(tx => {
      if (tx.is_void) return false
      const inPeriod = tx.date >= af.from && tx.date <= af.to
      const inAcc = !selAcc || tx.account_id === selAcc
      return inPeriod && inAcc
    })
    , [txns, af, selAcc])

  // Auth is now handled by useAuth hook — no local effect needed

  // Auth functions delegated to useAuth hook (see above)

  // ── loadData ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (isDemoMode || !family?.id) return
    setDataLoading(true)
    const fid = family.id
    try {
      const results = await Promise.allSettled([
        supabase.from('account_balances').select('*').eq('family_id', fid),
        supabase.from('transactions').select('*').eq('family_id', fid).eq('is_void', false).order('date', { ascending: false }).limit(500),
        supabase.from('debts').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('recurring_with_details').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('savings_goals').select('*').eq('family_id', fid),
        supabase.from('kids_goals').select('*').eq('family_id', fid),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ])
      const [accs, txnsD, debtsD, recD, goalsD, kgD, membsD] =
        results.map(r => r.status === 'fulfilled' ? r.value.data : null)
      if (accs) setAccounts(accs)
      if (txnsD) setTxns(txnsD)
      if (debtsD) setDebts(debtsD)
      if (recD) setRecurring(recD)
      if (goalsD) setGoals(goalsD)
      if (kgD) setKidsGoals(kgD)
      if (membsD) setMembers(membsD)

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

  // ── Auth mutations ─────────────────────────────────────────────────────
  const signOut = async () => {
    // Delegate to useAuth hook
    await auth.logout()
    // Clear app data
    setMembers([]); setAccounts([]); setTxns([])
    setDebts([]); setRecurring([]); setGoals([]); setKidsGoals([])
  }

  const createFamily = async (name, currency = 'CAD') => {
    if (!supabase) return { error: new Error('Modo demo') }
    const result = await auth.createFamily(name, currency)
    return result
  }

  const joinFamily = async (inviteCode) => {
    if (!supabase) return { error: new Error('Modo demo') }
    const result = await auth.joinFamily(inviteCode)
    return result
  }

  const updateProfile = async (changes) => {
    if (isDemoMode) {
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
    if (!error && changes.lang) setLangState(changes.lang)
    // Profile updates will be reflected by useAuth hook's reloadProfile
    if (!error) await reloadProfile()
    return { error }
  }

  // ── Transacciones ──────────────────────────────────────────────────────
  const addTxn = async (tx) => {
    if (isDemoMode) {
      setTxns(prev => [{ ...tx, id: 't-' + Date.now(), auto_source: null, is_void: false, created_by: profile?.id }, ...prev])
      return { error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_transaction', {
      p_type: tx.type, p_category: tx.category, p_description: tx.description,
      p_amount: parseFloat(tx.amount), p_date: tx.date,
      p_account_id: tx.account_id || null, p_notes: tx.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  const editTxn = async (id, changes) => {
    if (isDemoMode) {
      setTxns(prev => prev.map(tx => tx.id === id ? { ...tx, ...changes, amount: parseFloat(changes.amount || tx.amount) } : tx))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_transaction', {
      p_txn_id: id,
      p_type: changes.type || null, p_category: changes.category || null,
      p_description: changes.description || null,
      p_amount: changes.amount ? parseFloat(changes.amount) : null,
      p_date: changes.date || null, p_account_id: changes.account_id || null,
      p_notes: changes.notes || null,
    })
    if (!error) await loadData()
    return { error }
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

  // ── Cuentas ────────────────────────────────────────────────────────────
  const addAccount = async (acc) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el admin puede crear cuentas') }
    if (isDemoMode) {
      const isCredit = CREDIT_SUBTYPES.includes(acc.subtype)
      setAccounts(prev => [...prev, {
        ...acc, id: 'acc-' + Date.now(), is_active: true,
        opening_balance: isCredit ? 0 : parseFloat(acc.opening_balance || 0),
        ...(isCredit
          ? { credit_limit: parseFloat(acc.credit_limit), month_debt: 0, available: parseFloat(acc.credit_limit) }
          : { balance: parseFloat(acc.opening_balance || 0), total_income: 0, total_expense: 0 }
        ),
      }])
      return { error: null }
    }
    const { data, error } = await supabase.rpc('rpc_add_account', {
      p_name: acc.name, p_subtype: acc.subtype,
      p_owner_profile: acc.owner_profile || null, p_color: acc.color || '#4f7cff',
      p_institution: acc.institution || null, p_last_four: acc.last_four || null,
      p_credit_limit: acc.credit_limit ? parseFloat(acc.credit_limit) : null,
      p_opening_balance: acc.opening_balance ? parseFloat(acc.opening_balance) : 0,
      p_notes: acc.notes || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  const editAccount = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) { setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_account', {
      p_account_id: id, p_name: changes.name || null, p_color: changes.color || null,
      p_institution: changes.institution || null,
      p_credit_limit: changes.credit_limit ? parseFloat(changes.credit_limit) : null,
      p_notes: changes.notes || null, p_is_active: changes.is_active ?? null,
    })
    if (!error) await loadData()
    return { error }
  }

  // ── Deudas ─────────────────────────────────────────────────────────────
  const addDebt = async (debt) => {
    if (isDemoMode) {
      setDebts(prev => [...prev, {
        ...debt, id: 'd-' + Date.now(),
        paid_amount: parseFloat(debt.paid_amount || 0), total_amount: parseFloat(debt.total_amount),
        monthly_payment: parseFloat(debt.monthly_payment || 0), interest_rate: parseFloat(debt.interest_rate || 0),
        is_active: true
      }])
      return { error: null }
    }
    const { data, error } = await supabase.from('debts').insert({
      family_id: family.id, created_by: profile?.id, ...debt,
      total_amount: parseFloat(debt.total_amount), paid_amount: parseFloat(debt.paid_amount || 0),
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

  const payDebt = async (debtId, amount, date = toDay()) => {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return { error: new Error('Deuda no encontrada') }
    const newPaid = Math.min(debt.total_amount, debt.paid_amount + amount)
    if (isDemoMode) {
      setDebts(prev => prev.map(d => d.id === debtId ? { ...d, paid_amount: newPaid, is_active: newPaid < d.total_amount } : d))
      const already = txns.some(tx => tx.source_id === debtId && tx.auto_source === 'debt_payment' && tx.date === date && tx.amount === amount)
      if (!already) setTxns(prev => [{
        id: 'auto-d-' + Date.now(), type: 'expense', category: debt.category || 'mortgage',
        description: 'Pago: ' + debt.name, amount, date,
        account_id: debt.linked_account_id || null,
        auto_source: 'debt_payment', source_id: debtId, is_void: false, created_by: profile?.id,
      }, ...prev])
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_pay_debt', { p_debt_id: debtId, p_amount: amount, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Recurrentes ────────────────────────────────────────────────────────
  const addRecurring = async (rec) => {
    if (isDemoMode) {
      setRecurring(prev => [...prev, { ...rec, id: 'r-' + Date.now(), amount: parseFloat(rec.amount), is_active: true }])
      return { error: null }
    }
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: family.id, created_by: profile?.id, ...rec, amount: parseFloat(rec.amount),
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editRecurring = async (id, changes) => {
    if (isDemoMode) {
      setRecurring(prev => prev.map(r => r.id === id ? {
        ...r, ...changes,
        amount: changes.amount ? parseFloat(changes.amount) : r.amount
      } : r))
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_update_recurring', {
      p_rec_id: id, p_name: changes.name || null,
      p_amount: changes.amount ? parseFloat(changes.amount) : null,
      p_frequency: changes.frequency || null, p_category: changes.category || null,
      p_account_id: changes.account_id || null, p_linked_debt_id: changes.linked_debt_id || null,
      p_next_due: changes.next_due || null, p_notes: changes.notes || null,
      p_is_active: changes.is_active ?? null, p_clear_debt: changes.clear_debt || false,
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
      const nx = new Date(rec.next_due)
      if (rec.frequency === 'monthly') nx.setMonth(nx.getMonth() + 1)
      else if (rec.frequency === 'yearly') nx.setMonth(nx.getMonth() + 12)
      else if (rec.frequency === 'biweekly') nx.setDate(nx.getDate() + 14)
      else nx.setDate(nx.getDate() + 7)
      setRecurring(prev => prev.map(r => r.id === id ? { ...r, next_due: nx.toISOString().slice(0, 10) } : r))
      const already = txns.some(tx => tx.source_id === id && tx.auto_source === 'recurring' && tx.date === date)
      if (!already) setTxns(prev => [{
        id: 'auto-r-' + Date.now(), type: 'expense', category: rec.category,
        description: rec.name, amount: rec.amount, date,
        account_id: rec.account_id || null,
        auto_source: 'recurring', source_id: id, is_void: false, created_by: profile?.id,
      }, ...prev])
      if (rec.linked_debt_id) await payDebt(rec.linked_debt_id, rec.amount, date)
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_mark_recurring_paid', { p_rec_id: id, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Metas ──────────────────────────────────────────────────────────────
  const addGoal = async (goal) => {
    if (isDemoMode) { setGoals(prev => [...prev, { ...goal, id: 'g-' + Date.now(), current_amount: 0, status: 'active' }]); return { error: null } }
    const { data, error } = await supabase.from('savings_goals').insert({ family_id: family.id, owner_profile: profile?.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const editGoal = async (id, changes) => {
    if (isDemoMode) { setGoals(prev => prev.map(g => g.id === id ? { ...g, ...changes, target_amount: changes.target_amount ? parseFloat(changes.target_amount) : g.target_amount } : g)); return { error: null } }
    const { error } = await supabase.rpc('rpc_update_savings_goal', { p_goal_id: id, p_name: changes.name || null, p_target_amount: changes.target_amount ? parseFloat(changes.target_amount) : null, p_emoji: changes.emoji || null, p_color: changes.color || null, p_deadline: changes.deadline || null, p_status: changes.status || null, p_notes: changes.notes || null })
    if (!error) await loadData(); return { error }
  }
  const deleteGoal = async (id) => {
    if (isDemoMode) { setGoals(prev => prev.filter(g => g.id !== id)); return }
    await supabase.from('savings_goals').delete().eq('id', id); await loadData()
  }
  const depositGoal = async (id, amount, date = toDay()) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: new Error('Meta no encontrada') }
    const newAmt = Math.min(goal.target_amount, goal.current_amount + amount)
    if (isDemoMode) {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: newAmt, status: newAmt >= g.target_amount ? 'completed' : g.status } : g))
      setTxns(prev => [{ id: 'auto-s-' + Date.now(), type: 'saving', category: 'goal', description: 'Ahorro: ' + goal.name, amount, date, account_id: goal.account_id || null, auto_source: 'savings_deposit', source_id: id, is_void: false, created_by: profile?.id }, ...prev])
      return { error: null }
    }
    const { error } = await supabase.rpc('rpc_deposit_savings_goal', { p_goal_id: id, p_amount: amount, p_date: date, p_account_id: goal.account_id || null })
    if (!error) await loadData(); return { error }
  }
  const addKidGoal = async (goal) => {
    if (isDemoMode) { setKidsGoals(prev => [...prev, { ...goal, id: 'kg-' + Date.now(), current_amount: 0, status: 'active' }]); return { error: null } }
    const { data, error } = await supabase.from('kids_goals').insert({ family_id: family.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const depositKidGoal = async (id, amount) => {
    if (isDemoMode) { setKidsGoals(prev => prev.map(g => { if (g.id !== id) return g; const n = Math.min(g.target_amount, g.current_amount + amount); return { ...g, current_amount: n, status: n >= g.target_amount ? 'completed' : g.status } })); return { error: null } }
    const { error } = await supabase.rpc('rpc_kids_deposit', { p_goal_id: id, p_amount: amount })
    if (!error) await loadData(); return { error }
  }

  // ── Miembros ───────────────────────────────────────────────────────────
  const setMemberStatus = async (memberId, status) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    if (isDemoMode) { setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status } : m)); return { error: null } }
    const { error } = await supabase.rpc('rpc_set_member_status', { p_member_id: memberId, p_status: status })
    if (!error) await loadData(); return { error }
  }
  const setMemberRole = async (memberId, role) => {
    if (profile?.role !== 'owner') return { error: new Error('Solo el propietario') }
    if (isDemoMode) { setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m)); return { error: null } }
    const { error } = await supabase.rpc('rpc_set_member_role', { p_member_id: memberId, p_role: role })
    if (!error) await loadData(); return { error }
  }

  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)
  const openModal = (name) => setModal(name)
  const closeModal = () => setModal(null)

  const ctx = {
    session, profile, family, members, isDemoMode,
    onboardingState, signOut, updateProfile, createFamily, joinFamily, reloadProfile,
    accounts, assetAccounts, creditAccounts, debts, recurring, txns,
    goals, kidsGoals, summary, netWorth, dataLoading, filteredTxns,
    t, lang, setLang, tab, setTab,
    isKid, isOwner, isFamilyAdmin, kids, pendingMembers,
    filterType, setFilterType,
    pMode, setPMode, selMonth, setSelMonth, rFrom, setRFrom, rTo, setRTo,
    af, applyFilter, selAcc, setSelAcc,
    modal, openModal, closeModal,
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