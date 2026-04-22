// src/pages/Auth.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Pantalla de autenticación (login y registro).
//
// Se muestra cuando:
//   - Supabase está configurado (hay .env.local con claves)
//   - No hay sesión activa (usuario no ha iniciado sesión)
//
// En modo demo (sin Supabase), esta pantalla nunca aparece.
//
// FLUJO:
//   Registro:
//     1. Usuario ingresa nombre, email, contraseña
//     2. supabase.auth.signUp() crea el usuario en Auth
//     3. El trigger handle_new_user() en PostgreSQL crea automáticamente
//        el registro en la tabla profiles
//     4. Se muestra mensaje para confirmar el email
//     5. Al confirmar, puede iniciar sesión
//
//   Login:
//     1. Usuario ingresa email y contraseña
//     2. supabase.auth.signInWithPassword() devuelve la sesión
//     3. onAuthStateChange en AppContext detecta el cambio
//     4. loadProfile() carga el perfil y la familia
//     5. App muestra el Dashboard
//
// GESTIÓN DE FAMILIA:
//   Si el usuario no tiene familia asignada (family_id = null en profiles),
//   se muestra la sección de configuración de familia donde puede:
//   - Crear una nueva familia (rpc_create_family)
//   - Unirse a una existente con su código de invitación (rpc_join_family)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
    // 'login' | 'register' | 'familySetup'
    const [mode, setMode] = useState('login')

    // Campos del formulario
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [familyName, setFamilyName] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [familyMode, setFamilyMode] = useState('create') // 'create' | 'join'

    // Estados de UI
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    // ── Acciones de autenticación ─────────────────────────────────────────────

    const handleLogin = async () => {
        if (!email || !password) { setError('Completa email y contraseña'); return }
        setLoading(true); setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
        // Si tiene éxito, onAuthStateChange en AppContext detecta la sesión automáticamente
    }

    const handleRegister = async () => {
        if (!name || !email || !password) { setError('Completa todos los campos'); return }
        if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
        setLoading(true); setError('')
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: name }, // Se pasa al trigger handle_new_user()
            },
        })
        if (error) {
            setError(error.message)
        } else {
            setMessage('¡Cuenta creada! Revisa tu email para confirmar y luego inicia sesión.')
            setMode('login')
        }
        setLoading(false)
    }

    const handleCreateFamily = async () => {
        if (!familyName) { setError('Escribe un nombre para la familia'); return }
        setLoading(true); setError('')
        try {
            // rpc_create_family: crea la familia y asigna el usuario como owner
            const { data, error } = await supabase.rpc('rpc_create_family', {
                p_name: familyName,
                p_currency: 'CAD',
                p_locale: 'es',
            })
            if (error) throw error
            setMessage(`¡Familia "${familyName}" creada! Recarga la página para continuar.`)
            setTimeout(() => window.location.reload(), 1500)
        } catch (e) {
            setError(e.message)
        }
        setLoading(false)
    }

    const handleJoinFamily = async () => {
        if (!inviteCode.trim()) { setError('Ingresa el código de invitación'); return }
        setLoading(true); setError('')
        try {
            // rpc_join_family: busca la familia por invite_code y agrega al usuario
            const { data, error } = await supabase.rpc('rpc_join_family', {
                p_invite_code: inviteCode.trim(),
            })
            if (error) throw error
            setMessage(`¡Te uniste a la familia! Recarga para continuar.`)
            setTimeout(() => window.location.reload(), 1500)
        } catch (e) {
            setError(e.message || 'Código no válido')
        }
        setLoading(false)
    }

    // ── Estilos inline (evitar dependencia de clases CSS externas) ────────────
    const INPUT_STYLE = {
        background: '#080a10',
        border: '1px solid #1a2030',
        borderRadius: 10,
        padding: '10px 14px',
        color: '#eef0ff',
        fontFamily: 'inherit',
        fontSize: 14,
        width: '100%',
        outline: 'none',
    }

    const BTN_PRIMARY = {
        border: 'none',
        borderRadius: 10,
        padding: '11px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        width: '100%',
        background: '#4f7cff',
        color: '#fff',
        opacity: loading ? 0.7 : 1,
        transition: 'all .15s',
    }

    const BTN_GHOST = {
        ...BTN_PRIMARY,
        background: 'transparent',
        color: '#5a6180',
        border: '1px solid #1a2030',
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#080a10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: "'Instrument Sans', sans-serif",
        }}>
            <div style={{
                background: '#111520',
                border: '1px solid #1a2030',
                borderRadius: 20,
                padding: 32,
                width: '100%',
                maxWidth: 380,
            }}>

                
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                        fontSize: 26,
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #4f7cff, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        MiFinanza
                    </div>
                    <div style={{ color: '#5a6180', fontSize: 13, marginTop: 4 }}>
                        {mode === 'login' ? 'Inicia sesión en tu cuenta' :
                            mode === 'register' ? 'Crea tu cuenta' :
                                'Configura tu grupo familiar'}
                    </div>
                </div>

                {/* Mensajes de error y éxito */}
                {error && (
                    <div style={{
                        background: '#ff6b6b14',
                        border: '1px solid #ff6b6b22',
                        borderRadius: 8,
                        padding: '10px 14px',
                        color: '#ff6b6b',
                        fontSize: 13,
                        marginBottom: 14,
                    }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{
                        background: '#2dd4a014',
                        border: '1px solid #2dd4a022',
                        borderRadius: 8,
                        padding: '10px 14px',
                        color: '#2dd4a0',
                        fontSize: 13,
                        marginBottom: 14,
                    }}>
                        {message}
                    </div>
                )}

                {/* ── FORMULARIO DE LOGIN ── */}
                {mode === 'login' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            style={INPUT_STYLE}
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                        <input
                            style={INPUT_STYLE}
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                        <button style={BTN_PRIMARY} onClick={handleLogin} disabled={loading}>
                            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                        </button>
                        <button
                            style={BTN_GHOST}
                            onClick={() => { setMode('register'); setError(''); setMessage('') }}
                        >
                            ¿No tienes cuenta? Regístrate
                        </button>
                        <button
                            style={{ ...BTN_GHOST, fontSize: 12, padding: '8px', marginTop: 4 }}
                            onClick={() => { setMode('familySetup'); setError(''); setMessage('') }}
                        >
                            Configurar grupo familiar →
                        </button>
                    </div>
                )}

                {/* ── FORMULARIO DE REGISTRO ── */}
                {mode === 'register' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                            style={INPUT_STYLE}
                            placeholder="Tu nombre"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <input
                            style={INPUT_STYLE}
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            style={INPUT_STYLE}
                            type="password"
                            placeholder="Contraseña (mínimo 6 caracteres)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                        />
                        <button style={BTN_PRIMARY} onClick={handleRegister} disabled={loading}>
                            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>
                        <button
                            style={BTN_GHOST}
                            onClick={() => { setMode('login'); setError(''); setMessage('') }}
                        >
                            Ya tengo cuenta — Iniciar sesión
                        </button>
                    </div>
                )}

                {/* ── CONFIGURACIÓN DE FAMILIA ── */}
                {mode === 'familySetup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Toggle crear / unirse */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[
                                { id: 'create', label: 'Crear familia' },
                                { id: 'join', label: 'Unirme a una' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => { setFamilyMode(opt.id); setError('') }}
                                    style={{
                                        ...BTN_GHOST,
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: 12,
                                        background: familyMode === opt.id ? '#4f7cff' : 'transparent',
                                        color: familyMode === opt.id ? '#fff' : '#5a6180',
                                        border: familyMode === opt.id ? 'none' : '1px solid #1a2030',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {familyMode === 'create' ? (
                            <>
                                <input
                                    style={INPUT_STYLE}
                                    placeholder="Nombre de la familia (ej: Familia García)"
                                    value={familyName}
                                    onChange={e => setFamilyName(e.target.value)}
                                />
                                <button style={BTN_PRIMARY} onClick={handleCreateFamily} disabled={loading}>
                                    {loading ? 'Creando...' : 'Crear familia'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <input
                                        style={INPUT_STYLE}
                                        placeholder="Código de invitación"
                                        value={inviteCode}
                                        onChange={e => setInviteCode(e.target.value)}
                                    />
                                    <div style={{ fontSize: 11, color: '#5a6180', marginTop: 4 }}>
                                        El administrador de la familia te comparte este código
                                    </div>
                                </div>
                                <button style={BTN_PRIMARY} onClick={handleJoinFamily} disabled={loading}>
                                    {loading ? 'Uniéndome...' : 'Unirme a la familia'}
                                </button>
                            </>
                        )}

                        <button
                            style={{ ...BTN_GHOST, fontSize: 12, padding: '8px' }}
                            onClick={() => { setMode('login'); setError(''); setMessage('') }}
                        >
                            ← Volver al inicio de sesión
                        </button>
                    </div>
                )}
            </div>
        </div>


    )
}