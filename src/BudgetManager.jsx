// src/BudgetManager.jsx — Create/edit budgets per category with progress
import { useState } from 'react'
import { ColorPicker } from './ColorPicker'

const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)

export function BudgetManager({ budgets, onAdd, onUpdate, onDelete, checkResults, cats, th, onClose }) {
  const [form, setForm] = useState(null) // null | { id?, name, category, amount, color }
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newAmt, setNewAmt] = useState('')
  const [newColor, setNewColor] = useState('#f43f5e')

  const allExpCats = cats?.expense || []

  const startNew = () => { setForm({ isNew:true }); setNewName(''); setNewCat(allExpCats[0]?.id||'food'); setNewAmt(''); setNewColor('#f43f5e') }
  const startEdit = (b) => { setForm(b); setNewName(b.name); setNewCat(b.category); setNewAmt(String(b.amount)); setNewColor(b.color||'#f43f5e') }

  const save = () => {
    if (!newName || !newAmt) return
    const data = { name:newName, category:newCat, amount:parseFloat(newAmt), color:newColor }
    if (form.isNew) onAdd(data)
    else onUpdate(form.id, data)
    setForm(null)
  }

  const s = {
    overlay:{ position:'fixed',inset:0,background:'#00000066',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)' },
    modal:{ background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:22,padding:0,width:'100%',maxWidth:500,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px #00000030',overflow:'hidden' },
    inp:{ background:th.input,border:`1.5px solid ${th.inputBorder}`,borderRadius:9,padding:'8px 12px',color:th.text,fontFamily:'inherit',fontSize:13,width:'100%',outline:'none' },
    lbl:{ fontSize:11,color:th.text3,marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'.3px',display:'block' },
  }

  const STATUS_COLOR = { ok:'#16a34a', warning:'#f59e0b', over:'#ef4444' }
  const STATUS_BG = { ok:'#f0fdf4', warning:'#fffbeb', over:'#fff5f5' }
  const STATUS_LABEL = { ok:'✅ Dentro del límite', warning:'⚠️ 80% usado', over:'🔴 Límite superado' }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'20px 24px 14px',borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text}}>📊 Presupuestos mensuales</div>
          <div style={{fontSize:12,color:th.text3,marginTop:3}}>Define cuánto puedes gastar por categoría cada mes</div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          {/* Edit form */}
          {form && (
            <div style={{background:th.subcard,border:`1.5px solid #4f7cff44`,borderRadius:14,padding:16,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#4f7cff',marginBottom:12}}>{form.isNew?'+ Nuevo presupuesto':'✏️ Editar'}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={s.lbl}>Nombre</label><input style={s.inp} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="ej: Alimentación"/></div>
                <div>
                  <label style={s.lbl}>Categoría</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {allExpCats.map(c=>(
                      <div key={c.id} onClick={()=>setNewCat(c.id)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,cursor:'pointer',border:`1.5px solid ${newCat===c.id?c.color:th.border}`,background:newCat===c.id?c.color+'18':th.card,transition:'all .12s'}}>
                        <span style={{fontSize:14}}>{c.icon}</span>
                        <span style={{fontSize:11,fontWeight:600,color:newCat===c.id?c.color:th.text2}}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div><label style={s.lbl}>Límite mensual (CAD $)</label><input type="number" style={s.inp} value={newAmt} onChange={e=>setNewAmt(e.target.value)} placeholder="500"/></div>
                <div><label style={s.lbl}>Color</label><ColorPicker value={newColor} onChange={setNewColor} th={th}/></div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setForm(null)} style={{flex:1,border:`1.5px solid ${th.border}`,borderRadius:9,padding:8,cursor:'pointer',background:th.btnGhost,color:th.text2,fontFamily:'inherit',fontSize:13,fontWeight:600}}>Cancelar</button>
                  <button onClick={save} style={{flex:2,border:'none',borderRadius:9,padding:8,cursor:'pointer',background:'#4f7cff',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          {/* Budget list with progress */}
          {checkResults.length === 0 && !form && (
            <div style={{textAlign:'center',padding:'24px 0',color:th.text3,fontSize:13}}>Sin presupuestos configurados</div>
          )}
          {checkResults.map(({ budget:b, spent, pct, status }) => (
            <div key={b.id} style={{marginBottom:10,padding:'12px 14px',borderRadius:12,background:th.card,border:`1px solid ${th.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:b.color||'#f43f5e',flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:th.text}}>{b.name}</div>
                    <div style={{fontSize:10,color:th.text3}}>
                      {fmt(spent)} de {fmt(b.amount)}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:6,background:STATUS_BG[status],color:STATUS_COLOR[status]}}>{pct}%</span>
                  <button onClick={()=>startEdit(b)} style={{border:`1px solid ${th.border}`,borderRadius:7,padding:'4px 8px',cursor:'pointer',background:th.hoverBg,color:th.text2,fontFamily:'inherit',fontSize:11,fontWeight:600}}>✏️</button>
                  <button onClick={()=>onDelete(b.id)} style={{border:'1px solid #fecdd3',borderRadius:7,padding:'4px 8px',cursor:'pointer',background:'#fff5f5',color:'#ef4444',fontFamily:'inherit',fontSize:11}}>✕</button>
                </div>
              </div>
              <div style={{background:th.progBg,borderRadius:99,height:7,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,width:`${Math.min(100,pct)}%`,background:STATUS_COLOR[status],transition:'width .5s ease'}}/>
              </div>
              {status!=='ok'&&<div style={{fontSize:10,color:STATUS_COLOR[status],marginTop:4,fontWeight:600}}>{STATUS_LABEL[status]}</div>}
            </div>
          ))}

          <button onClick={startNew} style={{width:'100%',border:`1.5px dashed ${th.border}`,borderRadius:11,padding:10,cursor:'pointer',background:'transparent',color:'#4f7cff',fontFamily:'inherit',fontSize:13,fontWeight:600,marginTop:4}}>
            + Nuevo presupuesto
          </button>
        </div>

        <div style={{padding:'14px 24px',borderTop:`1px solid ${th.border}`,display:'flex',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{border:'none',borderRadius:10,padding:'9px 22px',cursor:'pointer',background:'#4f7cff',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>Listo</button>
        </div>
      </div>
    </div>
  )
}

// ── Compact budget bar for Dashboard ─────────────────────────────────────────
export function BudgetDashRow({ result, th }) {
  const { budget:b, spent, pct, status } = result
  const STATUS_COLOR = { ok:'#16a34a', warning:'#f59e0b', over:'#ef4444' }
  const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:12,color:th.text,fontWeight:500}}>{b.name}</span>
        <span style={{fontSize:11,color:STATUS_COLOR[status],fontWeight:700}}>{fmt(spent)} / {fmt(b.amount)}</span>
      </div>
      <div style={{background:th.progBg,borderRadius:99,height:6,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:99,width:`${Math.min(100,pct)}%`,background:STATUS_COLOR[status],transition:'width .5s'}}/>
      </div>
    </div>
  )
}
