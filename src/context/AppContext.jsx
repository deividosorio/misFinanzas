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
  const [kidsDeposits, setKidsDeposits] = useState([])
  const [customCategories, setCustomCategories] = useState([])
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
  const customCategoryLabels = useMemo(() => {
    return customCategories.reduce((acc, cat) => {
      const label = cat[`label_${lang}`] || cat.label_es || cat.label_en || cat.label_fr || cat.key
      if (label) acc[cat.key] = label
      return acc
    }, {})
  }, [customCategories, lang])

  const categoryColorMap = useMemo(() => {
    return customCategories.reduce((acc, cat) => {
      if (cat.color) acc[cat.key] = cat.color
      return acc
    }, {})
  }, [customCategories])


  const categoriesByType = useMemo(() => {
    const groups = { income: [], expense: [], saving: [] }
    customCategories.forEach(cat => {
      if (groups[cat.type]) groups[cat.type].push(cat.key)
    })
    return groups
  }, [customCategories])

  const categoriesById = useMemo(
    () => new Map(customCategories.map(cat => [cat.id, cat])),
    [customCategories]
  )

  const t = useMemo(() => ({...T[lang]}), [lang])
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

  const getCategoryLabel = (categoryId, categoryKey) => {
    const cat = categoriesById.get(categoryId)
    if (cat) {
      return cat[`label_${lang}`] || cat.label_es || cat.label_en || cat.key
    }
    return categoryKey || 'Sin categoría'
  }


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
        supabase.from('transactions_with_category').select('*').eq('family_id', fid).eq('is_void', false).order('date', { ascending: false }).limit(500),
        supabase.from('debts').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('recurring_with_details').select('*').eq('family_id', fid).eq('is_active', true),
        supabase.from('savings_goals').select('*').eq('family_id', fid),
        supabase.from('kids_goals').select('*').eq('family_id', fid),
        supabase.from('kids_deposits').select('*').eq('family_id', fid),
        supabase.from('categories').select('*').eq('family_id', fid).order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ])

      console.log('[MiFinanza] Data load results:', results)
      const safe = r =>
        r.status === 'fulfilled' && !r.value.error
          ? (r.value.data ?? [])
          : []

      const [accs, txnsD, debtsD, recD, goalsD, kgD, kdD, categoriesD, membsD] = results.map(safe)

      if (accs) setAccounts(accs)
      // Map categories and attach category_id to transactions when possible
      if (categoriesD) setCustomCategories(categoriesD)
      if (membsD) setMembers(membsD)

      // Build lookup maps from loaded categories
      const keyToCat = {}
      const idToCat = new Map()
      if (categoriesD && categoriesD.length) {
        categoriesD.forEach(cat => {
          if (cat.key) keyToCat[cat.key] = cat
          if (cat.id) idToCat.set(cat.id, cat)
        })
      }

      if (txnsD) setTxns(txnsD)
      if (debtsD) setDebts(debtsD)
      if (recD) setRecurring(recD)
      if (goalsD) setGoals(goalsD)
      if (kgD) setKidsGoals(kgD)
      if (kdD) setKidsDeposits(kdD)

      const { data: sumData, error: sumErr } = await supabase.rpc('rpc_dashboard_summary', {
        p_from: af.from, p_to: af.to, p_account_id: selAcc || null,
      })

      if (sumErr) console.error("rpc_dashboard_summary error:", sumErr)
      if (sumData) setSummary(sumData)

      const { data: nwData, error: nwErr } = await supabase.rpc('rpc_net_worth_filtered', {
        p_from: af.from, p_to: af.to, p_account_id: selAcc || null,
      })
      if (nwErr) console.error("rpc_net_worth error:", nwErr)
      if (nwData) setNetWorth(nwData)

    } catch (err) {
      console.error('[MiFinanza] loadData:', err)
    } finally {
      setDataLoading(false)
    }
  }, [family?.id, af, selAcc])

  // Carga inicial y recarga al cambiar familia o estado de onboarding
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && family?.id && onboardingState === 'ready') {
        loadData()
      }
    })
  }, [family?.id, onboardingState])

  // Dependencias de filtro: recarga datos al cambiar periodo o cuenta seleccionada
  useEffect(() => {
    if (family?.id && onboardingState === 'ready') {
      loadData()
    }
  }, [af])

  useEffect(() => {
    if (family?.id && onboardingState === 'ready') {
      loadData()
    }
  }, [selAcc])



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
    setDebts([]); setRecurring([]); setGoals([]); setKidsGoals([]); setKidsDeposits([])
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
    if (!family?.id) return { error: new Error('Familia no definida') }

    // Siempre trabajamos con category_id
    let categoryId = tx.category_id || null

    // Si viene un category_key (legacy), resolverlo
    if (!categoryId && tx.category_key) {
      const found = customCategories.find(c => c.key === tx.category_key)
      if (found) categoryId = found.id
    }

    const payload = {
      family_id: family.id,
      created_by: profile?.id || null,
      category_id: categoryId,
      description: tx.description || null,
      amount: parseFloat(tx.amount),
      date: tx.date,
      account_id: tx.account_id || null,
      notes: tx.notes || null,
      auto_source: tx.auto_source || null,
      source_id: tx.source_id || null,
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()

    if (!error) await loadData()
    return { data, error }
  }


  const editTxn = async (id, changes) => {
    let categoryId = changes.category_id ?? null

    if (!categoryId && changes.category_key) {
      const found = customCategories.find(c => c.key === changes.category_key)
      if (found) categoryId = found.id
    }

    const update = {
      category_id: categoryId ?? undefined,
      description: changes.description ?? undefined,
      amount: changes.amount != null ? parseFloat(changes.amount) : undefined,
      date: changes.date ?? undefined,
      account_id: changes.account_id ?? undefined,
      notes: changes.notes ?? undefined,
    }

    const payload = Object.fromEntries(
      Object.entries(update).filter(([, v]) => v !== undefined)
    )

    const { error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)

    if (!error) await loadData()
    return { error }
  }


  const deleteTxn = async (id) => {
    const tx = txns.find(t => t.id === id)
    if (tx?.auto_source)
      await supabase.from('transactions').update({ is_void: true }).eq('id', id)
    else
      await supabase.from('transactions').delete().eq('id', id)

    await loadData()
  }

  // ── Payment card credit─────────────────────────────────────────────────
  const payCreditCard = async ({ from_account_id, credit_account_id, amount, date = toDay(), notes }) => {
    if (!family?.id) return { error: new Error('Familia no definida') }
    if (!from_account_id || !credit_account_id) return { error: new Error('Cuentas inválidas') }

    // Buscar categoría credit_card_payment
    const cat = customCategories.find(c => c.key === 'credit_card_payment')
    const categoryId = cat?.id || null

    const { data, error } = await supabase.rpc('rpc_pay_credit_card', {
      p_family_id: family.id,
      p_from_account_id: from_account_id,
      p_credit_account_id: credit_account_id,
      p_amount: parseFloat(amount),
      p_date: date,
      p_category_id: categoryId,     // ← OBLIGATORIO
      p_notes: notes || null,
    })

    if (!error) await loadData()
    return { data, error }
  }


  const transferToSaving = async ({ from_account_id, to_account_id, category, description, amount, date = toDay(), notes }) => {
    if (!family?.id) return { error: new Error('Familia no definida') }
    if (!from_account_id || !to_account_id) return { error: new Error('Cuentas inválidas') }
    if (from_account_id === to_account_id) return { error: new Error('La cuenta origen y destino no pueden coincidir') }

    // Resolver category_id desde category_key
    let categoryId = null
    if (category) {
      const found = customCategories.find(c => c.key === category)
      if (found) categoryId = found.id
    }

    const { data, error } = await supabase.rpc('rpc_transfer_to_saving', {
      p_from_account_id: from_account_id,
      p_to_account_id: to_account_id,
      p_amount: parseFloat(amount),
      p_category_id: categoryId,        // ← OBLIGATORIO
      p_description: description || null,
      p_date: date,
      p_notes: notes || null,
    })

    if (!error) await loadData()
    return { data, error }
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
      p_account_id: id,
      p_name: changes.name || null,
      p_subtype: changes.subtype || null,
      p_owner_profile: changes.owner_profile || null,
      p_color: changes.color || null,
      p_institution: changes.institution || null,
      p_last_four: changes.last_four || null,
      p_credit_limit: changes.credit_limit != null ? parseFloat(changes.credit_limit) : null,
      p_opening_balance: changes.opening_balance != null ? parseFloat(changes.opening_balance) : null,
      p_notes: changes.notes || null,
      p_is_active: changes.is_active ?? null,
    })

    console.log('[MiFinanza] editAccount result:', { error })
    if (!error) await loadData()
    return { error }
  }

  // ── Deudas ─────────────────────────────────────────────────────────────
  const addDebt = async (debt) => {
    console.log('[MiFinanza] Adding debt:', debt)

    // Resolver category_id desde category_key
    let categoryId = debt.category_id || null
    if (!categoryId && debt.category) {
      const found = customCategories.find(c => c.key === debt.category)
      if (found) categoryId = found.id
    }

    const { data, error } = await supabase.from('debts').insert({
      family_id: family.id,
      created_by: profile?.id,
      linked_account_id: debt.linked_account_id || null,
      name: debt.name,
      category_id: categoryId,                         // ← NUEVO
      notes: debt.notes || null,
      total_amount: parseFloat(debt.total_amount),
      paid_amount: parseFloat(debt.paid_amount || 0),
      monthly_payment: debt.monthly_payment ? parseFloat(debt.monthly_payment) : null,
      interest_rate: parseFloat(debt.interest_rate || 0),
    }).select().single()

    if (!error) await loadData()
    console.log('[MiFinanza] addDebt result:', { data, error })
    return { data, error }
  }


  const editDebt = async (id, changes) => {
    const {
      name,
      total_amount,
      monthly_payment,
      interest_rate,
      start_date,
      category,
      notes,
      linked_account_id,
      is_active,
    } = changes

    // Resolver category_id
    let categoryId = changes.category_id ?? null
    if (!categoryId && category) {
      const found = customCategories.find(c => c.key === category)
      if (found) categoryId = found.id
    }

    const { error } = await supabase.rpc('rpc_update_debt', {
      p_debt_id: id,
      p_name: name ?? null,
      p_total_amount: total_amount ?? null,
      p_monthly_payment: monthly_payment ?? null,
      p_interest_rate: interest_rate ?? null,
      p_start_date: start_date ?? null,
      p_category_id: categoryId ?? null,              // ← NUEVO
      p_notes: notes ?? null,
      p_is_active: is_active ?? null,
      p_linked_account_id: linked_account_id ?? null,
    })

    console.log('[MiFinanza] editDebt result:', { error })
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

    // Resolver category_id desde category_key
    let categoryId = rec.category_id || null
    if (!categoryId && rec.category) {
      const found = customCategories.find(c => c.key === rec.category)
      if (found) categoryId = found.id
    }

    const payload = {
      family_id: family.id,
      created_by: profile?.id,
      name: rec.name,
      amount: parseFloat(rec.amount),
      frequency: rec.frequency,
      category_id: categoryId,                 // ← NUEVO
      account_id: rec.account_id || null,
      linked_debt_id: rec.linked_debt_id || null,
      next_due: rec.next_due,
      notes: rec.notes || null,
    }

    const { data, error } = await supabase
      .from('recurring_payments')
      .insert(payload)
      .select()
      .single()

    console.log('[MiFinanza] addRecurring result:', { data, error })
    if (!error) await loadData()
    return { data, error }
  }


  const editRecurring = async (id, changes) => {
    // Resolver category_id
    let categoryId = changes.category_id ?? null
    if (!categoryId && changes.category) {
      const found = customCategories.find(c => c.key === changes.category)
      if (found) categoryId = found.id
    }

    const { error } = await supabase.rpc('rpc_update_recurring', {
      p_rec_id: id,
      p_name: changes.name || null,
      p_amount: changes.amount ? parseFloat(changes.amount) : null,
      p_frequency: changes.frequency || null,
      p_category_id: categoryId || null,          // ← NUEVO
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
    await supabase.from('recurring_payments').update({ is_active: false }).eq('id', id)
    await loadData()
  }

  const markRecPaid = async (id, date = toDay(), amount) => {
    const rec = recurring.find(r => r.id === id)
    if (!rec) return { error: new Error('No encontrado') }
    const { error } = await supabase.rpc('rpc_mark_recurring_paid', { p_rec_id: id, p_amount: amount, p_date: date })
    console.log('[MiFinanza] markRecPaid result:', { error })
    if (!error) await loadData()
    return { error }
  }

  // ── Metas ──────────────────────────────────────────────────────────────
  const addGoal = async (goal) => {
    const { data, error } = await supabase.from('savings_goals').insert({ family_id: family.id, owner_profile: profile?.id, ...goal, target_amount: parseFloat(goal.target_amount) }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const editGoal = async (id, changes) => {
    const { error } = await supabase.rpc('rpc_update_savings_goal', { p_goal_id: id, p_name: changes.name || null, p_target_amount: changes.target_amount ? parseFloat(changes.target_amount) : null, p_emoji: changes.emoji || null, p_color: changes.color || null, p_deadline: changes.deadline || null, p_status: changes.status || null, p_notes: changes.notes || null, p_account_id: changes.account_id || null })
    if (!error) await loadData(); return { error }
  }
  const deleteGoal = async (id) => {
    await supabase.from('savings_goals').delete().eq('id', id); await loadData()
  }
  const depositGoal = async (id, amount, date = toDay(), from_account_id = null) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return { error: new Error('Meta no encontrada') }
    const { error } = await supabase.rpc('rpc_deposit_savings_goal', {
      p_goal_id: id,
      p_amount: amount,
      p_date: date,
      p_account_id: goal.account_id || null,
      p_from_account_id: from_account_id || null,
    })
    if (!error) await loadData(); return { error }
  }
  const addKidGoal = async (goal) => {
    const { data, error } = await supabase.from('kids_goals').insert({
      family_id: family.id,
      approval_status: profile?.is_kid ? 'pending' : 'approved',
      kid_profile: goal.kid_profile,
      name: goal.name,
      target_amount: parseFloat(goal.target_amount),
      emoji: goal.emoji,
      color: goal.color,
      reward_text: goal.reward_text || null,
    }).select().single()
    if (!error) await loadData(); return { data, error }
  }
  const depositKidGoal = async (id, amount) => {
    const { error } = await supabase.rpc('rpc_kids_deposit', { p_goal_id: id, p_amount: amount })
    if (!error) await loadData(); return { error }
  }
  const updateKidGoalApproval = async (goalId, approvalStatus) => {
    const { data, error } = await supabase.rpc('rpc_update_kid_goal_approval', {
      p_goal_id: goalId,
      p_approval_status: approvalStatus,
    })
    if (!error) await loadData(); return { data, error }
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

  // ── Categorías personalizadas ─────────────────────────────────────────
  const addCategory = async (cat) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el admin puede crear categorías') }
    const { data, error } = await supabase.from('categories').insert({
      family_id: family.id,
      created_by: profile?.id,
      key: cat.key,
      type: cat.type,
      label_es: cat.label_es || null,
      label_en: cat.label_en || null,
      label_fr: cat.label_fr || null,
      color: cat.color || '#94a3b8',
    }).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const editCategory = async (id, changes) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el admin puede editar categorías') }
    const { data, error } = await supabase.from('categories').update({
      key: changes.key,
      type: changes.type,
      label_es: changes.label_es || null,
      label_en: changes.label_en || null,
      label_fr: changes.label_fr || null,
      color: changes.color || '#94a3b8',
    }).eq('id', id).select().single()
    if (!error) await loadData()
    return { data, error }
  }

  const deleteCategory = async (id) => {
    if (!isFamilyAdmin) return { error: new Error('Solo el admin puede eliminar categorías') }
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) await loadData()
    return { error }
  }

  const getAccount = (id) => accounts.find(a => a.id === id)
  const getMember = (id) => members.find(m => m.id === id)
  const openModal = (name) => setModal(name)
  const closeModal = () => setModal(null)

  const ctx = {
    session, profile, family, members, accounts,
    onboardingState, signOut, updateProfile, createFamily, joinFamily, reloadProfile,
    assetAccounts, creditAccounts, debts, recurring, txns, payCreditCard,
    goals, kidsGoals, summary, netWorth, dataLoading, filteredTxns,
    customCategories, categoriesByType, categoryColorMap,
    t, lang, setLang, tab, setTab,
    isKid, isOwner, isFamilyAdmin, kids, pendingMembers,
    filterType, setFilterType,
    pMode, setPMode, selMonth, setSelMonth, rFrom, setRFrom, rTo, setRTo,
    af, applyFilter, selAcc, setSelAcc,
    modal, openModal, closeModal,
    addTxn, editTxn, deleteTxn,
    addCategory, editCategory, deleteCategory,
    addAccount, editAccount,
    addDebt, editDebt, deleteDebt, payDebt,
    addRecurring, editRecurring, deleteRecurring, markRecPaid,
    addGoal, editGoal, deleteGoal, depositGoal,
    transferToSaving,
    addKidGoal, depositKidGoal, updateKidGoalApproval,
    setMemberStatus, setMemberRole,
    getAccount, getMember, reload: loadData,
    kidsDeposits,
    setDebts, setRecurring, setTxns, setGoals, setKidsGoals, setKidsDeposits, setMembers,
  }

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}