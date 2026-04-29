// src/pages/Family.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión del grupo familiar, miembros, cuentas y planes.
//
// SECCIONES:
//   1. Tarjeta de familia: nombre, plan, código de invitación (copiar)
//   2. Gestión de miembros (solo admin/owner):
//      - Miembros pendientes con botones Aprobar / Rechazar
//      - Miembros activos con opción de suspender y cambiar rol
//      - Miembros suspendidos con opción de reactivar
//   3. Lista de cuentas y tarjetas (solo admin/owner puede crear/editar)
//      - Botón "Nueva cuenta" → AccModal
//      - Botón "Nueva tarjeta" → PmModal (credit_card)
//      - Botón editar en cada cuenta → EditAccountModal
//   4. Comparación de planes (Free / Pro / Family)
//   5. Todos los miembros para usuarios regulares (vista de solo lectura)
//
// FLUJO DE APROBACIÓN DE MIEMBRO:
//   1. Nuevo usuario usa el código de invitación → status = 'pending'
//   2. Admin ve badge de notificación en el Header
//   3. Admin abre Familia → ve la sección "Esperando aprobación"
//   4. Admin hace clic en "Aprobar" → setMemberStatus(id, 'active')
//   5. El miembro puede usar la app inmediatamente
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Family.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v4:
//   - AccModal + PmModal → AccountModal unificado (openModal('account'))
//   - bankAccounts / cards → assetAccounts / creditAccounts del contexto
//   - Tarjetas muestran month_debt y available (no solo balance)
//   - Cuentas de activo muestran balance calculado
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar } from '../components/ui/index'
import { EditAccountModal } from './EditModals'
import { ACCOUNT_SUBTYPES, CREDIT_SUBTYPES, PLAN_COLORS, fmt, pct } from '../lib/constants'

const STATUS_META = {
  active: { color: 'var(--green)', bg: 'var(--green)18', label: 'Activo', icon: '✓' },
  pending: { color: 'var(--yellow)', bg: 'var(--yellow)18', label: 'Pendiente', icon: '⏳' },
  suspended: { color: 'var(--red)', bg: 'var(--red)18', label: 'Suspendido', icon: '✕' },
}

const ROLE_LABEL = {
  owner: '👑 Propietario',
  admin: '🛡️ Admin',
  member: '👤 Miembro',
  kid: '⭐ Niño/a',
}

export default function Family() {
  const {
    t, family, members, profile,
    isFamilyAdmin, pendingMembers,
    setMemberStatus, setMemberRole,
    assetAccounts, creditAccounts,
    modal, openModal,
  } = useApp()

  const [activeTab, setActiveTab] = useState('members')

  const TABS = [
    { id: 'members', label: `👥 Miembros (${members.length})` },
    { id: 'accounts', label: `🏦 Cuentas (${assetAccounts.length + creditAccounts.length})` },
    { id: 'plans', label: '📋 Planes' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader title={t.family} />

      {/* Tarjeta de la familia */}
      {family && <FamilyCard family={family} />}

      {/* Alerta de pendientes */}
      {isFamilyAdmin && pendingMembers.length > 0 && (
        <div style={{
          background: '#fbbf2414', border: '1px solid #fbbf2433',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fbbf24' }}>
            <span>⏳</span>
            <span><strong>{pendingMembers.length}</strong> miembro{pendingMembers.length > 1 ? 's' : ''} esperando aprobación</span>
          </div>
          <Btn size="xs" variant="subtle" onClick={() => setActiveTab('members')}>
            Ver → Miembros
          </Btn>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 3, borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: activeTab === tab.id ? 'var(--border)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
            border: 'none',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            padding: '8px 14px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            transition: 'all .15s',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'members' && (
        <MembersSection
          members={members} profile={profile}
          isFamilyAdmin={isFamilyAdmin}
          isOwner={profile?.role === 'owner'}
          onSetStatus={setMemberStatus}
          onSetRole={setMemberRole}
        />
      )}
      {activeTab === 'accounts' && (
        <AccountsSection
          assetAccounts={assetAccounts}
          creditAccounts={creditAccounts}
          isFamilyAdmin={isFamilyAdmin}
          openModal={openModal}
        />
      )}
      {activeTab === 'plans' && (
        <PlansSection
          currentPlan={family?.plan}
          memberCount={members.filter(m => m.status === 'active').length}
        />
      )}

      {/* Modal unificado de cuenta — v4 */}
      {modal === 'account' && (
        <AccountModal onClose={closeModal} />
      )}
    </div>
  )
}

// ── FamilyCard ────────────────────────────────────────────────────────────────
function FamilyCard({ family }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(family.invite_code || '').catch(() => { })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Card style={{ background: 'linear-gradient(135deg,#0c1020,#111828)', border: '1px solid #1e2a44' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="h2">{family.name}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              color: PLAN_COLORS[family.plan] || '#5a6180',
              background: (PLAN_COLORS[family.plan] || '#5a6180') + '22',
              borderRadius: 20, padding: '2px 9px',
            }}>
              {family.plan}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{family.currency}</span>
          </div>
        </div>
      </div>
      <div className="lbl" style={{ marginBottom: 6 }}>Código de invitación</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '8px 14px',
          fontSize: 15, fontWeight: 700, letterSpacing: 2,
          color: 'var(--blue)', flex: 1, userSelect: 'all',
        }}>
          {family.invite_code}
        </code>
        <Btn size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </Btn>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
        Comparte este código · Los nuevos miembros requieren aprobación del admin
      </div>
    </Card>
  )
}

// ── MembersSection ────────────────────────────────────────────────────────────
function MembersSection({ members, profile, isFamilyAdmin, isOwner, onSetStatus, onSetRole }) {
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  const pending = members.filter(m => m.status === 'pending')
  const active = members.filter(m => m.status === 'active')
  const suspended = members.filter(m => m.status === 'suspended')

  const changeStatus = async (id, status) => {
    setLoadingId(id); setError('')
    const { error } = await onSetStatus(id, status)
    if (error) setError(error.message)
    setLoadingId(null)
  }
  const changeRole = async (id, role) => {
    setLoadingId(id); setError('')
    const { error } = await onSetRole(id, role)
    if (error) setError(error.message)
    setLoadingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && (
        <div style={{
          background: 'var(--red)14', border: '1px solid var(--red)33',
          borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
        }}>⚠️ {error}</div>
      )}

      {pending.length > 0 && (
        <Card accent="var(--yellow)44">
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
            color: 'var(--yellow)', marginBottom: 12
          }}>
            ⏳ Esperando aprobación ({pending.length})
          </div>
          {pending.map(m => (
            <MemberRow key={m.id} member={m} isMe={m.id === profile?.id}
              isAdmin={isFamilyAdmin} isOwner={isOwner}
              loading={loadingId === m.id}
              onApprove={() => changeStatus(m.id, 'active')}
              onSuspend={() => changeStatus(m.id, 'suspended')}
              onRoleChange={isOwner ? role => changeRole(m.id, role) : null}
            />
          ))}
        </Card>
      )}

      <Card>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          ✓ Activos ({active.length})
        </div>
        {active.map(m => (
          <MemberRow key={m.id} member={m} isMe={m.id === profile?.id}
            isAdmin={isFamilyAdmin} isOwner={isOwner}
            loading={loadingId === m.id}
            onSuspend={m.role !== 'owner' && isFamilyAdmin ? () => changeStatus(m.id, 'suspended') : null}
            onRoleChange={isOwner && m.role !== 'owner' ? role => changeRole(m.id, role) : null}
          />
        ))}
      </Card>

      {suspended.length > 0 && (
        <Card>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
            color: 'var(--muted)', marginBottom: 12
          }}>
            🚫 Suspendidos ({suspended.length})
          </div>
          {suspended.map(m => (
            <MemberRow key={m.id} member={m} isMe={m.id === profile?.id}
              isAdmin={isFamilyAdmin} isOwner={isOwner}
              loading={loadingId === m.id}
              onApprove={() => changeStatus(m.id, 'active')}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

// ── MemberRow ─────────────────────────────────────────────────────────────────
function MemberRow({ member: m, isMe, isAdmin, isOwner, loading, onApprove, onSuspend, onRoleChange }) {
  const [showRoles, setShowRoles] = useState(false)
  const meta = STATUS_META[m.status] || STATUS_META.active
  const showActions = isAdmin && !isMe && m.role !== 'owner'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
      position: 'relative',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: m.avatar_color + '22', border: `2px solid ${m.avatar_color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {m.avatar_emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{m.display_name}</span>
          {isMe && (
            <span style={{
              fontSize: 9, color: 'var(--muted)', background: 'var(--border)',
              borderRadius: 20, padding: '1px 6px'
            }}>Tú</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: meta.color, background: meta.bg,
            borderRadius: 20, padding: '1px 6px',
          }}>
            {meta.icon} {meta.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ROLE_LABEL[m.role] || m.role}</span>
        </div>
      </div>
      {showActions && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {loading ? (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>...</span>
          ) : (
            <>
              {onApprove && <Btn size="xs" variant="success" onClick={onApprove}>✓ Aprobar</Btn>}
              {onSuspend && <Btn size="xs" variant="danger" onClick={onSuspend}>⊘ Suspender</Btn>}
              {onRoleChange && (
                <div style={{ position: 'relative' }}>
                  <Btn size="xs" variant="ghost" onClick={() => setShowRoles(!showRoles)}>
                    Rol ▾
                  </Btn>
                  {showRoles && (
                    <div style={{
                      position: 'absolute', right: 0, top: '100%', marginTop: 4,
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', zIndex: 20, minWidth: 140,
                      boxShadow: '0 4px 20px #00000055',
                    }}>
                      {['admin', 'member', 'kid'].map(role => (
                        <button key={role}
                          onClick={() => { onRoleChange(role); setShowRoles(false) }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '9px 14px', border: 'none', background: 'transparent',
                            color: m.role === role ? 'var(--blue)' : 'var(--text)',
                            fontFamily: 'var(--font-body)', fontSize: 12, cursor: 'pointer',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {ROLE_LABEL[role]}
                          {m.role === role && <span style={{ color: 'var(--blue)', marginLeft: 6 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── AccountsSection ───────────────────────────────────────────────────────────
// v4: un solo botón "Nueva cuenta" abre AccountModal unificado
function AccountsSection({ assetAccounts, creditAccounts, isFamilyAdmin, openModal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!isFamilyAdmin && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          fontSize: 12, color: 'var(--muted)',
        }}>
          🔒 Solo el administrador puede crear y editar cuentas
        </div>
      )}

      {/* Cuentas de activo */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            🏦 Cuentas de débito y ahorro ({assetAccounts.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('account')}>
              + Nueva cuenta
            </Btn>
          )}
        </div>
        {assetAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
            Sin cuentas configuradas
          </div>
        ) : (
          assetAccounts.map(acc => (
            <AccountRow key={acc.id} account={acc} isFamilyAdmin={isFamilyAdmin} />
          ))
        )}
      </Card>

      {/* Tarjetas de crédito */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            💳 Tarjetas y líneas de crédito ({creditAccounts.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('account')}>
              + Nueva tarjeta
            </Btn>
          )}
        </div>
        {creditAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
            Sin tarjetas configuradas
          </div>
        ) : (
          creditAccounts.map(acc => (
            <AccountRow key={acc.id} account={acc} isFamilyAdmin={isFamilyAdmin} isCredit />
          ))
        )}
      </Card>
    </div>
  )
}

// ── AccountRow ────────────────────────────────────────────────────────────────
function AccountRow({ account: a, isFamilyAdmin, isCredit }) {
  const [editing, setEditing] = useState(false)
  const cfg = ACCOUNT_SUBTYPES[a.subtype]

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: a.color + '18', border: `1px solid ${a.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {isCredit ? '💳' : cfg?.icon || '🏦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: a.color }}>
            {a.name}
            {a.last_four && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>···{a.last_four}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {cfg?.label}
            {a.institution && ` · ${a.institution}`}
            {a.owner_name && ` · ${a.owner_name}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isCredit ? (
            <div>
              <div className="mono" style={{ fontSize: 14, color: 'var(--red)' }}>
                {fmt(a.month_debt || 0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                de {fmt(a.credit_limit || 0)} límite
              </div>
              <div style={{ marginTop: 4 }}>
                <ProgressBar
                  value={a.month_debt || 0}
                  max={a.credit_limit || 1}
                  height={4}
                  color={pct(a.month_debt || 0, a.credit_limit || 1) > 80 ? 'var(--red)' : 'var(--yellow)'}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>
                {fmt(a.available || 0)} disponible
              </div>
            </div>
          ) : (
            <div className="mono" style={{
              fontSize: 14,
              color: (a.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {fmt(a.balance || 0)}
            </div>
          )}
        </div>
        {isFamilyAdmin && (
          <button onClick={() => setEditing(true)} title="Editar" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
            fontSize: 13, padding: '4px 6px', borderRadius: 4, transition: 'color .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            ✏️
          </button>
        )}
      </div>
      {editing && <EditAccountModal account={a} onClose={() => setEditing(false)} />}
    </>
  )
}

// ── PlansSection ──────────────────────────────────────────────────────────────
function PlansSection({ currentPlan, memberCount }) {
  const PLANS = [
    { id: 'free', price: '$0/mes', maxMem: 2, maxTxn: 50, hasKids: false, hasAI: false, hasStmt: false },
    { id: 'pro', price: '$9.99/mes', maxMem: 5, maxTxn: 500, hasKids: true, hasAI: false, hasStmt: true },
    { id: 'family', price: '$19.99/mes', maxMem: -1, maxTxn: -1, hasKids: true, hasAI: true, hasStmt: true },
  ]
  const maxForPlan = { free: 2, pro: 5, family: 999 }[currentPlan || 'free'] || 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {currentPlan !== 'family' && (
        <Card style={{ background: 'var(--bg)' }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Uso del plan {currentPlan?.toUpperCase()}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>Miembros activos</span>
            <span className="mono" style={{ color: memberCount >= maxForPlan ? 'var(--red)' : 'var(--text)' }}>
              {memberCount} / {maxForPlan}
            </span>
          </div>
          <ProgressBar value={memberCount} max={maxForPlan} height={5} />
        </Card>
      )}

      <div className="g3">
        {PLANS.map(plan => {
          const isActive = currentPlan === plan.id
          const color = PLAN_COLORS[plan.id] || '#5a6180'
          return (
            <div key={plan.id} style={{
              background: isActive ? color + '10' : 'var(--card)',
              border: `1px solid ${isActive ? color + '44' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: 16, position: 'relative',
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  fontSize: 9, fontWeight: 700, color, background: color + '22',
                  borderRadius: 20, padding: '1px 7px',
                }}>ACTUAL</div>
              )}
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 13, color, marginBottom: 4, textTransform: 'uppercase',
              }}>{plan.id}</div>
              <div className="mono" style={{ fontSize: 18, marginBottom: 12 }}>{plan.price}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 2 }}>
                <div>{plan.maxMem === -1 ? '∞' : plan.maxMem} miembros</div>
                <div>{plan.maxTxn === -1 ? '∞' : plan.maxTxn} transacciones</div>
                <div style={{ color: plan.hasKids ? 'var(--green)' : 'var(--muted)' }}>{plan.hasKids ? '✓' : '✗'} Módulo Kids</div>
                <div style={{ color: plan.hasStmt ? 'var(--green)' : 'var(--muted)' }}>{plan.hasStmt ? '✓' : '✗'} Estados financieros</div>
                <div style={{ color: plan.hasAI ? 'var(--blue)' : 'var(--muted)' }}>{plan.hasAI ? '✓' : '✗'} CFO IA</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}