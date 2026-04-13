// src/AppRoot.jsx
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import App from './App'

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0b0d14;color:#e8eaf0;font-family:'DM Sans',sans-serif}
.inp{background:#0b0d14;border:1px solid #1e2235;border-radius:10px;padding:10px 14px;color:#e8eaf0;font-family:inherit;font-size:14px;width:100%;outline:none}
.inp:focus{border-color:#4f7cff}
.btn{border:none;border-radius:10px;padding:11px 18px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;transition:all .15s;width:100%}
.bp{background:#4f7cff;color:#fff}.bp:hover{background:#3b6bee}
.bg{background:transparent;color:#8b90a8;border:1px solid #1e2235}.bg:hover{background:#1e2235;color:#e8eaf0}
.lbl{font-size:12px;color:#8b90a8;margin-bottom:5px;display:block}
.err{background:#ff4f4f14;border:1px solid #ff4f4f33;color:#ff6b6b;border-radius:8px;padding:10px 14px;font-size:13px}
.ok{background:#34d39914;border:1px solid #34d39933;color:#34d399;border-radius:8px;padding:10px 14px;font-size:13px}
.tab-btn{flex:1;border:none;border-radius:9px;padding:9px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:all .15s}
`

function FamilySetup({ session, onDone, onLogout }) {
  const [mode, setMode] = useState('create')
  const [familyName, setFamilyName] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const handleCreate = async () => {
    if (!familyName.trim()) { setError('Escribe un nombre para la familia'); return }
    setLoading(true); setError('')

    const { data: family, error: fe } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), owner_id: session.user.id })
      .select()
      .single()

    if (fe) { setError(fe.message); setLoading(false); return }

    const { error: pe } = await supabase
      .from('profiles')
      .update({ family_id: family.id })
      .eq('id', session.user.id)

    if (pe) { setError(pe.message); setLoading(false); return }

    setMsg('✅ Familia "' + family.name + '" creada!\n\nID para invitar a tu esposa:\n' + family.id)
    setLoading(false)
    setTimeout(() => onDone(), 3000)
  }

  const handleJoin = async () => {
    if (!familyCode.trim()) { setError('Pega el código de familia'); return }
    setLoading(true); setError('')

    const { data: family, error: fe } = await supabase
      .from('families')
      .select('id, name')
      .eq('id', familyCode.trim())
      .single()

    if (fe || !family) { setError('Código no encontrado. Verifica que sea correcto.'); setLoading(false); return }

    const { error: pe } = await supabase
      .from('profiles')
      .update({ family_id: family.id })
      .eq('id', session.user.id)

    if (pe) { setError(pe.message); setLoading(false); return }

    setMsg('✅ Te uniste a "' + family.name + '"')
    setLoading(false)
    setTimeout(() => onDone(), 1500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{CSS}</style>
      <div style={{ background: '#13161f', border: '1px solid #1e2235', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#4f7cff,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Configura tu familia
          </div>
          <div style={{ fontSize: 13, color: '#8b90a8', marginTop: 4 }}>
            Sesión: <strong style={{ color: '#e8eaf0' }}>{session.user.email}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#0b0d14', borderRadius: 10, padding: 4 }}>
          <button className="tab-btn" onClick={() => { setMode('create'); setError(''); setMsg(''); }}
            style={{ background: mode === 'create' ? '#4f7cff' : 'transparent', color: mode === 'create' ? '#fff' : '#8b90a8' }}>
            Crear familia
          </button>
          <button className="tab-btn" onClick={() => { setMode('join'); setError(''); setMsg(''); }}
            style={{ background: mode === 'join' ? '#4f7cff' : 'transparent', color: mode === 'join' ? '#fff' : '#8b90a8' }}>
            Unirme a una
          </button>
        </div>

        {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}
        {msg && <div className="ok" style={{ marginBottom: 14, whiteSpace: 'pre-line', wordBreak: 'break-all', fontSize: 12 }}>{msg}</div>}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="lbl">Nombre de la familia</label>
              <input className="inp" value={familyName} onChange={e => setFamilyName(e.target.value)}
                placeholder="Familia García" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <button className="btn bp" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creando...' : 'Crear familia →'}
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="lbl">Código UUID de la familia</label>
              <input className="inp" value={familyCode} onChange={e => setFamilyCode(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
              <div style={{ fontSize: 11, color: '#8b90a8', marginTop: 5 }}>
                El administrador de la familia te comparte este código
              </div>
            </div>
            <button className="btn bp" onClick={handleJoin} disabled={loading}>
              {loading ? 'Uniéndome...' : 'Unirme →'}
            </button>
          </div>
        )}

        <button className="btn bg" style={{ marginTop: 12 }} onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function AppRoot() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const handleFamilyDone = () => {
    if (session) loadProfile(session.user.id)
  }

  // Cargando sesión
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8b90a8', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Cargando...</div>
      </div>
    )
  }

  // Sin sesión
  if (!session) return <Auth />

  // Cargando perfil
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8b90a8', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Cargando perfil...</div>
      </div>
    )
  }

  // Sin familia
  if (!profile.family_id) {
    return <FamilySetup session={session} onDone={handleFamilyDone} onLogout={handleLogout} />
  }

  // App principal
  return (
    <App
      session={session}
      profile={profile}
      familyId={profile.family_id}
      onLogout={handleLogout}
    />
  )
}
