// src/useFinanzas.js
// Hook personalizado: reemplaza localStorage con Supabase
// Úsalo en tu App.jsx así:
//   const { accs, txns, debts, ... } = useFinanzas(familyId)

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

  // ── Cargar todos los datos ────────────────────────────────────
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

    // Mapear snake_case de Supabase → camelCase del app
    setAccs((a.data||[]).map(x => ({ id:x.id, name:x.name, owner:x.owner, type:x.type, color:x.color })))
    setPms((p.data||[]).map(x => ({ id:x.id, name:x.name, type:x.type, lastFour:x.last_four, color:x.color, limit:x.credit_limit })))
    setTxns((t.data||[]).map(x => ({ id:x.id, type:x.type, category:x.category, description:x.description, amount:parseFloat(x.amount), date:x.date, accId:x.account_id, pmId:x.payment_method_id })))
    setDebts((d.data||[]).map(x => ({ id:x.id, name:x.name, totalDebt:parseFloat(x.total_debt), paid:parseFloat(x.paid), monthlyPayment:parseFloat(x.monthly_payment), interestRate:parseFloat(x.interest_rate), startDate:x.start_date })))
    setRec((r.data||[]).map(x => ({ id:x.id, name:x.name, amount:parseFloat(x.amount), frequency:x.frequency, category:x.category, pmId:x.payment_method_id, nextDue:x.next_due })))
    setGoals((g.data||[]).map(x => ({ id:x.id, name:x.name, target:parseFloat(x.target), current:parseFloat(x.current) })))
    setLoading(false)
  }, [familyId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Suscripción en tiempo real ────────────────────────────────
  useEffect(() => {
    if (!familyId) return
    const channel = supabase
      .channel('finanza-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts', filter: `family_id=eq.${familyId}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `family_id=eq.${familyId}` }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, loadAll])

  // ── CRUD helpers ──────────────────────────────────────────────

  // Transacciones
  const addTxn = async (tx) => {
    const { data, error } = await supabase.from('transactions').insert({
      family_id: familyId,
      type: tx.type, category: tx.category, description: tx.description,
      amount: tx.amount, date: tx.date,
      account_id: tx.accId || null,
      payment_method_id: tx.pmId || null,
    }).select().single()
    if (!error && data) setTxns(ts => [{ ...tx, id: data.id }, ...ts])
  }

  const deleteTxn = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTxns(ts => ts.filter(x => x.id !== id))
  }

  // Cuentas
  const addAcc = async (acc) => {
    const { data, error } = await supabase.from('accounts').insert({ family_id: familyId, ...acc }).select().single()
    if (!error && data) setAccs(as => [...as, { ...acc, id: data.id }])
  }

  const deleteAcc = async (id) => {
    await supabase.from('accounts').delete().eq('id', id)
    setAccs(as => as.filter(x => x.id !== id))
  }

  // Formas de pago
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

  // Deudas
  const addDebt = async (d) => {
    const { data, error } = await supabase.from('debts').insert({
      family_id: familyId, name: d.name, total_debt: d.totalDebt,
      paid: d.paid, monthly_payment: d.monthlyPayment,
      interest_rate: d.interestRate, start_date: d.startDate,
    }).select().single()
    if (!error && data) setDebts(ds => [...ds, { ...d, id: data.id }])
  }

  const deleteDebt = async (id) => {
    await supabase.from('debts').delete().eq('id', id)
    setDebts(ds => ds.filter(x => x.id !== id))
  }

  const updateDebtPaid = async (id, newPaid) => {
    await supabase.from('debts').update({ paid: newPaid }).eq('id', id)
    setDebts(ds => ds.map(x => x.id === id ? { ...x, paid: newPaid } : x))
  }

  // Pagos recurrentes
  const addRec = async (r) => {
    const { data, error } = await supabase.from('recurring_payments').insert({
      family_id: familyId, name: r.name, amount: r.amount,
      frequency: r.frequency, category: r.category,
      payment_method_id: r.pmId, next_due: r.nextDue,
    }).select().single()
    if (!error && data) setRec(rs => [...rs, { ...r, id: data.id }])
  }

  const deleteRec = async (id) => {
    await supabase.from('recurring_payments').delete().eq('id', id)
    setRec(rs => rs.filter(x => x.id !== id))
  }

  const markRecPaid = async (id, nextDue) => {
    await supabase.from('recurring_payments').update({ next_due: nextDue }).eq('id', id)
    setRec(rs => rs.map(x => x.id === id ? { ...x, nextDue } : x))
  }

  // Metas
  const addGoal = async (g) => {
    const { data, error } = await supabase.from('savings_goals').insert({
      family_id: familyId, name: g.name, target: g.target, current: g.current,
    }).select().single()
    if (!error && data) setGoals(gs => [...gs, { ...g, id: data.id }])
  }

  const deleteGoal = async (id) => {
    await supabase.from('savings_goals').delete().eq('id', id)
    setGoals(gs => gs.filter(x => x.id !== id))
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
    addTxn, deleteTxn,
    addAcc, deleteAcc,
    addPm, deletePm,
    addDebt, deleteDebt, updateDebtPaid,
    addRec, deleteRec, markRecPaid,
    addGoal, deleteGoal, depositGoal,
    reload: loadAll,
  }
}
