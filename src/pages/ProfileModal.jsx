// src/pages/ProfileModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Modal de configuración del perfil del usuario.
//
// SECCIONES:
//   1. Avatar y nombre
//   2. Idioma de la interfaz (ES / EN / FR)
//   3. Tema visual (Oscuro / Claro / Sistema)
//   4. Cambio de contraseña (vía Supabase Auth)
//   5. Cerrar sesión
//
// ACCESO:
//   Clic en el avatar del Header abre este modal.
//   Disponible para todos los usuarios (adultos y kids).
//
// NOTA SOBRE CAMBIO DE CONTRASEÑA:
//   Supabase Auth envía un email con enlace para cambiar la contraseña.
//   No se puede cambiar directamente en el frontend por seguridad.
//   El flujo es: solicitar → email → enlace → nueva contraseña.
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/ProfileModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Modal de configuración del perfil del usuario.
// Abierto desde el Header al hacer clic en el avatar.
//
// SECCIONES (3 tabs):
//   1. Perfil    → nombre, emoji de avatar, color de avatar
//   2. Apariencia → idioma (ES/EN/FR), tema (oscuro/claro/sistema)
//   3. Seguridad  → cambio de contraseña vía email, cerrar sesión
//
// CAMBIO DE CONTRASEÑA:
//   Supabase no permite cambio directo desde el frontend.
//   Se envía un email con enlace de reset. El usuario hace clic,
//   es redirigido al app con #type=recovery, y App.jsx muestra
//   la pantalla de nueva contraseña (ResetPasswordScreen en Auth.jsx).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import Btn from '../components/ui/Btn'
import { Field, Input } from '../components/ui/Form'
import { ACC_COLORS } from '../lib/constants'

const AVATAR_EMOJIS = [
    '👨', '👩', '🧑', '👦', '👧', '🧒', '👴', '👵', '🧔', '👱',
    '🙋', '🙆', '🧑‍💻', '👨‍🍳', '👩‍🎨', '🧑‍🎤', '👨‍🚀', '🦸',
]

const LANG_OPTIONS = [
    { id: 'es', flag: '🇨🇴', label: 'Español' },
    { id: 'en', flag: '🇨🇦', label: 'English' },
    { id: 'fr', flag: '🇫🇷', label: 'Français' },
]

const THEME_OPTIONS = [
    { id: 'dark', icon: '🌙', label: 'Oscuro', desc: 'Fondo oscuro (por defecto)' },
    { id: 'light', icon: '☀️', label: 'Claro', desc: 'Fondo blanco' },
    { id: 'system', icon: '💻', label: 'Sistema', desc: 'Sigue la preferencia del OS' },
]

export default function ProfileModal({ onClose }) {
    const { t, profile, lang, setLang, signOut, updateProfile, isDemoMode } = useApp()

    const [activeTab, setActiveTab] = useState('profile')

    // Estado del formulario de perfil
    const [name, setName] = useState(profile?.display_name || '')
    const [emoji, setEmoji] = useState(profile?.avatar_emoji || '🧑')
    const [color, setColor] = useState(profile?.avatar_color || '#4f7cff')
    const [theme, setTheme] = useState(profile?.theme || 'dark')

    // Estado de las acciones
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [pwLoading, setPwLoading] = useState(false)
    const [pwSent, setPwSent] = useState(false)
    const [pwError, setPwError] = useState('')
    const [error, setError] = useState('')

    const TABS = [
        { id: 'profile', label: '👤 Perfil' },
        { id: 'appearance', label: '🎨 Apariencia' },
        { id: 'security', label: '🔒 Seguridad' },
    ]

    // ── Guardar perfil ─────────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        if (!name.trim()) { setError('El nombre es requerido'); return }
        setSaving(true); setError('')
        const { error } = await updateProfile({
            display_name: name.trim(),
            avatar_emoji: emoji,
            avatar_color: color,
        })
        if (error) { setError(error.message); setSaving(false); return }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)
    }

    // ── Guardar apariencia (idioma + tema) ────────────────────────────────────
    const handleSaveAppearance = async () => {
        setSaving(true)
        await updateProfile({ lang, theme })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)
    }

    // ── Enviar email de cambio de contraseña ──────────────────────────────────
    const handlePasswordReset = async () => {
        if (!profile?.email) { setPwError('No se encontró el email del perfil'); return }
        setPwLoading(true); setPwError('')
        if (!isDemoMode && supabase) {
            const { error } = await supabase.auth.resetPasswordForEmail(
                profile.email,
                { redirectTo: window.location.origin }
            )
            if (error) { setPwError(error.message); setPwLoading(false); return }
        }
        setPwSent(true)
        setPwLoading(false)
    }

    return (
        <Modal title="Mi perfil" onClose={onClose} width={430}>

            {/* ── AVATAR PREVIEW ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 0 18px',
                borderBottom: '1px solid var(--border)',
                marginBottom: 16,
            }}>
                <div style={{
                    width: 58, height: 58, borderRadius: '50%', flexShrink: 0,
                    background: color + '22',
                    border: `2px solid ${color}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32,
                }}>
                    {emoji}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{name || profile?.display_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {profile?.email}
                    </div>
                    <div style={{
                        fontSize: 10, fontWeight: 700, marginTop: 4,
                        color: 'var(--blue)', background: 'var(--blue)14',
                        borderRadius: 20, padding: '2px 8px', display: 'inline-block',
                    }}>
                        {profile?.role}
                    </div>
                </div>
            </div>

            {/* ── TABS ── */}
            <div style={{
                display: 'flex', gap: 3,
                borderBottom: '1px solid var(--border)',
                marginBottom: 18,
            }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{
                        background: activeTab === tb.id ? 'var(--border)' : 'transparent',
                        color: activeTab === tb.id ? 'var(--text)' : 'var(--muted)',
                        border: 'none',
                        borderRadius: '8px 8px 0 0',
                        padding: '7px 12px',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12, fontWeight: 600,
                        transition: 'all .15s',
                    }}>
                        {tb.label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════
          TAB: PERFIL
      ════════════════════════════════════════ */}
            {activeTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    <Field label="Nombre visible">
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Tu nombre"
                        />
                    </Field>

                    <Field label="Emoji de avatar">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {AVATAR_EMOJIS.map(e => (
                                <button key={e} onClick={() => setEmoji(e)} style={{
                                    width: 38, height: 38, borderRadius: 8, fontSize: 22,
                                    border: `2px solid ${emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                    background: emoji === e ? 'var(--blue)14' : 'transparent',
                                    cursor: 'pointer', transition: 'all .12s',
                                }}>
                                    {e}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Color de avatar">
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {ACC_COLORS.map(c => (
                                <div key={c} onClick={() => setColor(c)} style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: c, cursor: 'pointer',
                                    border: color === c ? '3px solid #fff' : '3px solid transparent',
                                    transition: 'border .1s',
                                }} />
                            ))}
                        </div>
                    </Field>

                    {error && (
                        <div style={{
                            background: 'var(--red)10', border: '1px solid var(--red)33',
                            borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <Btn
                        variant="primary"
                        style={{ width: '100%' }}
                        onClick={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar perfil'}
                    </Btn>
                </div>
            )}

            {/* ════════════════════════════════════════
          TAB: APARIENCIA
      ════════════════════════════════════════ */}
            {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Idioma */}
                    <Field label="Idioma de la interfaz">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {LANG_OPTIONS.map(l => (
                                <button key={l.id} onClick={() => setLang(l.id)} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${lang === l.id ? 'var(--blue)44' : 'var(--border)'}`,
                                    background: lang === l.id ? 'var(--blue)10' : 'var(--bg)',
                                    cursor: 'pointer', transition: 'all .15s',
                                }}>
                                    <span style={{ fontSize: 14 }}>
                                        {l.flag} {l.label}
                                    </span>
                                    {lang === l.id && (
                                        <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                                            ✓ Activo
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Tema */}
                    <Field label="Tema visual">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {THEME_OPTIONS.map(th => (
                                <button key={th.id} onClick={() => setTheme(th.id)} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${theme === th.id ? 'var(--blue)44' : 'var(--border)'}`,
                                    background: theme === th.id ? 'var(--blue)10' : 'var(--bg)',
                                    cursor: 'pointer', transition: 'all .15s',
                                }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {th.icon} {th.label}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                                            {th.desc}
                                        </div>
                                    </div>
                                    {theme === th.id && (
                                        <span style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 600 }}>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Btn
                        variant="primary"
                        style={{ width: '100%' }}
                        onClick={handleSaveAppearance}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar preferencias'}
                    </Btn>
                </div>
            )}

            {/* ════════════════════════════════════════
          TAB: SEGURIDAD
      ════════════════════════════════════════ */}
            {activeTab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Cambio de contraseña */}
                    <div style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                    }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                            🔑 Cambiar contraseña
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
                            Te enviaremos un email a{' '}
                            <strong style={{ color: 'var(--text)' }}>
                                {profile?.email || 'tu correo'}
                            </strong>{' '}
                            con un enlace para crear una nueva contraseña.
                        </div>

                        {pwSent ? (
                            <div style={{
                                background: 'var(--green)10', border: '1px solid var(--green)33',
                                borderRadius: 8, padding: '10px 14px',
                                fontSize: 13, color: 'var(--green)',
                            }}>
                                ✓ Email enviado. Revisa tu bandeja de entrada y el spam.
                            </div>
                        ) : (
                            <>
                                <Btn
                                    variant="ghost"
                                    style={{ width: '100%' }}
                                    onClick={handlePasswordReset}
                                    disabled={pwLoading}
                                >
                                    {pwLoading ? 'Enviando...' : '📧 Enviar enlace de cambio de contraseña'}
                                </Btn>
                                {pwError && (
                                    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 8 }}>
                                        ⚠️ {pwError}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Info de la sesión */}
                    <div style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '14px 16px',
                    }}>
                        <div className="lbl" style={{ marginBottom: 4 }}>Email de la cuenta</div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>
                            {profile?.email || '—'}
                        </div>
                        <div className="lbl" style={{ marginTop: 10, marginBottom: 4 }}>
                            Miembro desde
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)' }}>
                            {profile?.created_at
                                ? new Date(profile.created_at).toLocaleDateString('es-CA', {
                                    year: 'numeric', month: 'long', day: 'numeric',
                                })
                                : '—'}
                        </div>
                    </div>

                    {/* Separador */}
                    <div style={{ height: 1, background: 'var(--border)' }} />

                    {/* Cerrar sesión */}
                    <Btn
                        variant="danger"
                        style={{ width: '100%' }}
                        onClick={signOut}
                    >
                        🚪 Cerrar sesión
                    </Btn>
                </div>
            )}
        </Modal>
    )
}