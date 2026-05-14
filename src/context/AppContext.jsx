// src/context/AppContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Estado global de la aplicación.
//
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext, useContext, useState,
  useEffect, useCallback, useMemo,
} from 'react'
import { supabase } from '../lib/supabase'
import T from '../lib/translations'
import { CREDIT_SUBTYPES, ASSET_SUBTYPES, thisMo, toDay } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'

// ── Contexto ────────────────────────────────────────────────────────────────
const AppCtx = createContext({})
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
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
  const [accounts, setAccounts] = useState([])
  const [debts, setDebts] = useState([])
  const [recurring, setRecurring] = useState([])
  const [txns, setTxns] = useState([])
  const [goals, setGoals] = useState([])
  const [kidsGoals, setKidsGoals] = useState([])
  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState(null)
  const [netWorth, setNetWorth] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  // ── UI ─────────────────────────────────────────────────────────────────
  const [lang, setLangState] = useState('es')
  const [tab, setTab] = useState('dashboard')
  const [filterType, setFilterType] = useState('all')
  const [pMode, setPMode] = useState('month')
  const [selMonth, setSelMonth] = useState(thisMo())
  const [rFrom, setRFrom] = useState(toDay() - 30)
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

  const creditAccounts = useMemo(() =>
    accounts.filter(a => CREDIT_SUBTYPES.includes(a.subtype))
    , [accounts])

  const assetAccounts = useMemo(() =>
    accounts.filter(a => ASSET_SUBTYPES.includes(a.subtype))
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
    console.log('[MiFinanza] Loading data for family:', family?.id, 'and user:', profile?.id)
    if (!family?.id) return
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

      const safe = r =>
        r.status === 'fulfilled' && !r.value.error
          ? (r.value.data ?? [])
          : []

      const [accs, txnsD, debtsD, recD, goalsD, kgD, membsD] = results.map(safe)

      if (accs) setAccounts(accs)
      if (txnsD) setTxns(txnsD)
      if (debtsD) setDebts(debtsD)
      if (recD) setRecurring(recD)
      if (goalsD) setGoals(goalsD)
      if (kgD) setKidsGoals(kgD)
      if (membsD) setMembers(membsD)

      const { data: sumData, error: sumErr } = await supabase.rpc('rpc_dashboard_summary', {
        p_from: af.from, p_to: af.to, p_account_id: selAcc || null,
      })

      if (sumErr) console.error("rpc_dashboard_summary error:", sumErr)
      if (sumData) setSummary(sumData)

      const { data: nwData, error: nwErr } = await supabase.rpc('rpc_net_worth')
      if (nwErr) console.error("rpc_net_worth error:", nwErr)
      if (nwData) setNetWorth(nwData)

    } catch (err) {
      console.error('[MiFinanza] loadData:', err)
    } finally {
      setDataLoading(false)
    }
  }, [family?.id, af, selAcc])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && family?.id && onboardingState === 'ready') {
        loadData()
      }
    })
  }, [family?.id, onboardingState])

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
    const result = await auth.createFamily(name, currency)
    return result
  }

  const joinFamily = async (inviteCode) => {
    const result = await auth.joinFamily(inviteCode)
    return result
  }

  const updateProfile = async (changes) => {
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
    const { data, error } = await supabase.rpc('rpc_add_transaction', {
      p_type: tx.type, p_category: tx.category, p_description: tx.description,
      p_amount: parseFloat(tx.amount), p_date: tx.date,
      p_account_id: tx.account_id || null, p_notes: tx.notes || null,
      p_auto_source: tx.auto_source || null, p_source_id: tx.source_id || null,
    })
    if (!error) await loadData()
    return { data, error }
  }

  const editTxn = async (id, changes) => {
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
    if (tx?.auto_source) await supabase.from('transactions').update({ is_void: true }).eq('id', id)
    else await supabase.from('transactions').delete().eq('id', id)
    await loadData()
  }

  // ── Cuentas ────────────────────────────────────────────────────────────
  const addAccount = async (acc) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el admin puede crear cuentas') }
    const { data, error } = await supabase.rpc('rpc_add_account', {
      p_name: acc.name, p_subtype: acc.subtype,
      p_owner_profile: acc.owner_profile || null, p_color: acc.color || '#4f7cff',
      p_institution: acc.institution || null, p_last_four: acc.last_four || null,
      p_credit_limit: acc.credit_limit ? parseFloat(acc.credit_limit) : null,
      p_opening_balance: acc.opening_balance ? parseFloat(acc.opening_balance) : 0,
      p_notes: acc.notes || null,
    })
    console.log('[MiFinanza] addAccount result:', { data, error })
    if (!error) await loadData()
    return { data, error }
  }

  const editAccount = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
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
    console.log('[MiFinanza] Adding debt:', debt)
    const { data, error } = await supabase.from('debts').insert({
      family_id: family.id, created_by: profile?.id, linked_account_id: debt.linked_account_id || null,
      name: debt.name, category: debt.category, notes: debt.notes || null,
      total_amount: parseFloat(debt.total_amount), paid_amount: parseFloat(debt.paid_amount || 0),
      monthly_payment: debt.monthly_payment ? parseFloat(debt.monthly_payment) : null,
      interest_rate: parseFloat(debt.interest_rate || 0),
    }).select().single()
    if (!error) await loadData()
    console.log('[MiFinanza] addDebt result:', { data, error })
    return { data, error }
  }

  const editDebt = async (id, changes) => {
    const { error } = await supabase.rpc('rpc_update_debt', { p_debt_id: id, ...changes })
    if (!error) await loadData()
    return { error }
  }

  const deleteDebt = async (id) => {
    await supabase.from('debts').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const payDebt = async (debtId, amount, date = toDay()) => {
    const debt = debts.find(d => d.id === debtId)
    if (!debt) return { error: new Error('Deuda no encontrada') }
    const newPaid = Math.min(debt.total_amount, debt.paid_amount + amount)
    const { error } = await supabase.rpc('rpc_pay_debt', { p_debt_id: debtId, p_amount: amount, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Recurrentes ────────────────────────────────────────────────────────
  const addRecurring = async (rec) => {
    console.log('[MiFinanza] Adding recurring payment:', rec)
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: family.id, created_by: profile?.id, ...rec, amount: parseFloat(rec.amount),
    }).select().single()
    console.log('[MiFinanza] addRecurring result:', { data, error })
    if (!error) await loadData()
    return { data, error }
  }

  const editRecurring = async (id, changes) => {
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
    await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const markRecPaid = async (id, date = toDay()) => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return { error: new Error('No encontrado') }
    const { error } = await supabase.rpc('rpc_mark_recurring_paid', { p_rec_id: id, p_date: date })
    if (!error) await loadData()
    return { error }
  }

  // ── Metas ──────────────────────────────────────────────────────────────
  const addGoal = async (goal) => {
    const { data, error } = await supabase.from('savings_goals').insert({ family_id: family.id, owner_profile: profile?.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const editGoal = async (id, changes) => {
    const { error } = await supabase.rpc('rpc_update_savings_goal', { p_goal_id: id, p_name: changes.name || null, p_target_amount: changes.target_amount ? parseFloat(changes.target_amount) : null, p_emoji: changes.emoji || null, p_color: changes.color || null, p_deadline: changes.deadline || null, p_status: changes.status || null, p_notes: changes.notes || null })
    if (!error) await loadData(); return { error }
  }
  const deleteGoal = async (id) => {
    await supabase.from('savings_goals').delete().eq('id', id); await loadData()
  }
  const depositGoal = async (id, amount, date = toDay()) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: new Error('Meta no encontrada') }
    const newAmt = Math.min(goal.target_amount, goal.current_amount + amount)
    const { error } = await supabase.rpc('rpc_deposit_savings_goal', { p_goal_id: id, p_amount: amount, p_date: date, p_account_id: goal.account_id || null })
    if (!error) await loadData(); return { error }
  }
  const addKidGoal = async (goal) => {
    const { data, error } = await supabase.from('kids_goals').insert({ family_id: family.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const depositKidGoal = async (id, amount) => {
    const { error } = await supabase.rpc('rpc_kids_deposit', { p_goal_id: id, p_amount: amount })
    if (!error) await loadData(); return { error }
  }

  // ── Miembros ───────────────────────────────────────────────────────────
  const setMemberStatus = async (memberId, status) => {
    if (!isFamilyAdmin) return { error: new Error('Sin permiso') }
    const { error } = await supabase.rpc('rpc_set_member_status', { p_member_id: memberId, p_status: status })
    if (!error) await loadData(); return { error }
  }
  const setMemberRole = async (memberId, role) => {
    if (profile?.role !== 'owner') return { error: new Error('Solo el propietario') }
    const { error } = await supabase.rpc('rpc_set_member_role', { p_member_id: memberId, p_role: role })
    if (!error) await loadData(); return { error }
  }

  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)
  const openModal = (name) => setModal(name)
  const closeModal = () => setModal(null)

  const ctx = {
    session, profile, family, members, accounts,
    onboardingState, signOut, updateProfile, createFamily, joinFamily, reloadProfile,
    assetAccounts, creditAccounts, debts, recurring, txns,
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
    setDebts, setRecurring, setTxns, setGoals, setKidsGoals, setMembers,
  }

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}