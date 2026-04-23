// src/pages/MembersPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Panel de gestión de miembros de la familia (solo admin/owner).
//
// FUNCIONALIDADES:
//   1. Ver todos los miembros con su estado (active/pending/suspended)
//   2. Aprobar o suspender miembros pendientes (rpc_set_member_status)
//   3. Cambiar el rol de un miembro (rpc_set_member_role) — solo owner
//   4. Ver cuántos miembros quedan disponibles según el plan
//
// ESTADOS DE MIEMBRO:
//   pending   → acaba de unirse con el código, espera aprobación
//   active    → aprobado, puede usar la app
//   suspended → bloqueado temporalmente, no puede acceder
//
// REGLAS DE NEGOCIO:
//   - No se puede suspender al owner
//   - Solo el owner puede cambiar roles
//   - Admin puede aprobar/suspender pero no cambiar roles
//   - Los miembros normales no ven este panel
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { Card, Btn, SectionHeader } from '../components/ui/index'

const STATUS_BADGE = {
    active: { color: 'var(--green)', label: 'Activo' },
    pending: { color: 'var(--yellow)', label: 'Pendiente' },
    suspended: { color: 'var(--red)', label: 'Suspendido' },
}

const ROLE_LABELS = {
    owner: '👑 Propietario',
    admin: '🛡️ Administrador',
    member: '👤 Miembro',
    kid: '⭐ Niño/a',
}

export default function MembersPanel() {
    const { t, profile, members, family, reload, isFamilyAdmin, isDemoMode } = useApp()
    const [loading, setLoading] = useState(null)  // ID del miembro en procesamiento
    const [error, setError] = useState('')

    if (!isFamilyAdmin) {
        return (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40, fontSize: 13 }}>
                🔒 Solo el administrador puede gestionar miembros
            </div>
        )
    }

    const pendingMembers = members.filter(m => m.status === 'pending')
    const activeMembers = members.filter(m => m.status === 'active')
    const suspendedMembers = members.filter(m => m.status === 'suspended')

    // Aprobar o suspender a un miembro
    const setMemberStatus = async (memberId, status) => {
        setLoading(memberId)
        setError('')
        try {
            if (!isDemoMode && supabase) {
                const { error } = await supabase.rpc('rpc_set_member_status', {
                    p_member_id: memberId,
                    p_status: status,
                })
                if (error) throw error
            }
            await reload()
        } catch (e) {
            setError(e.message)
        }
        setLoading(null)
    }

    // Cambiar rol de un miembro (solo owner)
    const setMemberRole = async (memberId, role) => {
        if (profile?.role !== 'owner') return
        setLoading(memberId)
        setError('')
        try {
            if (!isDemoMode && supabase) {
                const { error } = await supabase.rpc('rpc_set_member_role', {
                    p_member_id: memberId,
                    p_role: role,
                })
                if (error) throw error
            }
            await reload()
        } catch (e) {
            setError(e.message)
        }
        setLoading(null)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionHeader title="Gestión de miembros" />

            {error && (
                <div style={{
                    background: 'var(--red)14', border: '1px solid var(--red)33',
                    borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13,
                }}>
                    {error}
                </div>
            )}

            {/* ── PENDIENTES DE APROBACIÓN (prioridad alta) ── */}
            {pendingMembers.length > 0 && (
                <Card accent="var(--yellow)44">
                    <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                        color: 'var(--yellow)', marginBottom: 12
                    }}>
                        ⏳ Esperando aprobación ({pendingMembers.length})
                    </div>
                    {pendingMembers.map(m => (
                        <MemberRow
                            key={m.id}
                            member={m}
                            currentProfile={profile}
                            isLoading={loading === m.id}
                            onApprove={() => setMemberStatus(m.id, 'active')}
                            onSuspend={() => setMemberStatus(m.id, 'suspended')}
                            onRoleChange={profile?.role === 'owner' ? (role) => setMemberRole(m.id, role) : null}
                            showActions
                        />
                    ))}
                </Card>
            )}

            {/* ── MIEMBROS ACTIVOS ── */}
            <Card>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                    ✓ Activos ({activeMembers.length})
                </div>
                {activeMembers.map(m => (
                    <MemberRow
                        key={m.id}
                        member={m}
                        currentProfile={profile}
                        isLoading={loading === m.id}
                        onSuspend={m.role !== 'owner' ? () => setMemberStatus(m.id, 'suspended') : null}
                        onRoleChange={profile?.role === 'owner' && m.role !== 'owner'
                            ? (role) => setMemberRole(m.id, role)
                            : null}
                        showActions={m.role !== 'owner'}
                    />
                ))}
            </Card>

            {/* ── SUSPENDIDOS ── */}
            {suspendedMembers.length > 0 && (
                <Card>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                        color: 'var(--muted)', marginBottom: 12
                    }}>
                        🚫 Suspendidos ({suspendedMembers.length})
                    </div>
                    {suspendedMembers.map(m => (
                        <MemberRow
                            key={m.id}
                            member={m}
                            currentProfile={profile}
                            isLoading={loading === m.id}
                            onApprove={() => setMemberStatus(m.id, 'active')}
                            showActions
                        />
                    ))}
                </Card>
            )}

            {/* ── LÍMITES DEL PLAN ── */}
            <PlanLimitCard family={family} memberCount={members.filter(m => m.status === 'active').length} />
        </div>
    )
}

// ── Fila de miembro ───────────────────────────────────────────────────────────
function MemberRow({ member: m, currentProfile, isLoading, onApprove, onSuspend, onRoleChange, showActions }) {
    const [showRoleMenu, setShowRoleMenu] = useState(false)
    const statusStyle = STATUS_BADGE[m.status] || STATUS_BADGE.active
    const isMe = m.id === currentProfile?.id

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0', borderBottom: '1px solid var(--border)',
            position: 'relative',
        }}>
            {/* Avatar */}
            <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: m.avatar_color + '22',
                border: `2px solid ${m.avatar_color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
            }}>
                {m.avatar_emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {m.display_name} {isMe && <span style={{
                        fontSize: 10, color: 'var(--muted)',
                        background: 'var(--border)', borderRadius: 20, padding: '1px 6px'
                    }}>Tú</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                    {/* Badge de estado */}
                    <span style={{
                        fontSize: 10, fontWeight: 600, color: statusStyle.color,
                        background: statusStyle.color + '18', borderRadius: 20, padding: '1px 7px',
                    }}>
                        {statusStyle.label}
                    </span>
                    {/* Rol */}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {ROLE_LABELS[m.role] || m.role}
                    </span>
                </div>
            </div>

            {/* Acciones */}
            {showActions && !isMe && (
                <div style={{
                    display: 'flex', gap: 6, alignItems: 'center'
                }}>
                    {
                        isLoading ? (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }} >...</span>
                        ) : (
                            <>
                                {onApprove && (
                                    <Btn size="xs" variant="success" onClick={onApprove}>✓ Aprobar</Btn>
                                )}
                                {onSuspend && (
                                    <Btn size="xs" variant="danger" onClick={onSuspend}>⊘ Suspender</Btn>
                                )}
                                {onRoleChange && (
                                    <div style={{ position: 'relative' }}>
                                        <Btn size="xs" variant="ghost" onClick={() => setShowRoleMenu(!showRoleMenu)}>
                                            Rol ▾
                                        </Btn>
                                        {showRoleMenu && (
                                            <div style={{
                                                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                                                background: 'var(--card)', border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-sm)', zIndex: 10, minWidth: 120,
                                                boxShadow: '0 4px 20px #00000044',
                                            }}>
                                                {['admin', 'member', 'kid'].map(role => (
                                                    <button key={role} onClick={() => { onRoleChange(role); setShowRoleMenu(false) }}
                                                        style={{
                                                            display: 'block', width: '100%', textAlign: 'left',
                                                            padding: '8px 12px', border: 'none', background: 'transparent',
                                                            color: m.role === role ? 'var(--blue)' : 'var(--text)',
                                                            fontFamily: 'var(--font-body)', fontSize: 12,
                                                            cursor: 'pointer', transition: 'background .1s',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        {ROLE_LABELS[role]}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )
                    }
                </div >
            )}
        </div >
    )
}

// ── Límites del plan ──────────────────────────────────────────────────────────
function PlanLimitCard({ family, memberCount }) {
    const maxMembers = { free: 2, pro: 5, family: 999 }[family?.plan || 'free'] || 2
    const pct = maxMembers < 999 ? Math.round((memberCount / maxMembers) * 100) : 0

    return (
        <Card style={{ background: 'var(--bg)' }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Límites del plan {family?.plan?.toUpperCase()}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span>Miembros activos</span>
                <span className="mono" style={{ color: pct >= 100 ? 'var(--red)' : 'var(--text)' }}>
                    {memberCount} / {maxMembers < 999 ? maxMembers : '∞'}
                </span>
            </div>
            {maxMembers < 999 && (
                <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--yellow)' : 'var(--green)', borderRadius: 99, transition: 'width .6s' }} />
                </div>
            )}
            {pct >= 80 && maxMembers < 999 && (
                <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 6 }}>
                    ⚠️ Cerca del límite — considera actualizar al plan Family
                </div>
            )}
        </Card>
    )
}