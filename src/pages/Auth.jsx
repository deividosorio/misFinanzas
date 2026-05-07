// src/pages/Auth.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Maneja todos los estados de autenticación y onboarding.
//
// FLUJOS POSIBLES (máquina de estados):
//
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │                    MÁQUINA DE ESTADOS                               │
//   │                                                                     │
//   │   'login'          → Formulario de inicio de sesión                │
//   │   'register'       → Formulario de registro (nuevo usuario)         │
//   │   'family_setup'   → Crear familia O unirse con código              │
//   │   'pending'        → Esperando aprobación del admin                 │
//   │   'email_sent'     → Confirmar email (después de registro)          │
//   │   'reset_password' → Cambiar contraseña (desde link de email)       │
//   └─────────────────────────────────────────────────────────────────────┘
//
// QUIÉN VE CADA PANTALLA:
//
//   login         → Usuario no autenticado
//   register      → Usuario nuevo (sin cuenta)
//   family_setup  → Usuario autenticado PERO sin family_id asignado
//                   Esto ocurre justo después del primer registro
//   pending       → Usuario autenticado, con familia, pero status='pending'
//                   Está esperando que el admin lo apruebe
//   email_sent    → Después de registrarse (Supabase requiere confirmar email)
//
// IMPORTANTE — TRIGGER DE BASE DE DATOS:
//   Cuando el usuario hace signUp(), el trigger handle_new_user() en PostgreSQL
//   crea automáticamente un registro en la tabla profiles.
//   Ese perfil empieza sin family_id = null.
//   La asignación de familia ocurre después via RPC.
//
// ROLES Y PERMISOS:
//   owner  → El primero en crear la familia. Tiene control total.
//            SOLO el owner puede cambiar roles de otros miembros.
//   admin  → Puede aprobar/suspender miembros y crear cuentas.
//            Asignado por el owner desde Family.jsx.
//   member → Puede registrar transacciones, ver todo.
//            No puede crear/editar cuentas ni gestionar miembros.
//   kid    → Ve la interfaz gamificada. No puede crear transacciones.
//            Creado por el owner/admin directamente (sin email).
//
// FLUJO DETALLADO PARA DEIVID (primer usuario):
//   1. Abre la app → ve pantalla 'login'
//   2. Hace clic en "¿No tienes cuenta?" → 'register'
//   3. Ingresa nombre, email, contraseña → signUp()
//   4. Supabase envía email de confirmación → pantalla 'email_sent'
//   5. Confirma el email → vuelve a la app
//   6. App detecta: sesión OK, pero profile.family_id = null
//   7. Muestra pantalla 'family_setup' automáticamente
//   8. Deivid escribe "Familia García" → rpc_create_family()
//   9. El RPC: crea la familia Y asigna a Deivid como 'owner'
//  10. App carga y muestra el Dashboard ✓
//
// FLUJO PARA Martha (segunda usuaria):
//   1. Deivid le comparte el código: "garcia2025"
//   2. Martha abre la app → 'login' → "¿No tienes cuenta?" → 'register'
//   3. Se registra con su email → 'email_sent'
//   4. Confirma email → 'family_setup' (family_id = null)
//   5. Elige "Unirme con código" → ingresa "garcia2025" → rpc_join_family()
//   6. El RPC: vincula a Martha con status='pending'
//   7. Martha ve pantalla 'pending' (no puede usar la app todavía)
//   8. Deivid ve badge ⏳ en el Header
//   9. Deivid va a Familia → Miembros → Aprobar Martha
//  10. Martha refresca → ve el Dashboard ✓
// 
// FIX BUG LOGIN MÓVIL:
//   PROBLEMA: signInWithPassword() resuelve sin error, pero en móvil Safari/
//   Chrome el listener onAuthStateChange tarda o no dispara mientras el
//   componente Auth sigue montado. El estado loading quedaba en true
//   indefinidamente → "Iniciando sesión..." sin avanzar.
//
//   SOLUCIÓN: Después de signInWithPassword exitoso, llamar directamente
//   a supabase.auth.getSession() para obtener la sesión y llamar
//   a reloadProfile() manualmente. No depender solo de onAuthStateChange.
//
// PANTALLAS:
//   LoginScreen       → email + contraseña
//   RegisterScreen    → nombre + email + contraseña
//   EmailSentScreen   → después de registro (si confirmación activa)
//   ForgotScreen      → solicitar reset de contraseña
//   ResetPasswordScreen → nueva contraseña desde link de email
//
// EXPORTACIONES ADICIONALES:
//   FamilySetupScreen → crear familia o unirse con código (App.jsx la usa)
//   PendingScreen     → esperando aprobación del admin (App.jsx la usa)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

// ── Estilos compartidos ───────────────────────────────────────────────────────
const S = {
    screen: {
        minHeight: '100vh', background: '#080a10',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: "'Instrument Sans',sans-serif",
    },
    card: {
        background: '#111520', border: '1px solid #1a2030', borderRadius: 20,
        padding: 32, width: '100%', maxWidth: 380,
        boxShadow: '0 4px 40px #00000066',
    },
    input: {
        background: '#080a10', border: '1px solid #1a2030', borderRadius: 10,
        padding: '10px 14px', color: '#eef0ff', fontFamily: 'inherit',
        fontSize: 13, width: '100%', outline: 'none', transition: 'border .15s',
        boxSizing: 'border-box',
    },
    btnPrimary: {
        border: 'none', borderRadius: 10, padding: '11px', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 14, fontWeight: 600, width: '100%',
        background: '#4f7cff', color: '#fff', transition: 'opacity .15s',
    },
    btnGhost: {
        border: '1px solid #1a2030', borderRadius: 10, padding: '10px',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        width: '100%', background: 'transparent', color: '#5a6180', transition: 'all .15s',
    },
    errorBox: {
        background: '#ff6b6b14', border: '1px solid #ff6b6b33', borderRadius: 8,
        padding: '9px 12px', color: '#ff6b6b', fontSize: 12, lineHeight: 1.5,
    },
    infoBox: {
        background: '#4f7cff14', border: '1px solid #4f7cff33', borderRadius: 8,
        padding: '9px 12px', color: '#4f7cff', fontSize: 12, lineHeight: 1.5,
    },
    successBox: {
        background: '#2dd4a014', border: '1px solid #2dd4a033', borderRadius: 8,
        padding: '9px 12px', color: '#2dd4a0', fontSize: 12, lineHeight: 1.5,
    },
    label: {
        fontSize: 10, color: '#5a6180', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: 4, display: 'block',
    },
}

function Logo() {
    return (
        <div style={{
            fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: 26, fontWeight: 900,
            background: 'linear-gradient(135deg,#4f7cff,#a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textAlign: 'center', marginBottom: 4, userSelect: 'none',
        }}>
            MiFinanza
        </div>
    )
}

function FieldInput({ label, type = 'text', value, onChange, placeholder, onKeyDown, autoComplete }) {
    const [focused, setFocused] = useState(false)
    return (
        <div>
            {label && <label style={S.label}>{label}</label>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                onKeyDown={onKeyDown}
                autoComplete={autoComplete}
                style={{ ...S.input, borderColor: focused ? '#4f7cff' : '#1a2030' }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </div>
    )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Auth() {
    const isPasswordReset = typeof window !== 'undefined' &&
        window.location.hash.includes('type=recovery')

    const [screen, setScreen] = useState(isPasswordReset ? 'reset' : 'login')

    return (
        <div style={S.screen}>
            {screen === 'login' && <LoginScreen onNavigate={setScreen} />}
            {screen === 'register' && <RegisterScreen onNavigate={setScreen} />}
            {screen === 'sent' && <EmailSentScreen onNavigate={setScreen} />}
            {screen === 'forgot' && <ForgotScreen onNavigate={setScreen} />}
            {screen === 'reset' && <ResetPasswordScreen onNavigate={setScreen} />}
        </div>
    )
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
function LoginScreen({ onNavigate }) {
    const { reloadProfile } = useApp()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        if (!email.trim()) { setError('Escribe tu email'); return }
        if (!password) { setError('Escribe tu contraseña'); return }

        setLoading(true); setError('')

        try {
            console.log('[MiFinanza] Auth LoginScreen signInWithPassword:', email  ? email.trim() : 'NO EMAIL') 
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            console.log('[MiFinanza] signInWithPassword result:', { data, signInError })
            if (signInError) {
                if (signInError.message.includes('Invalid login') ||
                    signInError.message.includes('invalid_credentials')) {
                    setError('Email o contraseña incorrectos')
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError('Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
                } else if (signInError.message.includes('Too many requests')) {
                    setError('Demasiados intentos. Espera unos minutos.')
                } else {
                    setError(signInError.message)
                }
                return
            }

            // FIX LOGIN MÓVIL:
            // No depender de onAuthStateChange — llamar reloadProfile() directamente
            // después de un signIn exitoso. Esto funciona en todos los navegadores.
            if (data?.session?.user || data?.user) {
                await reloadProfile()
                // reloadProfile() llama a resolveProfile() que actualiza onboardingState
            }
        } catch (err) {
            console.error('[MiFinanza] handleLogin error:', err)
            setError('Error inesperado. Intenta de nuevo.')
        }finally {  
            setLoading(false)  // Asegurar que el estado de carga se resuelva siempre
        }
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={{ color: '#5a6180', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                Inicia sesión en tu cuenta
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <div style={S.errorBox}>{error}</div>}

                <FieldInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    autoComplete="email"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ ...S.label, marginBottom: 0 }}>Contraseña</label>
                        <button onClick={() => onNavigate('forgot')} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#4f7cff', fontSize: 11, fontFamily: 'inherit',
                        }}>
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                    <FieldInput
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Tu contraseña"
                        autoComplete="current-password"
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                <button
                    style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2a3050' }}>
                    <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
                    <span style={{ fontSize: 11 }}>o</span>
                    <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
                </div>

                <button
                    style={S.btnGhost}
                    onClick={() => onNavigate('register')}
                    onMouseEnter={e => e.currentTarget.style.color = '#eef0ff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a6180'}
                >
                    ¿No tienes cuenta? Regístrate gratis
                </button>
            </div>
        </div>
    )
}

// ── RegisterScreen ────────────────────────────────────────────────────────────
function RegisterScreen({ onNavigate }) {
    const { reloadProfile } = useApp()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRegister = async () => {
        if (!name.trim()) { setError('Escribe tu nombre'); return }
        if (!email.trim()) { setError('Escribe tu email'); return }
        if (!password) { setError('Escribe una contraseña'); return }
        if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return }

        setLoading(true); setError('')

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: { display_name: name.trim(), lang: 'es' },
                    emailRedirectTo: window.location.origin,
                },
            })

            if (signUpError) {
                setLoading(false)
                if (signUpError.message.includes('already registered')) {
                    setError('Este email ya tiene una cuenta. Intenta iniciar sesión.')
                } else {
                    setError(signUpError.message)
                }
                return
            }

            // Si el email ya está confirmado (confirm email desactivado en Supabase),
            // el usuario tiene sesión activa → ir directo a la app
            if (data?.session) {
                await reloadProfile()
                setLoading(false)
                return
            }

            // Si se requiere confirmación de email → mostrar pantalla de espera
            setLoading(false)
            onNavigate('sent')
        } catch (err) {
            console.error('[MiFinanza] handleRegister error:', err)
            setError('Error inesperado. Intenta de nuevo.')
            setLoading(false)
        }
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={{ color: '#5a6180', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                Crea tu cuenta — es gratis
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {error && <div style={S.errorBox}>{error}</div>}

                <FieldInput label="Tu nombre" value={name} onChange={e => setName(e.target.value)} placeholder="Deivid García" autoComplete="name" />
                <FieldInput label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" autoComplete="email" />
                <FieldInput label="Contraseña (mínimo 8 caracteres)" type="password" value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                <FieldInput label="Confirmar contraseña" type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Repite tu contraseña"
                    autoComplete="new-password" onKeyDown={e => e.key === 'Enter' && handleRegister()} />

                {password.length > 0 && <PasswordStrength password={password} />}

                <button
                    style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    onClick={handleRegister} disabled={loading}
                >
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>

                <div style={{ fontSize: 10, color: '#2a3050', textAlign: 'center', lineHeight: 1.6 }}>
                    Al registrarte aceptas nuestros términos de uso (PIPEDA · Ley 25 Québec)
                </div>

                <button style={S.btnGhost} onClick={() => onNavigate('login')}
                    onMouseEnter={e => e.currentTarget.style.color = '#eef0ff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a6180'}>
                    Ya tengo cuenta — Iniciar sesión
                </button>
            </div>
        </div>
    )
}

// ── EmailSentScreen ───────────────────────────────────────────────────────────
function EmailSentScreen({ onNavigate }) {
    const { reloadProfile } = useApp()

    // Polling: revisar cada 3 segundos si el usuario confirmó su email
    useEffect(() => {
        if (!supabase) return
        const interval = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.email_confirmed_at) {
                clearInterval(interval)
                await reloadProfile()
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div style={S.card}>
            <Logo />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                    Confirma tu email
                </div>
                <div style={{ color: '#5a6180', fontSize: 13, lineHeight: 1.7 }}>
                    Te enviamos un enlace de confirmación. Revisa tu bandeja
                    de entrada y haz clic en el enlace para activar tu cuenta.
                </div>
            </div>

            <div style={{ ...S.infoBox, marginBottom: 16 }}>
                💡 <strong>Tip:</strong> Si no lo ves en inbox, revisa spam.
                El enlace expira en 24 horas.<br /><br />
                🔄 Esta pantalla detecta automáticamente cuando confirmas.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={S.btnPrimary} onClick={() => onNavigate('login')}>
                    Ya confirmé — Iniciar sesión
                </button>
                <button style={S.btnGhost} onClick={() => onNavigate('register')}
                    onMouseEnter={e => e.currentTarget.style.color = '#eef0ff'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a6180'}>
                    Registrarme con otro email
                </button>
            </div>
        </div>
    )
}

// ── ForgotScreen ──────────────────────────────────────────────────────────────
function ForgotScreen({ onNavigate }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSend = async () => {
        if (!email.trim()) { setError('Escribe tu email'); return }
        setLoading(true); setError('')

        if (!supabase) { setTimeout(() => setSent(true), 800); return }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin,
        })
        setLoading(false)
        if (error) { setError(error.message); return }
        setSent(true)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={{ color: '#5a6180', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                Recuperar contraseña
            </div>

            {!sent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && <div style={S.errorBox}>{error}</div>}
                    <div style={S.infoBox}>
                        Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.
                    </div>
                    <FieldInput
                        label="Email de tu cuenta"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@ejemplo.com"
                        autoComplete="email"
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                        onClick={handleSend} disabled={loading}>
                        {loading ? 'Enviando...' : '📧 Enviar enlace de recuperación'}
                    </button>
                    <button style={S.btnGhost} onClick={() => onNavigate('login')}
                        onMouseEnter={e => e.currentTarget.style.color = '#eef0ff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#5a6180'}>
                        ← Volver al inicio de sesión
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center', fontSize: 48 }}>📬</div>
                    <div style={S.successBox}>
                        ✓ Email enviado a <strong>{email}</strong>. Revisa tu bandeja
                        de entrada y sigue el enlace para crear una nueva contraseña.
                    </div>
                    <button style={S.btnPrimary} onClick={() => onNavigate('login')}>
                        Volver al inicio de sesión
                    </button>
                </div>
            )}
        </div>
    )
}

// ── ResetPasswordScreen ───────────────────────────────────────────────────────
function ResetPasswordScreen({ onNavigate }) {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleReset = async () => {
        if (!password) { setError('Escribe la nueva contraseña'); return }
        if (password.length < 8) { setError('Mínimo 8 caracteres'); return }
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return }

        setLoading(true); setError('')

        if (!supabase) { setSuccess(true); return }

        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)
        if (error) { setError(error.message); return }

        setSuccess(true)
        // Limpiar hash de la URL
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname)
        }
        setTimeout(() => onNavigate('login'), 3000)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={{ color: '#5a6180', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
                Crear nueva contraseña
            </div>

            {success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center', fontSize: 48 }}>✅</div>
                    <div style={S.successBox}>
                        ✓ Contraseña actualizada. Redirigiendo al inicio de sesión...
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && <div style={S.errorBox}>{error}</div>}
                    <FieldInput
                        label="Nueva contraseña"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                    />
                    <FieldInput
                        label="Confirmar nueva contraseña"
                        type="password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repite la contraseña"
                        autoComplete="new-password"
                        onKeyDown={e => e.key === 'Enter' && handleReset()}
                    />
                    {password.length > 0 && <PasswordStrength password={password} />}
                    <button
                        style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                        onClick={handleReset} disabled={loading}
                    >
                        {loading ? 'Guardando...' : '🔒 Guardar nueva contraseña'}
                    </button>
                </div>
            )}
        </div>
    )
}

// ── FamilySetupScreen — exportada para App.jsx ────────────────────────────────
export function FamilySetupScreen() {
    const { createFamily, joinFamily, signOut } = useApp()
    const [mode, setMode] = useState('create')
    const [familyName, setFamilyName] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleCreate = async () => {
        if (!familyName.trim()) { setError('Escribe el nombre de tu familia'); return }
        setLoading(true); setError('')
        const { error } = await createFamily(familyName.trim())
        if (error) { setError(error.message); setLoading(false); return }
        setSuccess('¡Familia creada! Cargando...')
        // reloadProfile() ya fue llamado dentro de createFamily()
        // App.jsx detecta onboardingState='ready' y renderiza el dashboard
    }

    const handleJoin = async () => {
        if (!inviteCode.trim()) { setError('Escribe el código de invitación'); return }
        setLoading(true); setError('')
        const { error } = await joinFamily(inviteCode.trim())
        if (error) {
            const msg = error.message.includes('inválido') || error.message.includes('invalid')
                ? 'Código inválido. Verifica con el administrador de la familia.'
                : error.message
            setError(msg); setLoading(false); return
        }
        // joinFamily llama reloadProfile() → onboardingState='pending' → App.jsx muestra PendingScreen
    }

    return (
        <div style={S.screen}>
            <div style={S.card}>
                <Logo />
                <div style={{ color: '#5a6180', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
                    Configura tu grupo familiar
                </div>

                {/* Toggle crear / unirse */}
                <div style={{
                    display: 'flex', gap: 6, background: '#080a10',
                    border: '1px solid #1a2030', borderRadius: 10, padding: 4, marginBottom: 20,
                }}>
                    {[
                        { id: 'create', label: '🏠 Crear familia' },
                        { id: 'join', label: '🔗 Unirme con código' },
                    ].map(m => (
                        <button key={m.id} onClick={() => { setMode(m.id); setError('') }} style={{
                            flex: 1, border: 'none', borderRadius: 8, padding: '8px',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                            background: mode === m.id ? '#4f7cff' : 'transparent',
                            color: mode === m.id ? '#fff' : '#5a6180', transition: 'all .15s',
                        }}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {error && <div style={{ ...S.errorBox, marginBottom: 14 }}>{error}</div>}
                {success && <div style={{ ...S.successBox, marginBottom: 14 }}>{success}</div>}

                {mode === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={S.infoBox}>
                            🏠 Serás el <strong>propietario</strong> de la familia con acceso completo.
                            Podrás invitar miembros con un código único.
                        </div>
                        <FieldInput
                            label="Nombre de la familia"
                            value={familyName}
                            onChange={e => setFamilyName(e.target.value)}
                            placeholder="Familia García"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                            onClick={handleCreate} disabled={loading}>
                            {loading ? 'Creando...' : '🏠 Crear mi familia'}
                        </button>
                    </div>
                )}

                {mode === 'join' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={S.infoBox}>
                            🔗 El administrador te comparte un código de invitación.
                            Después de unirte, el admin debe <strong>aprobarte</strong>.
                        </div>
                        <div>
                            <label style={S.label}>Código de invitación</label>
                            <input
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value.toLowerCase())}
                                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                                placeholder="garcia2025"
                                style={{
                                    ...S.input, textAlign: 'center',
                                    fontSize: 18, fontWeight: 700, letterSpacing: 3,
                                }}
                            />
                        </div>
                        <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                            onClick={handleJoin} disabled={loading}>
                            {loading ? 'Uniéndome...' : '🔗 Unirme a la familia'}
                        </button>
                    </div>
                )}

                <button style={{ ...S.btnGhost, marginTop: 12 }} onClick={signOut}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                    onMouseLeave={e => e.currentTarget.style.color = '#5a6180'}>
                    Cerrar sesión
                </button>
            </div>
        </div>
    )
}

// ── PendingScreen — exportada para App.jsx ────────────────────────────────────
export function PendingScreen() {
    const { profile, family, signOut, reloadProfile } = useApp()
    const [checking, setChecking] = useState(false)

    const handleCheck = async () => {
        setChecking(true)
        if (supabase) await supabase.auth.refreshSession()
        await reloadProfile()
        setChecking(false)
    }

    return (
        <div style={S.screen}>
            <div style={S.card}>
                <Logo />
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
                    <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                        Esperando aprobación
                    </div>
                    <div style={{ color: '#5a6180', fontSize: 13, lineHeight: 1.7 }}>
                        Tu solicitud para unirte a{' '}
                        <strong style={{ color: '#eef0ff' }}>{family?.name}</strong> está pendiente.
                        El administrador debe aprobarte para que puedas acceder.
                    </div>
                </div>

                <div style={{ ...S.infoBox, marginBottom: 20 }}>
                    <strong>¿Qué pasa ahora?</strong><br />
                    1. El admin ve una notificación en la app<br />
                    2. Aprueba tu acceso en Familia → Miembros<br />
                    3. Presiona "Verificar" — verás el dashboard
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        style={{ ...S.btnPrimary, opacity: checking ? 0.7 : 1 }}
                        onClick={handleCheck} disabled={checking}
                    >
                        {checking ? 'Verificando...' : '🔄 Verificar aprobación'}
                    </button>
                    <button style={S.btnGhost} onClick={signOut}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b33' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#5a6180'; e.currentTarget.style.borderColor = '#1a2030' }}>
                        Cerrar sesión
                    </button>
                </div>

                {profile && (
                    <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#2a3050' }}>
                        {profile.display_name} · {profile.email}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── NoProfileScreen — exportada para App.jsx ──────────────────────────────────
export function NoProfileScreen() {
    const { signOut, reloadProfile } = useApp()
    const [loading, setLoading] = useState(false)

    const handleRetry = async () => {
        setLoading(true)
        await reloadProfile()
        setLoading(false)
    }

    return (
        <div style={S.screen}>
            <div style={S.card}>
                <Logo />
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
                        Error de perfil
                    </div>
                    <div style={{ color: '#5a6180', fontSize: 13, lineHeight: 1.7 }}>
                        No se pudo crear tu perfil en la base de datos.
                        Esto puede pasar si el servidor está temporalmente fuera de línea.
                    </div>
                </div>

                <div style={{ ...S.errorBox, marginBottom: 20 }}>
                    <strong>¿Qué puedes hacer?</strong><br />
                    • Presiona "Reintentar" para intentar crear el perfil nuevamente<br />
                    • Si el problema persiste, contacta soporte<br />
                    • O cierra sesión y vuelve a registrarte
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                        onClick={handleRetry} disabled={loading}
                    >
                        {loading ? 'Reintentando...' : '🔄 Reintentar'}
                    </button>
                    <button style={S.btnGhost} onClick={signOut}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b33' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#5a6180'; e.currentTarget.style.borderColor = '#1a2030' }}>
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    )
}

function PasswordStrength({ password }) {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    const META = [
        { label: '', color: '' },
        { label: 'Débil', color: '#ff6b6b' },
        { label: 'Regular', color: '#fbbf24' },
        { label: 'Buena', color: '#4f7cff' },
        { label: 'Fuerte', color: '#2dd4a0' },
    ]
    const m = META[strength] || META[0]

    return (
        <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: i <= strength ? m.color : '#1a2030',
                        transition: 'background .2s',
                    }} />
                ))}
            </div>
            {m.label && (
                <div style={{ fontSize: 10, color: m.color, textAlign: 'right' }}>{m.label}</div>
            )}
        </div>
    )
}