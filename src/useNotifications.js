// src/useNotifications.js — Push notifications via browser Notification API
import { useEffect, useRef } from 'react'

export function useNotifications() {
  const granted = useRef(Notification?.permission === 'granted')

  const requestPermission = async () => {
    if (!('Notification' in window)) return false
    const perm = await Notification.requestPermission()
    granted.current = perm === 'granted'
    return granted.current
  }

  const notify = (title, body, icon = '/icons/icon-192.png') => {
    if (!granted.current || !('Notification' in window)) return
    try {
      new Notification(title, { body, icon, badge: '/icons/icon-192.png' })
    } catch(e) {}
  }

  // Check upcoming recurring payments and budgets
  const checkUpcoming = (rec, budgetResults) => {
    if (!granted.current) return

    // Upcoming payments in next 3 days
    const today = new Date()
    rec.forEach(r => {
      const due = new Date(r.nextDue)
      const days = Math.ceil((due - today) / 86400000)
      if (days === 3) {
        notify(`📅 Pago próximo: ${r.name}`, `Vence el ${r.nextDue} — $${r.amount}`)
      }
      if (days === 0) {
        notify(`⚠️ Pago hoy: ${r.name}`, `$${r.amount} vence hoy`)
      }
    })

    // Over-budget alerts
    budgetResults?.forEach(({ budget, pct, status }) => {
      if (status === 'over') {
        notify(`🔴 Presupuesto superado: ${budget.name}`, `Has gastado ${pct}% del límite mensual`)
      } else if (status === 'warning') {
        notify(`🟡 Presupuesto al 80%: ${budget.name}`, `Has usado ${pct}% de $${budget.amount}`)
      }
    })
  }

  return { requestPermission, notify, checkUpcoming, granted: granted.current }
}
