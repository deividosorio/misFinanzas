// src/pages/Kids.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Módulo Kids — metas de ahorro gamificadas para niños.
//
// DOS VISTAS EN UN COMPONENTE:
//
//   Vista de padres (parentView = true):
//     - Selector de niño activo
//     - Badges/logros ganados por el niño
//     - Metas del niño con input para depositar
//     - Botón para crear nuevas metas
//     Accedida desde: Sidebar → "Kids" (solo adultos)
//
//   Vista del niño (parentView = false / no prop):
//     - Interfaz gamificada con fondo estrellado
//     - Emoji del niño flotando
//     - "Cerdito alcancía" animado que avanza con el progreso
//     - Texto motivacional y monto faltante
//     Accedida cuando: profile.is_kid = true (auto-detectado en App.jsx)
//
// BADGES (otorgados automáticamente por rpc_check_kid_badges en Supabase):
//   first_goal     → Creó su primera meta
//   halfway        → Llegó al 50% de cualquier meta
//   goal_completed → Completó su primera meta
//   super_saver    → Completó 3 o más metas
//   big_saver      → Ahorró $500 CAD en total
//
// En modo demo, los badges se muestran hardcodeados en demoData.js.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import { BADGE_META } from '../lib/constants'
import { fmt, pct } from '../lib/constants'

// Badges de demo para Mateo (user-3) — en producción vienen de kids_badges table
const DEMO_BADGES = {
    'demo-user-3': ['first_goal', 'halfway'],
    'demo-user-4': ['first_goal', 'halfway', 'goal_completed', 'super_saver'],
}

// ── Componente principal ──────────────────────────────────────────────────────
/**

- @param {boolean} parentView - true: vista de padres, false: vista del niño
  */
export default function Kids({ parentView = false }) {
    const { profile, kidsGoals, kids, depositKidGoal, openModal } = useApp()

    // Vista del niño autenticado
    if (!parentView) {
        const myGoals = kidsGoals.filter(g => g.kid_profile === profile?.id)
        const myBadges = DEMO_BADGES[profile?.id] || []
        return <KidsChildView profile={profile} goals={myGoals} badges={myBadges} />
    }

    // Vista de padres
    return <KidsParentView kids={kids} kidsGoals={kidsGoals} depositKidGoal={depositKidGoal} openModal={openModal} />
}

// ── Vista de padres ────────────────────────────────────────────────────────────
function KidsParentView({ kids, kidsGoals, depositKidGoal, openModal }) {
    // El primer niño está seleccionado por defecto
    const [selectedKidId, setSelectedKidId] = useState(kids[0]?.id || null)

    const selectedKid = kids.find(k => k.id === selectedKidId)
    const selectedGoals = kidsGoals.filter(g => g.kid_profile === selectedKidId)
    const kidBadges = DEMO_BADGES[selectedKidId] || []

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionHeader
                title="Kids — Vista padres"
                action={
                    <Btn size="sm" variant="primary" onClick={() => openModal('kidGoal')}>
                        + Nueva meta
                    </Btn>
                }
            />


            {/* ── Selector de niño ── */}
            {kids.length === 0 ? (
                <Card>
                    <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                        No hay niños en la familia. Agrega un miembro con rol "kid".
                    </p>
                </Card>
            ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {kids.map(k => (
                        <button
                            key={k.id}
                            onClick={() => setSelectedKidId(k.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                borderRadius: 'var(--radius)',
                                background: selectedKidId === k.id ? k.avatar_color + '14' : 'var(--card)',
                                border: `1px solid ${selectedKidId === k.id ? k.avatar_color + '66' : 'var(--border)'}`,
                                cursor: 'pointer',
                                transition: 'all .15s',
                            }}
                        >
                            <span style={{ fontSize: 22 }}>{k.avatar_emoji}</span>
                            <span style={{
                                fontWeight: 600, fontSize: 13,
                                color: selectedKidId === k.id ? k.avatar_color : 'var(--text)',
                            }}>
                                {k.display_name}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Badges del niño seleccionado ── */}
            {kidBadges.length > 0 && (
                <Card>
                    <div className="h3" style={{ marginBottom: 12 }}>🏆 Logros</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {kidBadges.map(badgeKey => {
                            const meta = BADGE_META[badgeKey]
                            if (!meta) return null
                            return (
                                <div key={badgeKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24, background: meta.color + '22',
                                        border: `2px solid ${meta.color}44`,
                                        boxShadow: `0 0 12px ${meta.color}33`,
                                    }}>
                                        {meta.emoji}
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', maxWidth: 60 }}>
                                        {meta.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* ── Metas del niño seleccionado ── */}
            {selectedGoals.length === 0 ? (
                <Empty icon="⭐" message="Sin metas para este niño. Crea una con el botón +" />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
                    {selectedGoals.map(g => (
                        <KidGoalCard key={g.id} goal={g} onDeposit={depositKidGoal} />
                    ))}
                </div>
            )}
        </div>


    )
}

// ── Tarjeta de meta del niño (vista padres) ────────────────────────────────────
function KidGoalCard({ goal: g, onDeposit }) {
    const [val, setVal] = useState('')
    const p = pct(g.current_amount, g.target_amount)

    return (
        <Card accent={g.color + '33'}>
            {/* Encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 30 }}>{g.emoji}</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: g.color }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.kid_name}</div>
                </div>
                {g.status === 'completed' && (
                    <span style={{
                        marginLeft: 'auto', fontSize: 11, color: 'var(--green)',
                        background: 'var(--green)14', borderRadius: 20, padding: '2px 8px',
                    }}>
                        ✓ ¡Completado!
                    </span>
                )}
            </div>


            {/* Progreso */}
            <ProgressBar value={g.current_amount} max={g.target_amount} height={8} color={g.color} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '7px 0 10px' }}>
                <span className="mono" style={{ color: g.color }}>{fmt(g.current_amount)}</span>
                <span style={{ color: 'var(--muted)' }}>{p}% de {fmt(g.target_amount)}</span>
            </div>

            {/* Depósito (solo si no está completada) */}
            {g.status !== 'completed' && (
                <div style={{ display: 'flex', gap: 6 }}>
                    <input
                        type="number"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        placeholder="$10"
                        onKeyDown={e => { if (e.key === 'Enter') { const v = parseFloat(val); if (!isNaN(v) && v > 0) { onDeposit(g.id, v); setVal('') } } }}
                        style={{
                            flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12, outline: 'none',
                        }}
                    />
                    <Btn variant="success" size="sm" onClick={() => {
                        const v = parseFloat(val)
                        if (!isNaN(v) && v > 0) { onDeposit(g.id, v); setVal('') }
                    }}>
                        💰
                    </Btn>
                </div>
            )}
        </Card>


    )
}

// ── Vista del niño (gamificada) ────────────────────────────────────────────────
/**

- Interfaz especial para cuando un niño inicia sesión.
- Características:
- - Fondo oscuro con estrellas parpadeantes (CSS animation)
- - Avatar del niño flotando (CSS animation float)
- - Cerdito 🐷 que avanza en la barra de progreso
- - Sin sidebar, sin header de adulto
    */
function KidsChildView({ profile, goals, badges }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #060914, #0a1020, #080d1a)',
            padding: '20px 16px',
            fontFamily: 'var(--font-body)',
        }}>
            {/* CSS animations para el fondo estrellado y el emoji flotante */}

            <style>{`
     @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
     @keyframes twinkle{ 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.8;transform:scale(1.3)} }
   `}</style>

            {/* Estrellas de fondo */}
            {[...Array(20)].map((_, i) => (

                <div key={i} style={{
                    position: 'fixed',
                    width: 2 + Math.random() * 2,
                    height: 2 + Math.random() * 2,
                    borderRadius: '50%',
                    background: '#fff',
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animation: `twinkle ${1.5 + Math.random() * 2}s infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                    pointerEvents: 'none',
                    zIndex: 0,
                }} />
            ))}

            <div style={{ maxWidth: 460, margin: '0 auto', position: 'relative', zIndex: 1 }}>

                {/* Encabezado del niño */}

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 72, animation: 'float 3s ease-in-out infinite', marginBottom: 8 }}>
                        {profile?.avatar_emoji || '⭐'}
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 24,
                        fontWeight: 900,
                        background: 'linear-gradient(135deg, #818cf8, #38bdf8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        ¡Hola, {profile?.display_name}!
                    </div>
                    <div style={{ color: '#6b7494', fontSize: 13, marginTop: 4 }}>
                        Tus metas de ahorro 🌟
                    </div>
                </div>

                {/* Badges ganados */}
                {badges.length > 0 && (
                    <div style={{
                        background: 'rgba(14,17,24,0.8)',
                        border: '1px solid #1e2a44',
                        borderRadius: 20,
                        padding: 16,
                        marginBottom: 16,
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 14,
                            marginBottom: 10,
                            color: '#fbbf24',
                        }}>
                            🏆 Mis logros
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {badges.map(key => {
                                const meta = BADGE_META[key]
                                if (!meta) return null
                                return (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <div style={{
                                            width: 46, height: 46, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 22, background: `${meta.color}22`,
                                            border: `2px solid ${meta.color}55`,
                                            boxShadow: `0 0 10px ${meta.color}33`,
                                        }}>
                                            {meta.emoji}
                                        </div>
                                        <span style={{ fontSize: 9, color: '#6b7494', textAlign: 'center', maxWidth: 50, lineHeight: 1.2 }}>
                                            {meta.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Metas */}
                {goals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#6b7494' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                            ¡Pide a tus papás crear tu primera meta!
                        </div>
                    </div>
                ) : (
                    goals.map(g => {
                        const p = pct(g.current_amount, g.target_amount)
                        return (
                            <div key={g.id} style={{
                                background: `linear-gradient(135deg, ${g.color}12, ${g.color}06)`,
                                border: `1px solid ${g.color}33`,
                                borderRadius: 20,
                                padding: 20,
                                marginBottom: 14,
                            }}>
                                {/* Encabezado de la meta */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <span style={{ fontSize: 36 }}>{g.emoji}</span>
                                    <div>
                                        <div style={{
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 800, fontSize: 18, color: g.color,
                                        }}>
                                            {g.name}
                                        </div>
                                        {g.reward_text && (
                                            <div style={{ fontSize: 12, color: '#6b7494', marginTop: 2 }}>
                                                {g.reward_text}
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* Barra con cerdito animado */}
                                <div style={{ position: 'relative', marginBottom: 10 }}>
                                    {/* Barra de fondo */}
                                    <div style={{
                                        height: 14,
                                        background: 'rgba(0,0,0,.3)',
                                        borderRadius: 99,
                                        overflow: 'hidden',
                                    }}>
                                        {/* Relleno de progreso */}
                                        <div style={{
                                            height: '100%',
                                            width: `${p}%`,
                                            background: `linear-gradient(90deg, ${g.color}, ${g.color}88)`,
                                            borderRadius: 99,
                                            transition: 'width 1s ease',
                                            boxShadow: `0 0 12px ${g.color}55`,
                                        }} />
                                    </div>
                                    {/* Cerdito que avanza con el progreso */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: `${Math.max(2, p - 4)}%`,  // nunca fuera de la barra
                                        transform: 'translateY(-50%)',
                                        fontSize: 18,
                                        transition: 'left 1s ease',
                                        userSelect: 'none',
                                    }}>
                                        🐷
                                    </div>
                                </div>

                                {/* Números */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span className="mono" style={{ color: g.color, fontSize: 16 }}>
                                        {fmt(g.current_amount)}
                                    </span>
                                    <span style={{ color: '#6b7494' }}>de {fmt(g.target_amount)}</span>
                                </div>

                                {/* Mensaje motivacional */}
                                <div style={{ fontSize: 11, color: '#6b7494', textAlign: 'center', marginTop: 10 }}>
                                    {g.status === 'completed'
                                        ? '🎉 ¡Meta alcanzada! Pídele a mamá o papá tu premio'
                                        : `Faltan ${fmt(g.target_amount - g.current_amount)} para lograrlo 💪`
                                    }
                                </div>
                            </div>
                        )
                    })


                )}

                {/* Pie de página */}

                <div style={{ textAlign: 'center', color: '#2a3050', fontSize: 11, marginTop: 20 }}>
                    MiFinanza Kids 🌟
                </div>
            </div>


        </div>


    )
}