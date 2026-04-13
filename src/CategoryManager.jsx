// src/CategoryManager.jsx — Crear, editar y eliminar categorías personalizadas
import { useState } from 'react'
import { ColorPicker } from './ColorPicker'

const DEFAULT_CATS = {
  income: [
    { id:'salary', label:'Salario', icon:'💼', color:'#10b981' },
    { id:'freelance', label:'Freelance', icon:'💻', color:'#34d399' },
    { id:'investment', label:'Inversión', icon:'📈', color:'#6ee7b7' },
    { id:'other_income', label:'Otro ingreso', icon:'💰', color:'#a7f3d0' },
  ],
  expense: [
    { id:'food', label:'Alimentación', icon:'🛒', color:'#f43f5e' },
    { id:'housing', label:'Vivienda', icon:'🏠', color:'#f97316' },
    { id:'transport', label:'Transporte', icon:'🚗', color:'#f59e0b' },
    { id:'health', label:'Salud', icon:'🏥', color:'#a855f7' },
    { id:'entertainment', label:'Entretenimiento', icon:'🎬', color:'#6366f1' },
    { id:'education', label:'Educación', icon:'📚', color:'#06b6d4' },
    { id:'clothing', label:'Ropa', icon:'👕', color:'#ec4899' },
    { id:'utilities', label:'Servicios', icon:'💡', color:'#38bdf8' },
    { id:'insurance', label:'Seguros', icon:'🛡️', color:'#818cf8' },
    { id:'mortgage', label:'Hipoteca', icon:'🏦', color:'#fb923c' },
    { id:'car', label:'Auto', icon:'🚘', color:'#facc15' },
    { id:'other_expense', label:'Otro gasto', icon:'📦', color:'#94a3b8' },
  ],
  saving: [
    { id:'emergency', label:'Emergencias', icon:'🚨', color:'#fbbf24' },
    { id:'vacation', label:'Vacaciones', icon:'✈️', color:'#22d3ee' },
    { id:'retirement', label:'Retiro', icon:'🌅', color:'#c084fc' },
    { id:'goal', label:'Meta', icon:'🎯', color:'#4ade80' },
  ],
}

const ICONS = ['💼','💻','📈','💰','🛒','🏠','🚗','🏥','🎬','📚','👕','💡','🛡️','🏦','🚘','📦','🎯','✈️','🌅','🚨','🍔','☕','🎮','🏋️','👶','🐾','🎵','📱','🏪','⚡','🌊','🎨','🏃','💊','🔧','🎁','💒','🌱','🍷','🎓']

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

export function CategoryManager({ cats, setCats, th, onClose }) {
  const [activeType, setActiveType] = useState('expense')
  const [editing, setEditing] = useState(null) // null | { id, label, icon, color, isNew, type }
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [newColor, setNewColor] = useState('#94a3b8')
  const [showIconPicker, setShowIconPicker] = useState(false)

  const types = ['income', 'expense', 'saving']
  const typeLabels = { income:'Ingresos', expense:'Gastos', saving:'Ahorros' }

  const startEdit = (cat, type) => {
    setEditing({ ...cat, type })
    setNewLabel(cat.label)
    setNewIcon(cat.icon)
    setNewColor(cat.color)
    setShowIconPicker(false)
  }

  const startNew = () => {
    setEditing({ id: '', label:'', icon:'📦', color:'#94a3b8', isNew:true, type: activeType })
    setNewLabel('')
    setNewIcon('📦')
    setNewColor('#94a3b8')
    setShowIconPicker(false)
  }

  const saveEdit = () => {
    if (!newLabel.trim()) return
    const updated = { ...cats }
    if (editing.isNew) {
      const id = 'custom_' + Date.now()
      updated[editing.type] = [...(updated[editing.type]||[]), { id, label: newLabel.trim(), icon: newIcon, color: newColor }]
    } else {
      updated[editing.type] = updated[editing.type].map(c =>
        c.id === editing.id ? { ...c, label: newLabel.trim(), icon: newIcon, color: newColor } : c
      )
    }
    setCats(updated)
    setEditing(null)
  }

  const deleteCat = (id, type) => {
    const updated = { ...cats, [type]: cats[type].filter(c => c.id !== id) }
    setCats(updated)
  }

  const s = {
    overlay: { position:'fixed', inset:0, background:'#00000066', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' },
    modal: { background:th.card, border:`1px solid ${th.cardBorder}`, borderRadius:22, padding:0, width:'100%', maxWidth:520, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px #00000030', overflow:'hidden' },
    header: { padding:'20px 24px 16px', borderBottom:`1px solid ${th.border}` },
    body: { flex:1, overflowY:'auto', padding:'16px 24px' },
    footer: { padding:'14px 24px', borderTop:`1px solid ${th.border}`, display:'flex', justifyContent:'flex-end' },
    inp: { background:th.input, border:`1.5px solid ${th.inputBorder}`, borderRadius:10, padding:'9px 13px', color:th.text, fontFamily:'inherit', fontSize:13, width:'100%', outline:'none' },
    catRow: { display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:11, marginBottom:5, border:`1px solid ${th.border}`, background:th.card },
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:th.text, marginBottom:12 }}>🏷️ Categorías</div>
          {/* Type tabs */}
          <div style={{ display:'flex', gap:4, background:th.hoverBg||'#f3f4f6', borderRadius:10, padding:3 }}>
            {types.map(tp => (
              <button key={tp} onClick={() => setActiveType(tp)}
                style={{ flex:1, border:'none', borderRadius:8, padding:'7px 0', cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:activeType===tp?700:500, background:activeType===tp?th.card:'transparent', color:activeType===tp?'#4f7cff':th.text3, boxShadow:activeType===tp?'0 1px 3px #0001':'none', transition:'all .15s' }}>
                {typeLabels[tp]}
              </button>
            ))}
          </div>
        </div>

        <div style={s.body}>
          {/* Edit form */}
          {editing && (
            <div style={{ background:th.subcard, border:`1.5px solid #4f7cff44`, borderRadius:14, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#4f7cff', marginBottom:12 }}>
                {editing.isNew ? '+ Nueva categoría' : `✏️ Editar: ${editing.label}`}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:th.text3, marginBottom:4, fontWeight:500 }}>NOMBRE</div>
                  <input style={s.inp} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Nombre de la categoría" autoFocus />
                </div>
                <div>
                  <div style={{ fontSize:11, color:th.text3, marginBottom:6, fontWeight:500 }}>ÍCONO</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={() => setShowIconPicker(v => !v)} style={{ width:40, height:40, borderRadius:10, background:th.hoverBg, border:`1.5px solid ${th.border}`, fontSize:20, cursor:'pointer' }}>{newIcon}</button>
                    {showIconPicker && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, flex:1, maxHeight:80, overflowY:'auto' }}>
                        {ICONS.map(ic => (
                          <button key={ic} onClick={() => { setNewIcon(ic); setShowIconPicker(false) }}
                            style={{ width:30, height:30, border:newIcon===ic?'2px solid #4f7cff':'1px solid transparent', borderRadius:7, background:newIcon===ic?'#eff3ff':th.hoverBg, cursor:'pointer', fontSize:16 }}>{ic}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:th.text3, marginBottom:6, fontWeight:500 }}>COLOR</div>
                  <ColorPicker value={newColor} onChange={setNewColor} th={th} />
                </div>
                {/* Preview */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:newColor+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{newIcon}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:th.text }}>{newLabel||'Vista previa'}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setEditing(null)} style={{ flex:1, border:`1.5px solid ${th.border}`, borderRadius:9, padding:'8px', cursor:'pointer', background:th.btnGhost, color:th.text2, fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Cancelar</button>
                  <button onClick={saveEdit} style={{ flex:2, border:'none', borderRadius:9, padding:'8px', cursor:'pointer', background:'#4f7cff', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          {/* Category list */}
          {(cats[activeType]||[]).map(cat => (
            <div key={cat.id} style={s.catRow}>
              <div style={{ width:32, height:32, borderRadius:9, background:cat.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{cat.icon}</div>
              <div style={{ flex:1, fontSize:13, fontWeight:600, color:th.text }}>{cat.label}</div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => startEdit(cat, activeType)} style={{ border:`1px solid ${th.border}`, borderRadius:7, padding:'4px 10px', cursor:'pointer', background:th.hoverBg, color:th.text2, fontFamily:'inherit', fontSize:12, fontWeight:600 }}>✏️</button>
                <button onClick={() => deleteCat(cat.id, activeType)} style={{ border:'1px solid #fecdd3', borderRadius:7, padding:'4px 10px', cursor:'pointer', background:'#fff5f5', color:'#ef4444', fontFamily:'inherit', fontSize:12, fontWeight:600 }}>✕</button>
              </div>
            </div>
          ))}

          <button onClick={startNew} style={{ width:'100%', border:`1.5px dashed ${th.border}`, borderRadius:11, padding:'10px', cursor:'pointer', background:'transparent', color:'#4f7cff', fontFamily:'inherit', fontSize:13, fontWeight:600, marginTop:4 }}>
            + Nueva categoría
          </button>
        </div>

        <div style={s.footer}>
          <button onClick={onClose} style={{ border:'none', borderRadius:10, padding:'9px 22px', cursor:'pointer', background:'#4f7cff', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Listo</button>
        </div>
      </div>
    </div>
  )
}
