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
// FLUJO PARA ANDREA (segunda usuaria):
//   1. Deivid le comparte el código: "garcia2025"
//   2. Andrea abre la app → 'login' → "¿No tienes cuenta?" → 'register'
//   3. Se registra con su email → 'email_sent'
//   4. Confirma email → 'family_setup' (family_id = null)
//   5. Elige "Unirme con código" → ingresa "garcia2025" → rpc_join_family()
//   6. El RPC: vincula a Andrea con status='pending'
//   7. Andrea ve pantalla 'pending' (no puede usar la app todavía)
//   8. Deivid ve badge ⏳ en el Header
//   9. Deivid va a Familia → Miembros → Aprobar Andrea
//  10. Andrea refresca → ve el Dashboard ✓
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

// ── Estilos reutilizables (CSS-in-JS, sin dependencia de clases globales) ────
const S = {
    // Contenedor principal centrado en pantalla
    screen: {
        minHeight: '100vh',
        background: '#080a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Instrument Sans', sans-serif",
    },
    // Tarjeta del formulario
    card: {
        background: '#111520',
        border: '1px solid #1a2030',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 4px 40px #00000066',
    },
    // Logo
    logo: {
        fontFamily: "'Cabinet Grotesk', sans-serif",
        fontSize: 26,
        fontWeight: 900,
        background: 'linear-gradient(135deg, #4f7cff, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
        marginBottom: 4,
    },
    // Subtítulo
    subtitle: {
        color: '#5a6180',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
    },
    // Input estilizado
    input: {
        background: '#080a10',
        border: '1px solid #1a2030',
        borderRadius: 10,
        padding: '10px 14px',
        color: '#eef0ff',
        fontFamily: 'inherit',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        transition: 'border .15s',
        boxSizing: 'border-box',
    },
    // Botón primario
    btnPrimary: {
        border: 'none',
        borderRadius: 10,
        padding: '11px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        width: '100%',
        background: '#4f7cff',
        color: '#fff',
        transition: 'opacity .15s',
    },
    // Botón secundario / ghost
    btnGhost: {
        border: '1px solid #1a2030',
        borderRadius: 10,
        padding: '10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        width: '100%',
        background: 'transparent',
        color: '#5a6180',
        transition: 'all .15s',
    },
    // Mensaje de error
    errorBox: {
        background: '#ff6b6b14',
        border: '1px solid #ff6b6b33',
        borderRadius: 8,
        padding: '9px 12px',
        color: '#ff6b6b',
        fontSize: 12,
        lineHeight: 1.5,
    },
    // Mensaje de éxito / info
    infoBox: {
        background: '#4f7cff14',
        border: '1px solid #4f7cff33',
        borderRadius: 8,
        padding: '9px 12px',
        color: '#4f7cff',
        fontSize: 12,
        lineHeight: 1.5,
    },
    // Mensaje verde (éxito)
    successBox: {
        background: '#2dd4a014',
        border: '1px solid #2dd4a033',
        borderRadius: 8,
        padding: '9px 12px',
        color: '#2dd4a0',
        fontSize: 12,
        lineHeight: 1.5,
    },
    // Separador con texto
    divider: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#2a3050',
        fontSize: 11,
    },
    // Etiqueta de campo
    label: {
        fontSize: 10,
        color: '#5a6180',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
        display: 'block',
    },
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Auth() {
    const { isDemoMode } = useApp()

    // Detectar si el usuario llegó desde un link de reset de contraseña
    // Supabase agrega #type=recovery al hash de la URL
    const isPasswordReset = window.location.hash.includes('type=recovery')

    // Estado de la pantalla actual
    const [screen, setScreen] = useState(
        isPasswordReset ? 'reset_password' : 'login'
    )

    return (
        <div style={S.screen}>
            {/* Banner de modo demo */}
            {isDemoMode && screen !== 'pending' && <DemoBanner />}

            {/* Router de pantallas */}
            {screen === 'login' && <LoginScreen onNavigate={setScreen} />}
            {screen === 'register' && <RegisterScreen onNavigate={setScreen} />}
            {screen === 'email_sent' && <EmailSentScreen onNavigate={setScreen} />}
            {screen === 'reset_password' && <ResetPasswordScreen onNavigate={setScreen} />}
            {screen === 'forgot' && <ForgotScreen onNavigate={setScreen} />}
        </div>
    )
}

// ── LoginScreen ───────────────────────────────────────────────────────────────
/**
 * Pantalla de inicio de sesión.
 * Si el usuario no tiene familia asignada, App.jsx detecta family_id=null
 * y renderiza FamilySetupScreen en su lugar (ver AppContext.jsx).
 */
function LoginScreen({ onNavigate }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        if (!email || !password) { setError('Completa email y contraseña'); return }
        setLoading(true); setError('')

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            // Traducir errores comunes de Supabase al español
            if (error.message.includes('Invalid login')) {
                setError('Email o contraseña incorrectos')
            } else if (error.message.includes('Email not confirmed')) {
                setError('Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
            } else {
                setError(error.message)
            }
        }
        // Si no hay error, onAuthStateChange en AppContext detecta la sesión
        // y AppInner se re-renderiza automáticamente mostrando la app
        setLoading(false)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={S.subtitle}>Inicia sesión en tu cuenta</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <div style={S.errorBox}>{error}</div>}

                <div>
                    <label style={S.label}>Email</label>
                    <input
                        style={S.input}
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ ...S.label, marginBottom: 0 }}>Contraseña</label>
                        <button
                            onClick={() => onNavigate('forgot')}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#4f7cff', fontSize: 11, fontFamily: 'inherit',
                            }}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                    <input
                        style={S.input}
                        type="password"
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <button
                    style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>

                <div style={S.divider}>
                    <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
                    <span>o</span>
                    <div style={{ flex: 1, height: 1, background: '#1a2030' }} />
                </div>

                <button
                    style={S.btnGhost}
                    onClick={() => onNavigate('register')}
                    onMouseEnter={e => { e.currentTarget.style.color = '#eef0ff'; e.currentTarget.style.borderColor = '#2a3050' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#5a6180'; e.currentTarget.style.borderColor = '#1a2030' }}
                >
                    ¿No tienes cuenta? Regístrate
                </button>
            </div>
        </div>
    )
}

// ── RegisterScreen ────────────────────────────────────────────────────────────
/**
 * Pantalla de registro de nuevo usuario.
 *
 * Después del signUp(), Supabase envía un email de confirmación.
 * El trigger handle_new_user() en PostgreSQL crea el perfil automáticamente.
 * La familia se configura en la siguiente pantalla (FamilySetupScreen).
 */
function RegisterScreen({ onNavigate }) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRegister = async () => {
        // Validaciones del lado del cliente
        if (!name.trim()) { setError('Escribe tu nombre'); return }
        if (!email.trim()) { setError('Escribe tu email'); return }
        if (!password) { setError('Escribe una contraseña'); return }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres')
            return
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden')
            return
        }

        setLoading(true); setError('')

        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    display_name: name.trim(),
                    // El trigger handle_new_user() usa este campo para crear el perfil
                    lang: 'es',
                },
                // URL a la que redirige después de confirmar el email
                emailRedirectTo: window.location.origin,
            },
        })

        if (error) {
            if (error.message.includes('already registered')) {
                setError('Este email ya tiene una cuenta. Intenta iniciar sesión.')
            } else {
                setError(error.message)
            }
            setLoading(false)
            return
        }

        // Registro exitoso → pedir confirmación de email
        onNavigate('email_sent')
        setLoading(false)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={S.subtitle}>Crea tu cuenta — es gratis</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {error && <div style={S.errorBox}>{error}</div>}

                <div>
                    <label style={S.label}>Tu nombre</label>
                    <input
                        style={S.input}
                        placeholder="Deivid García"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <div>
                    <label style={S.label}>Email</label>
                    <input
                        style={S.input}
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <div>
                    <label style={S.label}>Contraseña (mínimo 8 caracteres)</label>
                    <input
                        style={S.input}
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <div>
                    <label style={S.label}>Confirmar contraseña</label>
                    <input
                        style={S.input}
                        type="password"
                        placeholder="Repite tu contraseña"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRegister()}
                        onFocus={e => e.target.style.borderColor = '#4f7cff'}
                        onBlur={e => e.target.style.borderColor = '#1a2030'}
                    />
                </div>

                <button
                    style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                    onClick={handleRegister}
                    disabled={loading}
                >
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>

                {/* Disclaimer */}
                <div style={{ fontSize: 10, color: '#2a3050', textAlign: 'center', lineHeight: 1.6 }}>
                    Al registrarte aceptas nuestros términos de uso y política de privacidad
                    (PIPEDA · Ley 25 Québec)
                </div>

                <button
                    style={S.btnGhost}
                    onClick={() => onNavigate('login')}
                    onMouseEnter={e => { e.currentTarget.style.color = '#eef0ff'; e.currentTarget.style.borderColor = '#2a3050' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#5a6180'; e.currentTarget.style.borderColor = '#1a2030' }}
                >
                    Ya tengo cuenta — Iniciar sesión
                </button>
            </div>
        </div>
    )
}

// ── EmailSentScreen ────────────────────────────────────────────────────────────
/**
 * Pantalla que se muestra después del registro exitoso.
 * Supabase requiere que el usuario confirme su email antes de poder hacer login.
 *
 * NOTA: Esta confirmación se puede deshabilitar en Supabase:
 *   Dashboard → Authentication → Settings → "Confirm email" → OFF
 *   Para proyectos personales es recomendable desactivarla.
 */
function EmailSentScreen({ onNavigate }) {
    return (
        <div style={S.card}>
            <Logo />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
                <div style={{
                    fontFamily: "'Cabinet Grotesk', sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    marginBottom: 10,
                }}>
                    Confirma tu email
                </div>
                <div style={{ color: '#5a6180', fontSize: 13, lineHeight: 1.7 }}>
                    Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada y
                    haz clic en el enlace para activar tu cuenta.
                </div>
            </div>

            <div style={{ ...S.infoBox, marginBottom: 16 }}>
                💡 <strong>Tip:</strong> Si no lo ves en inbox, revisa la carpeta de spam.
                El enlace expira en 24 horas.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                    style={S.btnPrimary}
                    onClick={() => {
                        // Una vez confirmado el email, el usuario puede hacer login
                        onNavigate('login')
                    }}
                >
                    Ya confirmé mi email — Iniciar sesión
                </button>
                <button
                    style={S.btnGhost}
                    onClick={() => onNavigate('register')}
                    onMouseEnter={e => { e.currentTarget.style.color = '#eef0ff' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#5a6180' }}
                >
                    Registrarme con otro email
                </button>
            </div>
        </div>
    )
}

// ── ForgotScreen ──────────────────────────────────────────────────────────────
/**
 * Pantalla de recuperación de contraseña.
 * Envía un email con un link que redirige a la app con type=recovery en el hash.
 * Cuando el usuario hace clic, se muestra ResetPasswordScreen.
 */
function ForgotScreen({ onNavigate }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSend = async () => {
        if (!email.trim()) { setError('Escribe tu email'); return }
        setLoading(true); setError('')

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin,
        })

        if (error) {
            setError(error.message)
        } else {
            setSent(true)
        }
        setLoading(false)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={S.subtitle}>Recuperar contraseña</div>

            {!sent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && <div style={S.errorBox}>{error}</div>}

                    <div style={{ ...S.infoBox }}>
                        Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña.
                    </div>

                    <div>
                        <label style={S.label}>Email de tu cuenta</label>
                        <input
                            style={S.input}
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            onFocus={e => e.target.style.borderColor = '#4f7cff'}
                            onBlur={e => e.target.style.borderColor = '#1a2030'}
                        />
                    </div>

                    <button
                        style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                        onClick={handleSend}
                        disabled={loading}
                    >
                        {loading ? 'Enviando...' : '📧 Enviar enlace de recuperación'}
                    </button>

                    <button
                        style={S.btnGhost}
                        onClick={() => onNavigate('login')}
                        onMouseEnter={e => { e.currentTarget.style.color = '#eef0ff' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#5a6180' }}
                    >
                        ← Volver al inicio de sesión
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center', fontSize: 48 }}>📬</div>
                    <div style={S.successBox}>
                        ✓ Email enviado a <strong>{email}</strong>. Revisa tu bandeja de entrada
                        y sigue el enlace para crear una nueva contraseña.
                    </div>
                    <button style={S.btnPrimary} onClick={() => onNavigate('login')}>
                        Volver al inicio de sesión
                    </button>
                </div>
            )}
        </div>
    )
}

// ── ResetPasswordScreen ────────────────────────────────────────────────────────
/**
 * Pantalla para establecer una nueva contraseña.
 * Se activa cuando el usuario llega desde el link del email de recuperación
 * (la URL tiene #type=recovery en el hash).
 *
 * Supabase establece automáticamente una sesión temporal cuando el usuario
 * hace clic en el link, permitiendo llamar a updateUser().
 */
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

        // Supabase tiene la sesión temporal activa gracias al link del email
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        // Contraseña actualizada exitosamente
        setSuccess(true)
        setLoading(false)

        // Limpiar el hash de la URL para evitar reutilización del link
        window.history.replaceState(null, '', window.location.pathname)

        // Redirigir al login después de 3 segundos
        setTimeout(() => onNavigate('login'), 3000)
    }

    return (
        <div style={S.card}>
            <Logo />
            <div style={S.subtitle}>Crear nueva contraseña</div>

            {success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ textAlign: 'center', fontSize: 48 }}>✅</div>
                    <div style={S.successBox}>
                        ✓ Contraseña actualizada correctamente. Redirigiendo al inicio de sesión...
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && <div style={S.errorBox}>{error}</div>}

                    <div>
                        <label style={S.label}>Nueva contraseña</label>
                        <input
                            style={S.input}
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onFocus={e => e.target.style.borderColor = '#4f7cff'}
                            onBlur={e => e.target.style.borderColor = '#1a2030'}
                        />
                    </div>

                    <div>
                        <label style={S.label}>Confirmar nueva contraseña</label>
                        <input
                            style={S.input}
                            type="password"
                            placeholder="Repite la contraseña"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleReset()}
                            onFocus={e => e.target.style.borderColor = '#4f7cff'}
                            onBlur={e => e.target.style.borderColor = '#1a2030'}
                        />
                    </div>

                    {/* Indicador de fortaleza de contraseña */}
                    {password.length > 0 && (
                        <PasswordStrength password={password} />
                    )}

                    <button
                        style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                        onClick={handleReset}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : '🔒 Guardar nueva contraseña'}
                    </button>
                </div>
            )}
        </div>
    )
}

// ── FamilySetupScreen ─────────────────────────────────────────────────────────
/**
 * Pantalla de configuración de familia.
 * Se muestra cuando el usuario está autenticado pero NO tiene familia asignada.
 * Es decir, profile.family_id === null.
 *
 * Esta pantalla NO es parte del flujo de Auth.jsx — la renderiza App.jsx
 * cuando detecta la condición de usuario sin familia.
 * La exportamos aquí para mantenerla junto con el resto del flujo.
 *
 * DOS OPCIONES:
 *   1. Crear nueva familia → rpc_create_family() → rol: owner
 *   2. Unirse con código   → rpc_join_family()   → rol: member, status: pending
 */
export function FamilySetupScreen() {
    const { reload } = useApp()

    // 'create' → crear nueva familia | 'join' → unirse con código
    const [mode, setMode] = useState('create')
    const [familyName, setFamilyName] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleCreate = async () => {
        if (!familyName.trim()) { setError('Escribe el nombre de tu familia'); return }
        setLoading(true); setError('')

        const { data, error } = await supabase.rpc('rpc_create_family', {
            p_name: familyName.trim(),
            p_currency: 'CAD',
            p_locale: 'es',
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        // Familia creada — recargar el estado global (profile ahora tiene family_id)
        setSuccess('¡Familia creada! Cargando tu dashboard...')
        await reload()
        setLoading(false)
    }

    const handleJoin = async () => {
        if (!inviteCode.trim()) { setError('Escribe el código de invitación'); return }
        setLoading(true); setError('')

        const { data, error } = await supabase.rpc('rpc_join_family', {
            p_invite_code: inviteCode.trim(),
        })

        if (error) {
            if (error.message.includes('inválido')) {
                setError('Código de invitación no válido. Verifica con el administrador de la familia.')
            } else {
                setError(error.message)
            }
            setLoading(false)
            return
        }

        // Unido como pending — recargar para mostrar la pantalla de pendiente
        await reload()
        setLoading(false)
    }

    return (
        <div style={{ ...S.screen, background: '#080a10' }}>
            <div style={S.card}>
                <Logo />
                <div style={S.subtitle}>Configura tu grupo familiar</div>

                {/* Toggle: Crear / Unirse */}
                <div style={{
                    display: 'flex',
                    gap: 6,
                    background: '#080a10',
                    border: '1px solid #1a2030',
                    borderRadius: 10,
                    padding: 4,
                    marginBottom: 20,
                }}>
                    {['create', 'join'].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError('') }}
                            style={{
                                flex: 1,
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 13,
                                fontWeight: 600,
                                transition: 'all .15s',
                                background: mode === m ? '#4f7cff' : 'transparent',
                                color: mode === m ? '#fff' : '#5a6180',
                            }}
                        >
                            {m === 'create' ? '🏠 Crear familia' : '🔗 Unirme con código'}
                        </button>
                    ))}
                </div>

                {error && <div style={{ ...S.errorBox, marginBottom: 14 }}>{error}</div>}
                {success && <div style={{ ...S.successBox, marginBottom: 14 }}>{success}</div>}

                {/* ── CREAR FAMILIA ── */}
                {mode === 'create' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ ...S.infoBox }}>
                            🏠 Serás el <strong>propietario</strong> de la familia y podrás invitar
                            a otros miembros. El plan gratuito incluye hasta 2 miembros.
                        </div>

                        <div>
                            <label style={S.label}>Nombre de la familia</label>
                            <input
                                style={S.input}
                                placeholder="Familia García"
                                value={familyName}
                                onChange={e => setFamilyName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                onFocus={e => e.target.style.borderColor = '#4f7cff'}
                                onBlur={e => e.target.style.borderColor = '#1a2030'}
                            />
                        </div>

                        <button
                            style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                            onClick={handleCreate}
                            disabled={loading}
                        >
                            {loading ? 'Creando...' : '🏠 Crear mi familia'}
                        </button>
                    </div>
                )}

                {/* ── UNIRSE CON CÓDIGO ── */}
                {mode === 'join' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ ...S.infoBox }}>
                            🔗 El administrador de la familia te comparte un código.
                            Después de unirte, el admin debe <strong>aprobarte</strong> para que
                            puedas usar la app.
                        </div>

                        <div>
                            <label style={S.label}>Código de invitación</label>
                            <input
                                style={{
                                    ...S.input,
                                    textAlign: 'center',
                                    fontSize: 18,
                                    fontWeight: 700,
                                    letterSpacing: 3,
                                    textTransform: 'lowercase',
                                }}
                                placeholder="garcia2025"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value.toLowerCase())}
                                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                                onFocus={e => e.target.style.borderColor = '#4f7cff'}
                                onBlur={e => e.target.style.borderColor = '#1a2030'}
                            />
                        </div>

                        <button
                            style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
                            onClick={handleJoin}
                            disabled={loading}
                        >
                            {loading ? 'Uniéndome...' : '🔗 Unirme a la familia'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── PendingScreen ─────────────────────────────────────────────────────────────
/**
 * Pantalla de espera cuando el usuario se unió con código pero
 * su status = 'pending' (no ha sido aprobado por el admin todavía).
 *
 * Esta pantalla la renderiza App.jsx cuando detecta:
 *   profile.family_id !== null AND profile.status === 'pending'
 *
 * El usuario puede: cerrar sesión o refrescar para verificar si ya fue aprobado.
 */
export function PendingScreen() {
    const { profile, family, signOut } = useApp()
    const [checking, setChecking] = useState(false)

    const handleRefresh = async () => {
        setChecking(true)
        // Forzar recarga de la sesión para verificar si el status cambió
        await supabase.auth.refreshSession()
        window.location.reload()
    }

    return (
        <div style={S.screen}>
            <div style={S.card}>
                <Logo />

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 52, marginBottom: 12 }}>⏳</div>
                    <div style={{
                        fontFamily: "'Cabinet Grotesk', sans-serif",
                        fontWeight: 800,
                        fontSize: 18,
                        marginBottom: 10,
                    }}>
                        Esperando aprobación
                    </div>
                    <div style={{ color: '#5a6180', fontSize: 13, lineHeight: 1.7 }}>
                        Tu solicitud para unirte a <strong style={{ color: '#eef0ff' }}>{family?.name}</strong> está
                        pendiente. El administrador debe aprobarte para que puedas acceder.
                    </div>
                </div>

                <div style={{ ...S.infoBox, marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>¿Qué pasa ahora?</div>
                    <div style={{ lineHeight: 1.8 }}>
                        1. El administrador recibe una notificación en la app<br />
                        2. Aprueba tu acceso desde la sección Familia → Miembros<br />
                        3. Refresca esta página — verás el dashboard
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                        style={{ ...S.btnPrimary, opacity: checking ? 0.7 : 1 }}
                        onClick={handleRefresh}
                        disabled={checking}
                    >
                        {checking ? 'Verificando...' : '🔄 Verificar aprobación'}
                    </button>
                    <button
                        style={S.btnGhost}
                        onClick={signOut}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = '#ff6b6b33' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#5a6180'; e.currentTarget.style.borderColor = '#1a2030' }}
                    >
                        Cerrar sesión
                    </button>
                </div>

                {/* Info del usuario logueado */}
                {profile && (
                    <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#2a3050' }}>
                        Sesión activa como {profile.display_name} · {profile.email}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

/** Logo reutilizable en todas las pantallas */
function Logo() {
    return (
        <div style={{ ...S.logo, marginBottom: 4 }}>MiFinanza</div>
    )
}

/** Indicador de fortaleza de contraseña */
function PasswordStrength({ password }) {
    let strength = 0
    let label = ''
    let color = ''

    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 1) { label = 'Débil'; color = '#ff6b6b' }
    if (strength === 2) { label = 'Regular'; color = '#fbbf24' }
    if (strength === 3) { label = 'Buena'; color = '#4f7cff' }
    if (strength === 4) { label = 'Fuerte'; color = '#2dd4a0' }

    return (
        <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: i <= strength ? color : '#1a2030',
                        transition: 'background .2s',
                    }} />
                ))}
            </div>
            <div style={{ fontSize: 10, color, textAlign: 'right' }}>{label}</div>
        </div>
    )
}

/** Banner informativo de modo demo */
function DemoBanner() {
    return (
        <div style={{
            position: 'fixed',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: '#fbbf2414',
            border: '1px solid #fbbf2433',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 11,
            color: '#fbbf24',
            fontWeight: 600,
            whiteSpace: 'nowrap',
        }}>
            ⚠️ Modo demo — configura .env.local para usar Supabase
        </div>
    )
}