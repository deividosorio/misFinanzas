// src/Auth.jsx — Login / Registro (sin opción de familia, eso va en AppRoot)
import { useState } from 'react'
import { supabase } from './supabaseClient'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f0f4ff;color:#1a1d2e;font-family:'DM Sans',sans-serif}
.inp{background:#fff;border:1.5px solid #e2e6f0;border-radius:11px;padding:11px 14px;color:#1a1d2e;font-family:inherit;font-size:14px;width:100%;outline:none;transition:border .15s}
.inp:focus{border-color:#4f7cff;box-shadow:0 0 0 3px #4f7cff18}
.btn{border:none;border-radius:11px;padding:12px 18px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;transition:all .15s;width:100%}
.bp{background:#4f7cff;color:#fff;box-shadow:0 4px 14px #4f7cff33}.bp:hover{background:#3b6bee;transform:translateY(-1px)}
.bg{background:#fff;color:#6b7280;border:1.5px solid #e2e6f0}.bg:hover{background:#f8f9ff;color:#1a1d2e}
.lbl{font-size:12px;color:#6b7280;margin-bottom:5px;font-weight:500}
.err{background:#fff0f0;border:1.5px solid #fecdd3;color:#e11d48;border-radius:10px;padding:10px 14px;font-size:13px}
.ok{background:#f0fdf4;border:1.5px solid #bbf7d0;color:#16a34a;border-radius:10px;padding:10px 14px;font-size:13px}
.tab-btn{flex:1;border:none;border-radius:9px;padding:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .15s}
`

export default function Auth() {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Completa email y contraseña'); return }
    setLoading(true); setError(''); setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!email || !password || !name) { setError('Completa todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    })
    if (error) setError(error.message)
    else setMsg('¡Cuenta creada! Revisa tu email para confirmar antes de entrar.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f0f4ff 0%,#faf5ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{CSS}</style>
      <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 8px 40px #4f7cff14' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#4f7cff,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>💰</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg,#4f7cff,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MiFinanza
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 12, padding: 4 }}>
          <button className="tab-btn" onClick={() => { setMode('login'); setError(''); setMsg(''); }}
            style={{ background: mode === 'login' ? '#fff' : 'transparent', color: mode === 'login' ? '#4f7cff' : '#6b7280', boxShadow: mode === 'login' ? '0 2px 8px #0001' : 'none' }}>
            Entrar
          </button>
          <button className="tab-btn" onClick={() => { setMode('register'); setError(''); setMsg(''); }}
            style={{ background: mode === 'register' ? '#fff' : 'transparent', color: mode === 'register' ? '#4f7cff' : '#6b7280', boxShadow: mode === 'register' ? '0 2px 8px #0001' : 'none' }}>
            Registrarse
          </button>
        </div>

        {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}
        {msg && <div className="ok" style={{ marginBottom: 16 }}>{msg}</div>}

        {/* LOGIN */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><div className="lbl">Email</div><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="email" /></div>
            <div><div className="lbl">Contraseña</div><input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" /></div>
            <button className="btn bp" onClick={handleLogin} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Entrando...' : 'Entrar →'}
            </button>
          </div>
        )}

        {/* REGISTER */}
        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><div className="lbl">Tu nombre</div><input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Deivid" autoComplete="name" /></div>
            <div><div className="lbl">Email</div><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" /></div>
            <div><div className="lbl">Contraseña</div><input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" autoComplete="new-password" /></div>
            <button className="btn bp" onClick={handleRegister} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
          Tus datos están protegidos con cifrado de extremo a extremo
        </div>
      </div>
    </div>
  )
}
