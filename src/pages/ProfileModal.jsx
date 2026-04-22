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
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import Btn from '../components/ui/Btn'
import { Field, Input } from '../components/ui/Form'
import { ACC_COLORS } from '../lib/constants'

const AVATAR_EMOJIS = ['👨', '👩', '🧑', '👦', '👧', '🧒', '👴', '👵', '🧔', '👱', '🙋', '🙆']
const THEME_OPTIONS = [
    { id: 'dark', label: '🌙 Oscuro', desc: 'Fondo oscuro (por defecto)' },
    { id: 'light', label: '☀️ Claro', desc: 'Fondo blanco' },
    { id: 'system', label: '💻 Sistema', desc: 'Sigue la preferencia del OS' },
]
const LANG_OPTIONS = [
    { id: 'es', label: '🇪🇸 Español', native: 'Español' },
    { id: 'en', label: '🇨🇦 English', native: 'English' },
    { id: 'fr', label: '🇫🇷 Français', native: 'Français' },
]

export default function ProfileModal({ onClose }) {
    const { t, profile, setLang, lang, signOut, reload, isDemoMode } = useApp()

    const [tab, setTab] = useState('profile')  // 'profile' | 'security' | 'theme'
    const [name, setName] = useState(profile?.display_name || '')
    const [emoji, setEmoji] = useState(profile?.avatar_emoji || '👨')
    const [color, setColor] = useState(profile?.avatar_color || '#4f7cff')
    const [theme, setTheme] = useState(profile?.theme || 'dark')
    const [saving, setSaving] = useState(false)
    const [pwMsg, setPwMsg] = useState('')
    const [pwSent, setPwSent] = useState(false)
    const [saved, setSaved] = useState(false)

    // Guardar cambios de perfil
    const handleSaveProfile = async () => {
        setSaving(true)
        if (!isDemoMode && supabase) {
            await supabase.rpc('rpc_update_profile', {
                p_display_name: name,
                p_avatar_emoji: emoji,
                p_avatar_color: color,
                p_lang: lang,
                p_theme: theme,
            })
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setSaving(false)
        reload()
    }

    // Cambiar idioma (inmediato, sin guardar)
    const handleLangChange = (l) => {
        setLang(l)
        if (!isDemoMode && supabase) {
            supabase.rpc('rpc_update_profile', { p_lang: l })
        }
    }

    // Solicitar cambio de contraseña vía email
    const handlePasswordReset = async () => {
        if (!profile) return
        setPwMsg('Enviando…')
        if (!isDemoMode && supabase) {
            const { error } = await supabase.auth.resetPasswordForEmail(
                profile.email || '',
                { redirectTo: window.location.origin + '/reset-password' }
            )
            if (error) { setPwMsg('Error: ' + error.message); return }
        }
        setPwMsg('')
        setPwSent(true)
    }

    const TABS = [
        { id: 'profile', label: '👤 Perfil' },
        { id: 'theme', label: '🎨 Apariencia' },
        { id: 'security', label: '🔒 Seguridad' },
    ]

    return (
        <Modal title="Mi perfil" onClose={onClose} width={420}>
            {/* Tabs de sección */}
            <div style={{
                display: 'flex', gap: 3, marginBottom: 20,
                borderBottom: '1px solid var(--border)', paddingBottom: 12
            }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        background: tab === tb.id ? 'var(--border)' : 'transparent',
                        color: tab === tb.id ? 'var(--text)' : 'var(--muted)',
                        border: 'none', cursor: 'pointer', borderRadius: 8,
                        padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        fontFamily: 'var(--font-body)', transition: 'all .15s',
                    }}>
                        {tb.label}
                    </button>
                ))}
            </div>


            {/* ── PERFIL ── */}
            {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Avatar preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                        <div style={{
                            width: 60, height: 60, borderRadius: '50%',
                            background: color + '22',
                            border: `2px solid ${color}66`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32,
                        }}>
                            {emoji}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{name || 'Sin nombre'}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{profile?.role}</div>
                        </div>
                    </div>

                    <Field label="Nombre visible">
                        <Input value={name} onChange={e => setName(e.target.value)}
                            placeholder="Tu nombre" />
                    </Field>

                    <Field label="Emoji de avatar">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {AVATAR_EMOJIS.map(e => (
                                <button key={e} onClick={() => setEmoji(e)} style={{
                                    width: 38, height: 38, borderRadius: 8, fontSize: 22,
                                    border: `2px solid ${emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                    background: emoji === e ? 'var(--blue)18' : 'transparent',
                                    cursor: 'pointer',
                                }}>{e}</button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Color de avatar">
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                            {ACC_COLORS.map(c => (
                                <div key={c} onClick={() => setColor(c)} style={{
                                    width: 26, height: 26, borderRadius: 8, background: c, cursor: 'pointer',
                                    border: color === c ? '3px solid #fff' : '3px solid transparent',
                                    transition: 'border .1s',
                                }} />
                            ))}
                        </div>
                    </Field>

                    <Btn variant="primary" onClick={handleSaveProfile} disabled={saving} style={{ width: '100%' }}>
                        {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
                    </Btn>
                </div>
            )}

            {/* ── APARIENCIA ── */}
            {tab === 'theme' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Field label="Idioma de la interfaz">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {LANG_OPTIONS.map(l => (
                                <button key={l.id} onClick={() => handleLangChange(l.id)} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${lang === l.id ? 'var(--blue)44' : 'var(--border)'}`,
                                    background: lang === l.id ? 'var(--blue)10' : 'var(--bg)',
                                    cursor: 'pointer', transition: 'all .15s',
                                }}>
                                    <span style={{ fontSize: 14 }}>{l.label}</span>
                                    {lang === l.id && <span style={{ color: 'var(--blue)', fontSize: 12 }}>✓ Activo</span>}
                                </button>
                            ))}
                        </div>
                    </Field>

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
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{th.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{th.desc}</div>
                                    </div>
                                    {theme === th.id && <span style={{ color: 'var(--blue)', fontSize: 12 }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Btn variant="primary" onClick={handleSaveProfile} style={{ width: '100%' }}>
                        Guardar preferencias
                    </Btn>
                </div>
            )}

            {/* ── SEGURIDAD ── */}
            {tab === 'security' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Cambio de contraseña */}
                    <div className="card" style={{ background: 'var(--bg)', padding: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Cambiar contraseña</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                            Te enviaremos un email a <strong>{profile?.email || 'tu correo'}</strong> con
                            un enlace para crear una nueva contraseña.
                        </div>

                        {pwSent ? (
                            <div style={{
                                background: 'var(--green)14', border: '1px solid var(--green)33',
                                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--green)',
                            }}>
                                ✓ Email enviado. Revisa tu bandeja de entrada.
                            </div>
                        ) : (
                            <Btn variant="ghost" style={{ width: '100%' }} onClick={handlePasswordReset}>
                                📧 Enviar enlace de cambio de contraseña
                            </Btn>
                        )}
                        {pwMsg && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{pwMsg}</div>}
                    </div>

                    {/* Info de la cuenta */}
                    <div style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: 14
                    }}>
                        <div className="lbl">Email</div>
                        <div style={{ fontSize: 13, marginTop: 2 }}>{profile?.email || 'No disponible'}</div>
                        <div className="lbl" style={{ marginTop: 10 }}>Miembro desde</div>
                        <div style={{ fontSize: 13, marginTop: 2 }}>
                            {profile?.created_at
                                ? new Date(profile.created_at).toLocaleDateString('es-CA', { year: 'numeric', month: 'long', day: 'numeric' })
                                : 'Desconocido'}
                        </div>
                    </div>

                    {/* Cerrar sesión */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <Btn variant="danger" style={{ width: '100%' }} onClick={signOut}>
                            🚪 Cerrar sesión
                        </Btn>
                    </div>
                </div>
            )}
        </Modal>


    )
}