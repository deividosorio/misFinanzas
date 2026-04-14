// src/GoalProgress.jsx — Goals with deadline and monthly contribution calc
import { useMemo } from 'react'

const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)

export function GoalProgressCard({ goal, th, onDeposit, onDelete }) {
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
  const remaining = goal.target - goal.current

  const monthlyNeeded = useMemo(() => {
    if (!goal.deadline) return null
    const now = new Date()
    const dl = new Date(goal.deadline)
    const months = Math.max(1, Math.ceil((dl - now) / (1000*60*60*24*30)))
    return Math.ceil(remaining / months)
  }, [goal, remaining])

  const daysLeft = useMemo(() => {
    if (!goal.deadline) return null
    const dl = new Date(goal.deadline)
    return Math.ceil((dl - new Date()) / 86400000)
  }, [goal])

  const isOnTrack = monthlyNeeded ? (goal.monthlySaving || 0) >= monthlyNeeded : null

  return (
    <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:16,padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:14,color:th.text}}>{goal.name}</div>
          {goal.deadline && (
            <div style={{fontSize:11,color:daysLeft>0?th.text3:'#ef4444',marginTop:2}}>
              {daysLeft>0 ? `📅 ${daysLeft} días restantes` : '⚠️ Plazo vencido'}
            </div>
          )}
        </div>
        <button onClick={()=>onDelete(goal.id)} style={{border:'1px solid #fecdd3',borderRadius:7,padding:'4px 8px',cursor:'pointer',background:'#fff5f5',color:'#ef4444',fontFamily:'inherit',fontSize:12}}>✕</button>
      </div>

      <div style={{background:th.progBg,borderRadius:99,height:9,marginBottom:8,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:99,width:`${pct}%`,background:'linear-gradient(90deg,#6366f1,#4f7cff)',transition:'width .6s'}}/>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:12}}>
        <span style={{color:'#6366f1',fontWeight:700}}>{fmt(goal.current)}</span>
        <span style={{color:th.text3}}>{pct}% · meta {fmt(goal.target)}</span>
      </div>

      {monthlyNeeded && (
        <div style={{padding:'8px 12px',borderRadius:10,background:isOnTrack?'#f0fdf4':'#fffbeb',border:`1px solid ${isOnTrack?'#bbf7d0':'#fde68a'}`,marginBottom:12,fontSize:12}}>
          <div style={{fontWeight:600,color:isOnTrack?'#16a34a':'#f59e0b'}}>
            {isOnTrack?'✅ En camino':'⚠️ Necesitas ahorrar más'}
          </div>
          <div style={{color:th.text2,marginTop:2}}>
            Necesitas {fmt(monthlyNeeded)}/mes para llegar a tiempo
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:7}}>
        <input type="number" placeholder="Depositar $" className="inp" id={`dep-${goal.id}`}
          style={{flex:1,background:th.input,border:`1.5px solid ${th.inputBorder}`,borderRadius:9,padding:'8px 12px',color:th.text,fontFamily:'inherit',fontSize:13,outline:'none'}}/>
        <button onClick={()=>{
          const el=document.getElementById(`dep-${goal.id}`)
          const v=parseFloat(el.value)
          if(!isNaN(v)&&v>0){onDeposit(goal.id,v);el.value=''}
        }} style={{border:'none',borderRadius:9,padding:'8px 14px',cursor:'pointer',background:'#4f7cff',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>+</button>
      </div>
    </div>
  )
}
