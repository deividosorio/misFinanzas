// src/CategoryManager.jsx — Create/edit/delete/reorder categories
import { useState } from 'react'
import { ColorPicker } from './ColorPicker'

export const DEFAULT_CATS = {
  income: [
    { id:'salary',      label:'Salario',     icon:'💼', color:'#10b981', order:0 },
    { id:'freelance',   label:'Freelance',   icon:'💻', color:'#34d399', order:1 },
    { id:'investment',  label:'Inversión',   icon:'📈', color:'#6ee7b7', order:2 },
    { id:'other_income',label:'Otro ingreso',icon:'💰', color:'#a7f3d0', order:3 },
  ],
  expense: [
    { id:'food',         label:'Alimentación',   icon:'🛒', color:'#f43f5e', order:0  },
    { id:'housing',      label:'Vivienda',        icon:'🏠', color:'#f97316', order:1  },
    { id:'transport',    label:'Transporte',      icon:'🚗', color:'#f59e0b', order:2  },
    { id:'health',       label:'Salud',           icon:'🏥', color:'#a855f7', order:3  },
    { id:'entertainment',label:'Entretenimiento', icon:'🎬', color:'#6366f1', order:4  },
    { id:'education',    label:'Educación',       icon:'📚', color:'#06b6d4', order:5  },
    { id:'clothing',     label:'Ropa',            icon:'👕', color:'#ec4899', order:6  },
    { id:'utilities',    label:'Servicios',       icon:'💡', color:'#38bdf8', order:7  },
    { id:'insurance',    label:'Seguros',         icon:'🛡️', color:'#818cf8', order:8  },
    { id:'mortgage',     label:'Hipoteca',        icon:'🏦', color:'#fb923c', order:9  },
    { id:'car',          label:'Auto',            icon:'🚘', color:'#facc15', order:10 },
    { id:'other_expense',label:'Otro gasto',      icon:'📦', color:'#94a3b8', order:11 },
  ],
  saving: [
    { id:'emergency', label:'Emergencias', icon:'🚨', color:'#fbbf24', order:0 },
    { id:'vacation',  label:'Vacaciones',  icon:'✈️', color:'#22d3ee', order:1 },
    { id:'retirement',label:'Retiro',      icon:'🌅', color:'#c084fc', order:2 },
    { id:'goal',      label:'Meta',        icon:'🎯', color:'#4ade80', order:3 },
  ],
}

const ICONS = ['💼','💻','📈','💰','🛒','🏠','🚗','🏥','🎬','📚','👕','💡','🛡️','🏦','🚘','📦','🎯','✈️','🌅','🚨','🍔','☕','🎮','🏋️','👶','🐾','🎵','📱','🏪','⚡','🌊','🎨','🏃','💊','🔧','🎁','💒','🌱','🍷','🎓','🧾','🏊','🎪','🌍','🎭','🚀']

function loadCats() {
  try { return JSON.parse(localStorage.getItem('fn_cats')) || DEFAULT_CATS }
  catch { return DEFAULT_CATS }
}
function saveCats(cats) { localStorage.setItem('fn_cats', JSON.stringify(cats)) }

export function useCats() {
  const [cats, setCatsState] = useState(loadCats)
  const setCats = v => { setCatsState(v); saveCats(v) }
  return [cats, setCats]
}

// Sorted helper — always sort by order field
export function sortedCats(cats, type) {
  return [...(cats[type]||[])].sort((a,b) => (a.order||0)-(b.order||0))
}

export function CategoryManager({ cats, setCats, th, onClose }) {
  const [activeType, setActiveType] = useState('expense')
  const [editing, setEditing] = useState(null)
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon]   = useState('📦')
  const [newColor, setNewColor] = useState('#94a3b8')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [dragOver, setDragOver] = useState(null)

  const types = ['income','expense','saving']
  const typeLabels = { income:'Ingresos', expense:'Gastos', saving:'Ahorros' }

  const sorted = sortedCats(cats, activeType)

  const startEdit = (cat) => {
    setEditing({ ...cat, type: activeType })
    setNewLabel(cat.label); setNewIcon(cat.icon); setNewColor(cat.color)
    setShowIconPicker(false)
  }
  const startNew = () => {
    const maxOrder = Math.max(...sorted.map(c=>c.order||0), -1)
    setEditing({ id:'', label:'', icon:'📦', color:'#94a3b8', isNew:true, type:activeType, order:maxOrder+1 })
    setNewLabel(''); setNewIcon('📦'); setNewColor('#94a3b8')
    setShowIconPicker(false)
  }
  const saveEdit = () => {
    if (!newLabel.trim()) return
    const updated = { ...cats }
    if (editing.isNew) {
      const id = 'custom_' + Date.now()
      updated[editing.type] = [...(updated[editing.type]||[]), { id, label:newLabel.trim(), icon:newIcon, color:newColor, order:editing.order }]
    } else {
      updated[editing.type] = updated[editing.type].map(c =>
        c.id === editing.id ? { ...c, label:newLabel.trim(), icon:newIcon, color:newColor } : c
      )
    }
    setCats(updated)
    setEditing(null)
  }
  const deleteCat = (id) => {
    setCats({ ...cats, [activeType]: cats[activeType].filter(c => c.id !== id) })
  }

  // Drag to reorder
  const handleDragStart = (e, idx) => { e.dataTransfer.setData('text/plain', String(idx)) }
  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
    if (fromIdx === toIdx) { setDragOver(null); return }
    const items = [...sorted]
    const [moved] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, moved)
    const reordered = items.map((c,i) => ({ ...c, order:i }))
    setCats({ ...cats, [activeType]: [...(cats[activeType]||[]).filter(c=>!reordered.find(r=>r.id===c.id)), ...reordered] })
    setDragOver(null)
  }

  const s = {
    overlay:{ position:'fixed',inset:0,background:'#00000066',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)' },
    modal:{ background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:22,padding:0,width:'100%',maxWidth:520,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px #00000030',overflow:'hidden' },
    inp:{ background:th.input,border:`1.5px solid ${th.inputBorder}`,borderRadius:9,padding:'8px 12px',color:th.text,fontFamily:'inherit',fontSize:13,width:'100%',outline:'none' },
    lbl:{ fontSize:11,color:th.text3,marginBottom:4,fontWeight:500,textTransform:'uppercase',letterSpacing:'.3px',display:'block' },
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'18px 22px 12px',borderBottom:`1px solid ${th.border}`}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:th.text,marginBottom:10}}>🏷️ Categorías</div>
          <div style={{display:'flex',gap:4,background:th.hoverBg,borderRadius:10,padding:3}}>
            {types.map(tp=>(
              <button key={tp} onClick={()=>{setActiveType(tp);setEditing(null)}}
                style={{flex:1,border:'none',borderRadius:8,padding:'7px 0',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:activeType===tp?700:500,background:activeType===tp?th.card:'transparent',color:activeType===tp?'#4f7cff':th.text3,transition:'all .15s'}}>
                {typeLabels[tp]}
              </button>
            ))}
          </div>
          <div style={{fontSize:10,color:th.text3,marginTop:8}}>💡 Arrastra para reordenar</div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'14px 22px'}}>
          {/* Edit form */}
          {editing && (
            <div style={{background:th.subcard,border:'1.5px solid #4f7cff44',borderRadius:13,padding:14,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'#4f7cff',marginBottom:10}}>{editing.isNew?'+ Nueva categoría':'✏️ Editar'}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><label style={s.lbl}>Nombre</label><input style={s.inp} value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Nombre" autoFocus/></div>
                <div>
                  <label style={s.lbl}>Ícono</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <button onClick={()=>setShowIconPicker(v=>!v)} style={{width:38,height:38,borderRadius:9,background:th.hoverBg,border:`1.5px solid ${th.border}`,fontSize:20,cursor:'pointer'}}>{newIcon}</button>
                    {showIconPicker&&(
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,flex:1,maxHeight:90,overflowY:'auto'}}>
                        {ICONS.map(ic=>(
                          <button key={ic} onClick={()=>{setNewIcon(ic);setShowIconPicker(false)}}
                            style={{width:30,height:30,border:newIcon===ic?'2px solid #4f7cff':'1px solid transparent',borderRadius:7,background:newIcon===ic?'#eff3ff':th.hoverBg,cursor:'pointer',fontSize:16}}>{ic}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div><label style={s.lbl}>Color</label><ColorPicker value={newColor} onChange={setNewColor} th={th}/></div>
                {/* Preview */}
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:9,background:th.card,border:`1px solid ${th.border}`}}>
                  <div style={{width:30,height:30,borderRadius:8,background:newColor+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{newIcon}</div>
                  <span style={{fontSize:13,fontWeight:600,color:th.text}}>{newLabel||'Vista previa'}</span>
                  <div style={{marginLeft:'auto',width:8,height:8,borderRadius:'50%',background:newColor}}/>
                </div>
                <div style={{display:'flex',gap:7}}>
                  <button onClick={()=>setEditing(null)} style={{flex:1,border:`1.5px solid ${th.border}`,borderRadius:9,padding:8,cursor:'pointer',background:th.btnGhost,color:th.text2,fontFamily:'inherit',fontSize:12,fontWeight:600}}>Cancelar</button>
                  <button onClick={saveEdit} style={{flex:2,border:'none',borderRadius:9,padding:8,cursor:'pointer',background:'#4f7cff',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          {/* Category list with drag */}
          {sorted.map((cat,idx)=>(
            <div key={cat.id} draggable
              onDragStart={e=>handleDragStart(e,idx)}
              onDragOver={e=>{e.preventDefault();setDragOver(idx)}}
              onDrop={e=>handleDrop(e,idx)}
              onDragLeave={()=>setDragOver(null)}
              style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:11,marginBottom:5,border:`1.5px solid ${dragOver===idx?'#4f7cff':th.border}`,background:dragOver===idx?'#eff3ff':th.card,cursor:'grab',transition:'border .15s'}}>
              <span style={{fontSize:11,color:th.text3,cursor:'grab',padding:'0 2px'}}>⠿</span>
              <div style={{width:30,height:30,borderRadius:8,background:cat.color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>{cat.icon}</div>
              <div style={{flex:1,fontSize:13,fontWeight:600,color:th.text}}>{cat.label}</div>
              <div style={{width:8,height:8,borderRadius:'50%',background:cat.color,flexShrink:0}}/>
              <div style={{display:'flex',gap:5}}>
                <button onClick={()=>startEdit(cat)} style={{border:`1px solid ${th.border}`,borderRadius:7,padding:'4px 8px',cursor:'pointer',background:th.hoverBg,color:th.text2,fontSize:11}}>✏️</button>
                <button onClick={()=>deleteCat(cat.id)} style={{border:'1px solid #fecdd3',borderRadius:7,padding:'4px 8px',cursor:'pointer',background:'#fff5f5',color:'#ef4444',fontSize:11}}>✕</button>
              </div>
            </div>
          ))}

          <button onClick={startNew} style={{width:'100%',border:`1.5px dashed ${th.border}`,borderRadius:11,padding:'10px',cursor:'pointer',background:'transparent',color:'#4f7cff',fontFamily:'inherit',fontSize:13,fontWeight:600,marginTop:4}}>
            + Nueva categoría
          </button>
        </div>

        <div style={{padding:'12px 22px',borderTop:`1px solid ${th.border}`,display:'flex',justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{border:'none',borderRadius:10,padding:'9px 22px',cursor:'pointer',background:'#4f7cff',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>Listo</button>
        </div>
      </div>
    </div>
  )
}
