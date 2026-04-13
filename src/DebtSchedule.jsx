// src/DebtSchedule.jsx — Configurar calendario de pagos para una deuda
import { useState } from 'react'

const FREQ_OPTIONS = [
  { id:'monthly', label:'Mensual', icon:'📅' },
  { id:'biweekly', label:'Quincenal', icon:'📆' },
  { id:'weekly', label:'Semanal', icon:'🗓️' },
  { id:'yearly', label:'Anual', icon:'📊' },
  { id:'custom', label:'Fechas personalizadas', icon:'✏️' },
]

export function DebtSchedule({ debt, onSave, onClose, th }) {
  const [freq, setFreq] = useState(debt.frequency || 'monthly')
  const [amount, setAmount] = useState(debt.monthlyPayment || '')
  // Custom schedule: array of { date, amount }
  const [schedule, setSchedule] = useState(debt.schedule || [])
  const [newDate, setNewDate] = useState('')
  const [newAmt, setNewAmt] = useState('')

  const addEntry = () => {
    if (!newDate || !newAmt) return
    setSchedule(s => [...s, { date: newDate, amount: parseFloat(newAmt) }].sort((a,b) => a.date.localeCompare(b.date)))
    setNewDate(''); setNewAmt('')
  }

  const removeEntry = i => setSchedule(s => s.filter((_,j) => j !== i))

  const totalScheduled = schedule.reduce((s,e) => s+e.amount, 0)
  const remaining = debt.totalDebt - debt.paid
  const coverage = remaining > 0 ? Math.round((totalScheduled/remaining)*100) : 100

  const save = () => {
    onSave({
      frequency: freq,
      monthlyPayment: freq === 'custom' ? (schedule[0]?.amount || debt.monthlyPayment) : parseFloat(amount),
      schedule: freq === 'custom' ? schedule : [],
    })
    onClose()
  }

  const s = {
    overlay: { position:'fixed', inset:0, background:'#00000066', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' },
    modal: { background:th.card, border:`1px solid ${th.cardBorder}`, borderRadius:22, padding:24, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px #00000030' },
    inp: { background:th.input, border:`1.5px solid ${th.inputBorder}`, borderRadius:9, padding:'8px 12px', color:th.text, fontFamily:'inherit', fontSize:13, width:'100%', outline:'none' },
    lbl: { fontSize:11, color:th.text3, marginBottom:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px', display:'block' },
  }

  const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:th.text, marginBottom:4 }}>📅 Calendario de pagos</div>
        <div style={{ fontSize:12, color:th.text3, marginBottom:18 }}>{debt.name} · Restante: {fmt(remaining)}</div>

        {/* Frequency selector */}
        <div style={{ marginBottom:16 }}>
          <label style={s.lbl}>Frecuencia de pago</label>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {FREQ_OPTIONS.map(f => (
              <div key={f.id} onClick={() => setFreq(f.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:11, cursor:'pointer', border:`1.5px solid ${freq===f.id?'#4f7cff':th.border}`, background:freq===f.id?'#eff3ff':th.subcard, transition:'all .15s' }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <span style={{ fontSize:13, fontWeight:600, color:freq===f.id?'#4f7cff':th.text }}>{f.label}</span>
                <div style={{ marginLeft:'auto', width:18, height:18, borderRadius:'50%', border:`2px solid ${freq===f.id?'#4f7cff':th.border}`, background:freq===f.id?'#4f7cff':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {freq===f.id && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }}/>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard amount */}
        {freq !== 'custom' && (
          <div style={{ marginBottom:16 }}>
            <label style={s.lbl}>Monto por pago (CAD $)</label>
            <input type="number" style={s.inp} value={amount} onChange={e => setAmount(e.target.value)} placeholder="1850" />
            {amount && <div style={{ fontSize:11, color:th.text3, marginTop:6 }}>
              {freq==='monthly' && `≈ ${Math.ceil(remaining/amount)} pagos para saldar`}
              {freq==='biweekly' && `≈ ${Math.ceil(remaining/amount)} pagos (${Math.ceil(remaining/amount/2)} meses)`}
              {freq==='weekly' && `≈ ${Math.ceil(remaining/amount)} semanas`}
              {freq==='yearly' && `≈ ${Math.ceil(remaining/amount)} años`}
            </div>}
          </div>
        )}

        {/* Custom schedule */}
        {freq === 'custom' && (
          <div style={{ marginBottom:16 }}>
            <label style={s.lbl}>Pagos programados</label>
            {/* Progress */}
            <div style={{ background:th.subcard, border:`1px solid ${th.border}`, borderRadius:11, padding:'10px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                <span style={{ color:th.text2 }}>Programado: {fmt(totalScheduled)}</span>
                <span style={{ color:remaining>0&&totalScheduled>=remaining?'#16a34a':th.text3 }}>{coverage}% de {fmt(remaining)}</span>
              </div>
              <div style={{ background:th.progBg, borderRadius:99, height:6, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, width:`${Math.min(100,coverage)}%`, background:'linear-gradient(90deg,#10b981,#4f7cff)', transition:'width .4s' }}/>
              </div>
            </div>

            {/* Entry list */}
            {schedule.length>0 && (
              <div style={{ marginBottom:10, maxHeight:200, overflowY:'auto' }}>
                {schedule.map((e,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:th.subcard, border:`1px solid ${th.border}`, marginBottom:5 }}>
                    <span style={{ fontSize:12, color:th.text3 }}>📅</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:600, color:th.text }}>{e.date}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#4f7cff' }}>{fmt(e.amount)}</span>
                    <button onClick={() => removeEntry(i)} style={{ border:'none', background:'none', cursor:'pointer', color:'#ef4444', fontSize:14, padding:'0 4px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add entry */}
            <div style={{ display:'flex', gap:6 }}>
              <input type="date" style={{ ...s.inp, flex:1 }} value={newDate} onChange={e => setNewDate(e.target.value)} />
              <input type="number" style={{ ...s.inp, width:100 }} placeholder="$" value={newAmt} onChange={e => setNewAmt(e.target.value)} />
              <button onClick={addEntry} style={{ border:'none', borderRadius:9, padding:'8px 12px', cursor:'pointer', background:'#4f7cff', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>+</button>
            </div>
            <div style={{ fontSize:11, color:th.text3, marginTop:6 }}>Agrega cada fecha y monto de pago individualmente</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={onClose} style={{ flex:1, border:`1.5px solid ${th.border}`, borderRadius:10, padding:'9px', cursor:'pointer', background:th.btnGhost, color:th.text2, fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Cancelar</button>
          <button onClick={save} style={{ flex:2, border:'none', borderRadius:10, padding:'9px', cursor:'pointer', background:'#4f7cff', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Guardar calendario</button>
        </div>
      </div>
    </div>
  )
}
