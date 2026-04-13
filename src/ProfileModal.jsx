// src/ProfileModal.jsx — Perfil de usuario con nombre, email, tema
import { useState } from 'react'
import { supabase } from './supabaseClient'

export function ProfileModal({ session, profile, dark, onToggleDark, onClose, th }) {
  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const save = async () => {
    setLoading(true); setMsg(''); setErr('')
    try {
      // Update profile name
      if (name !== profile?.name) {
        await supabase.from('profiles').update({ name }).eq('id', session.user.id)
      }
      // Update email
      if (email !== session.user.email) {
        const { error } = await supabase.auth.updateUser({ email })
        if (error) throw error
      }
      // Update password
      if (newPw) {
        if (!currentPw) throw new Error('Ingresa tu contraseña actual para cambiarla')
        const { error } = await supabase.auth.updateUser({ password: newPw })
        if (error) throw error
      }
      setMsg('✅ Perfil actualizado correctamente')
      setCurrentPw(''); setNewPw('')
    } catch(e) {
      setErr(e.message)
    }
    setLoading(false)
  }

  const s = {
    overlay: { position:'fixed', inset:0, background:'#00000066', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' },
    modal: { background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius:22, padding:28, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px #00000030' },
    title: { fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color: th.text, marginBottom:18 },
    lbl: { fontSize:11, color: th.text3, marginBottom:5, fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px', display:'block' },
    inp: { background: th.input, border: `1.5px solid ${th.inputBorder}`, borderRadius:10, padding:'9px 13px', color: th.text, fontFamily:'inherit', fontSize:13, width:'100%', outline:'none' },
    divider: { height:1, background: th.border, margin:'16px 0' },
    row: { display:'flex', flexDirection:'column', gap:5 },
  }

  const initials = (name || session?.user?.email || '?')[0].toUpperCase()

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.title}>👤 Mi perfil</div>

        {/* Avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#4f7cff,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800 }}>{initials}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color: th.text }}>{profile?.name || 'Usuario'}</div>
            <div style={{ fontSize:12, color: th.text3 }}>{session?.user?.email}</div>
          </div>
        </div>

        {msg && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:14 }}>{msg}</div>}
        {err && <div style={{ background:'#fff5f5', border:'1px solid #fecdd3', color:'#ef4444', borderRadius:8, padding:'9px 13px', fontSize:13, marginBottom:14 }}>{err}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div style={s.row}>
            <label style={s.lbl}>Nombre</label>
            <input style={s.inp} value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div style={s.row}>
            <label style={s.lbl}>Email</label>
            <input style={s.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div style={s.divider}/>

          <div style={{ fontSize:12, fontWeight:600, color: th.text2, marginBottom:2 }}>Cambiar contraseña (opcional)</div>
          <div style={s.row}>
            <label style={s.lbl}>Contraseña nueva</label>
            <input style={s.inp} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nueva contraseña" />
          </div>

          <div style={s.divider}/>

          {/* Theme toggle */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background: th.subcard, borderRadius:12, border:`1px solid ${th.border}` }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: th.text }}>Tema de la interfaz</div>
              <div style={{ fontSize:11, color: th.text3, marginTop:2 }}>{dark ? '🌙 Modo oscuro activado' : '☀️ Modo claro activado'}</div>
            </div>
            <button onClick={onToggleDark} style={{ border:'none', borderRadius:99, width:52, height:28, cursor:'pointer', background: dark ? '#4f7cff' : '#e2e6f0', position:'relative', transition:'background .2s' }}>
              <div style={{ position:'absolute', top:3, left: dark ? 26 : 3, width:22, height:22, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px #0003' }}/>
            </button>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button onClick={onClose} style={{ flex:1, border:`1.5px solid ${th.btnGhostBorder}`, borderRadius:10, padding:'9px 16px', cursor:'pointer', background: th.btnGhost, color: th.text2, fontFamily:'inherit', fontSize:13, fontWeight:600 }}>Cancelar</button>
            <button onClick={save} disabled={loading} style={{ flex:2, border:'none', borderRadius:10, padding:'9px 16px', cursor:'pointer', background:'#4f7cff', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:600 }}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
