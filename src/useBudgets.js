// src/useBudgets.js — Presupuestos por categoría con alertas
import { useState, useEffect } from 'react'

const KEY = 'fn_budgets'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

export function useBudgets() {
  const [budgets, setBudgetsState] = useState(load)

  const setBudgets = v => { setBudgetsState(v); localStorage.setItem(KEY, JSON.stringify(v)) }

  const addBudget = (b) => setBudgets([...budgets, { ...b, id: 'bdg_' + Date.now() }])
  const updateBudget = (id, b) => setBudgets(budgets.map(x => x.id === id ? { ...x, ...b } : x))
  const deleteBudget = (id) => setBudgets(budgets.filter(x => x.id !== id))

  // Check each budget against spending — returns array of { budget, spent, pct, status }
  const checkBudgets = (txns, month) => {
    return budgets.map(b => {
      const spent = txns
        .filter(x => x.type === 'expense' && x.category === b.category && x.date.startsWith(month))
        .reduce((s, x) => s + x.amount, 0)
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
      const status = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : 'ok'
      return { budget: b, spent, pct, status }
    })
  }

  return { budgets, addBudget, updateBudget, deleteBudget, checkBudgets }
}
