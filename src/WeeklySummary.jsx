// src/WeeklySummary.jsx — Weekly financial summary component
import { useMemo } from 'react'

const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)

function getWeekBounds(weeksAgo = 0) {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - day - weeksAgo * 7)
  startOfWeek.setHours(0,0,0,0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23,59,59,999)
  return {
    from: startOfWeek.toISOString().slice(0,10),
    to: endOfWeek.toISOString().slice(0,10),
    label: weeksAgo === 0 ? 'Esta semana' : weeksAgo === 1 ? 'Semana pasada' : `Hace ${weeksAgo} semanas`
  }
}

export function WeeklySummary({ txns, cats, th }) {
  const thisWeek = getWeekBounds(0)
  const lastWeek = getWeekBounds(1)

  const calcWeek = (bounds) => {
    const wt = txns.filter(x => x.date >= bounds.from && x.date <= bounds.to)
    const income = wt.filter(x => x.type==='income').reduce((s,x)=>s+x.amount,0)
    const expense = wt.filter(x => x.type==='expense').reduce((s,x)=>s+x.amount,0)
    const saving = wt.filter(x => x.type==='saving').reduce((s,x)=>s+x.amount,0)
    // Top categories
    const catMap = {}
    wt.filter(x=>x.type==='expense').forEach(x=>{ catMap[x.category]=(catMap[x.category]||0)+x.amount })
    const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,3)
    return { income, expense, saving, topCats, count: wt.length }
  }

  const tw = useMemo(()=>calcWeek(thisWeek),[txns])
  const lw = useMemo(()=>calcWeek(lastWeek),[txns])

  const expDiff = lw.expense > 0 ? Math.round(((tw.expense - lw.expense)/lw.expense)*100) : null
  const expColor = expDiff === null ? '#9ca3af' : expDiff > 0 ? '#ef4444' : '#16a34a'
  const expArrow = expDiff === null ? '' : expDiff > 0 ? '↑' : '↓'

  const getCatIcon = (catId) => {
    for (const type of ['income','expense','saving']) {
      const c = (cats[type]||[]).find(c=>c.id===catId)
      if (c) return { icon:c.icon, label:c.label, color:c.color }
    }
    return { icon:'📦', label:catId, color:'#94a3b8' }
  }

  return (
    <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:18,padding:'18px 20px'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:th.text,marginBottom:14}}>
        📅 Resumen semanal
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
        {[
          {l:'Ingresos',v:tw.income,c:'#16a34a',i:'↑'},
          {l:'Gastos',v:tw.expense,c:'#ef4444',i:'↓'},
          {l:'Ahorros',v:tw.saving,c:'#6366f1',i:'◎'},
        ].map(s=>(
          <div key={s.l} style={{background:th.subcard,borderRadius:12,padding:'10px 10px',border:`1px solid ${th.border}`}}>
            <div style={{fontSize:10,color:th.text3,marginBottom:3}}>{s.i} {s.l}</div>
            <div style={{fontSize:13,fontWeight:800,color:s.c,fontFamily:"'Syne',sans-serif"}}>{fmt(s.v)}</div>
          </div>
        ))}
      </div>

      {/* vs last week */}
      {expDiff !== null && (
        <div style={{fontSize:12,color:expColor,fontWeight:600,marginBottom:12,padding:'6px 10px',borderRadius:8,background:expColor+'14'}}>
          {expArrow} Gastos {Math.abs(expDiff)}% {expDiff>0?'más':'menos'} que la semana pasada
        </div>
      )}

      {/* Top categories */}
      {tw.topCats.length > 0 && (
        <div>
          <div style={{fontSize:10,color:th.text3,fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:7}}>Top gastos</div>
          {tw.topCats.map(([catId, amt])=>{
            const c = getCatIcon(catId)
            return(
              <div key={catId} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:14}}>{c.icon}</span>
                <span style={{flex:1,fontSize:12,color:th.text}}>{c.label}</span>
                <span style={{fontSize:12,fontWeight:700,color:'#ef4444'}}>{fmt(amt)}</span>
              </div>
            )
          })}
        </div>
      )}

      {tw.count === 0 && (
        <div style={{fontSize:12,color:th.text3,textAlign:'center',padding:'8px 0'}}>Sin movimientos esta semana</div>
      )}
    </div>
  )
}
