// src/useFinanzas.js — Full CRUD with edit support for all entities
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'

export function useFinanzas(familyId) {
  const [accs, setAccs]   = useState([])
  const [pms, setPms]     = useState([])
  const [txns, setTxns]   = useState([])
  const [debts, setDebts] = useState([])
  const [rec, setRec]     = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    const [a, p, t, d, r, g] = await Promise.all([
      supabase.from('accounts').select('*').eq('family_id', familyId).order('created_at'),
      supabase.from('payment_methods').select('*').eq('family_id', familyId).order('created_at'),
      supabase.from('transactions').select('*').eq('family_id', familyId).order('date', { ascending: false }),
      supabase.from('debts').select('*').eq('family_id', familyId).order('created_at'),
      supabase.from('recurring_payments').select('*').eq('family_id', familyId).order('next_due'),
      supabase.from('savings_goals').select('*').eq('family_id', familyId).order('created_at'),
    ])
    setAccs((a.data||[]).map(x => ({ id:x.id, name:x.name, owner:x.owner, type:x.type, color:x.color })))
    setPms((p.data||[]).map(x => ({ id:x.id, name:x.name, type:x.type, lastFour:x.last_four, color:x.color, limit:x.credit_limit })))
    setTxns((t.data||[]).map(x => ({ id:x.id, type:x.type, category:x.category, description:x.description, amount:parseFloat(x.amount), date:x.date, accId:x.account_id, pmId:x.payment_method_id })))
    setDebts((d.data||[]).map(x => ({ id:x.id, name:x.name, totalDebt:parseFloat(x.total_debt), paid:parseFloat(x.paid), monthlyPayment:parseFloat(x.monthly_payment), interestRate:parseFloat(x.interest_rate), startDate:x.start_date, frequency:x.frequency||'monthly' })))
    setRec((r.data||[]).map(x => ({ id:x.id, name:x.name, amount:parseFloat(x.amount), frequency:x.frequency, category:x.category, pmId:x.payment_method_id, nextDue:x.next_due, amountType:x.amount_type||'fixed' })))
    setGoals((g.data||[]).map(x => ({ id:x.id, name:x.name, target:parseFloat(x.target), current:parseFloat(x.current), deadline:x.deadline||null })))
    setLoading(false)
  }, [familyId])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    if (!familyId) return
    const channel = supabase.channel('finanza-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'transactions', filter:`family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'accounts', filter:`family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'debts', filter:`family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'savings_goals', filter:`family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event:'*', schema:'public', table:'recurring_payments', filter:`family_id=eq.${familyId}` }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, loadAll])

  // ── Transactions ─────────────────────────────────────────────────────────
  const addTxn = async (tx) => {
    const { data, error } = await supabase.from('transactions').insert({
      family_id: familyId, type: tx.type, category: tx.category,
      description: tx.description, amount: tx.amount, date: tx.date,
      account_id: tx.accId || null, payment_method_id: tx.pmId || null,
    }).select().single()
    if (!error && data) setTxns(ts => [{ ...tx, id: data.id }, ...ts])
    return data
  }

  const updateTxn = async (id, tx) => {
    await supabase.from('transactions').update({
      type: tx.type, category: tx.category, description: tx.description,
      amount: tx.amount, date: tx.date,
      account_id: tx.accId || null, payment_method_id: tx.pmId || null,
    }).eq('id', id)
    setTxns(ts => ts.map(x => x.id === id ? { ...x, ...tx } : x))
  }

  const deleteTxn = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTxns(ts => ts.filter(x => x.id !== id))
  }

  // ── Accounts ─────────────────────────────────────────────────────────────
  const addAcc = async (acc) => {
    const { data, error } = await supabase.from('accounts').insert({ family_id: familyId, ...acc }).select().single()
    if (!error && data) setAccs(as => [...as, { ...acc, id: data.id }])
  }
  const deleteAcc = async (id) => {
    await supabase.from('accounts').delete().eq('id', id)
    setAccs(as => as.filter(x => x.id !== id))
  }
  const updateAcc = async (id, acc) => {
    await supabase.from('accounts').update({ name: acc.name, owner: acc.owner, type: acc.type, color: acc.color }).eq('id', id)
    setAccs(as => as.map(x => x.id === id ? { ...x, ...acc } : x))
  }

  // ── Payment Methods ───────────────────────────────────────────────────────
  const addPm = async (pm) => {
    const { data, error } = await supabase.from('payment_methods').insert({
      family_id: familyId, name: pm.name, type: pm.type,
      last_four: pm.lastFour, color: pm.color, credit_limit: pm.limit,
    }).select().single()
    if (!error && data) setPms(ps => [...ps, { ...pm, id: data.id }])
  }
  const deletePm = async (id) => {
    await supabase.from('payment_methods').delete().eq('id', id)
    setPms(ps => ps.filter(x => x.id !== id))
  }
  const updatePm = async (id, pm) => {
    await supabase.from('payment_methods').update({ name: pm.name, type: pm.type, last_four: pm.lastFour, color: pm.color, credit_limit: pm.limit }).eq('id', id)
    setPms(ps => ps.map(x => x.id === id ? { ...x, ...pm } : x))
  }

  // ── Debts ────────────────────────────────────────────────────────────────
  const addDebt = async (d) => {
    const { data, error } = await supabase.from('debts').insert({
      family_id: familyId, name: d.name, total_debt: d.totalDebt,
      paid: d.paid, monthly_payment: d.monthlyPayment,
      interest_rate: d.interestRate, start_date: d.startDate,
      frequency: d.frequency || 'monthly',
    }).select().single()
    if (!error && data) setDebts(ds => [...ds, { ...d, id: data.id }])
  }
  const deleteDebt = async (id) => {
    await supabase.from('debts').delete().eq('id', id)
    setDebts(ds => ds.filter(x => x.id !== id))
  }
  const updateDebt = async (id, d) => {
    await supabase.from('debts').update({
      name: d.name, total_debt: d.totalDebt, paid: d.paid,
      monthly_payment: d.monthlyPayment, interest_rate: d.interestRate,
      start_date: d.startDate, frequency: d.frequency || 'monthly',
    }).eq('id', id)
    setDebts(ds => ds.map(x => x.id === id ? { ...x, ...d } : x))
  }
  const updateDebtPaid = async (id, newPaid) => {
    await supabase.from('debts').update({ paid: newPaid }).eq('id', id)
    setDebts(ds => ds.map(x => x.id === id ? { ...x, paid: newPaid } : x))
  }
  const updateDebtSchedule = async (id, { frequency, monthlyPayment, schedule }) => {
    await supabase.from('debts').update({ monthly_payment: monthlyPayment, frequency }).eq('id', id)
    setDebts(ds => ds.map(x => x.id === id ? { ...x, monthlyPayment, frequency, schedule } : x))
  }

  // ── Recurring Payments ────────────────────────────────────────────────────
  const addRec = async (r) => {
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: familyId, name: r.name, amount: r.amount,
      frequency: r.frequency, category: r.category,
      payment_method_id: r.pmId, next_due: r.nextDue,
      amount_type: r.amountType || 'fixed',
    }).select().single()
    if (!error && data) setRec(rs => [...rs, { ...r, id: data.id }])
  }
  const deleteRec = async (id) => {
    await supabase.from('recurring_payments').delete().eq('id', id)
    setRec(rs => rs.filter(x => x.id !== id))
  }
  const updateRec = async (id, r) => {
    await supabase.from('recurring_payments').update({
      name: r.name, amount: r.amount, frequency: r.frequency,
      category: r.category, payment_method_id: r.pmId,
      next_due: r.nextDue, amount_type: r.amountType || 'fixed',
    }).eq('id', id)
    setRec(rs => rs.map(x => x.id === id ? { ...x, ...r } : x))
  }
  // markRecPaid: advances next_due + returns the new txn id so caller can handle
  const markRecPaid = async (id, nextDue, actualAmount) => {
    await supabase.from('recurring_payments').update({ next_due: nextDue }).eq('id', id)
    setRec(rs => rs.map(x => x.id === id ? { ...x, nextDue } : x))
    return actualAmount
  }

  // ── Savings Goals ─────────────────────────────────────────────────────────
  const addGoal = async (g) => {
    const { data, error } = await supabase.from('savings_goals').insert({
      family_id: familyId, name: g.name, target: g.target, current: g.current,
      deadline: g.deadline || null,
    }).select().single()
    if (!error && data) setGoals(gs => [...gs, { ...g, id: data.id }])
  }
  const deleteGoal = async (id) => {
    await supabase.from('savings_goals').delete().eq('id', id)
    setGoals(gs => gs.filter(x => x.id !== id))
  }
  const updateGoal = async (id, g) => {
    await supabase.from('savings_goals').update({ name: g.name, target: g.target, deadline: g.deadline||null }).eq('id', id)
    setGoals(gs => gs.map(x => x.id === id ? { ...x, ...g } : x))
  }
  const depositGoal = async (id, amount) => {
    const goal = goals.find(x => x.id === id)
    if (!goal) return
    const newCurrent = goal.current + amount
    await supabase.from('savings_goals').update({ current: newCurrent }).eq('id', id)
    setGoals(gs => gs.map(x => x.id === id ? { ...x, current: newCurrent } : x))
  }

  return {
    accs, pms, txns, debts, rec, goals, loading,
    addTxn, updateTxn, deleteTxn,
    addAcc, deleteAcc, updateAcc,
    addPm, deletePm, updatePm,
    addDebt, deleteDebt, updateDebt, updateDebtPaid, updateDebtSchedule,
    addRec, deleteRec, updateRec, markRecPaid,
    addGoal, deleteGoal, updateGoal, depositGoal,
    reload: loadAll,
  }
}
