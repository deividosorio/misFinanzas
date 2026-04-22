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
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, PlanBadge, ProgressBar } from '../components/ui/index'
import { EditAccountModal } from './EditModals'
import { AccModal, PmModal } from './Modals'
import { PLAN_COLORS, fmt, pct } from '../lib/constants'

// Metadatos de estado de miembro para UI
const STATUS_META = {
  active:    { color:'var(--green)',  bg:'var(--green)18',  label:'Activo',     icon:'✓' },
  pending:   { color:'var(--yellow)', bg:'var(--yellow)18', label:'Pendiente',  icon:'⏳' },
  suspended: { color:'var(--red)',    bg:'var(--red)18',    label:'Suspendido', icon:'✕' },
}

// Etiquetas de rol
const ROLE_LABEL = {
  owner:  '👑 Propietario',
  admin:  '🛡️ Admin',
  member: '👤 Miembro',
  kid:    '⭐ Niño/a',
}

export default function Family() {
  const {
    t, family, members, profile,
    isFamilyAdmin, pendingMembers,
    setMemberStatus, setMemberRole,
    accounts, cards, bankAccounts,
    modal, openModal,
  } = useApp()

  // Tab activo: 'members' | 'accounts' | 'plans'
  const [activeTab, setActiveTab] = useState('members')

  const TABS = [
    { id:'members',  label:`👥 Miembros (${members.length})` },
    { id:'accounts', label:`🏦 Cuentas (${accounts.length})` },
    { id:'plans',    label:'📋 Planes'                        },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <SectionHeader title={t.family} />

      {/* ── TARJETA DE FAMILIA ── */}
      {family && <FamilyCard family={family} />}

      {/* Alerta de miembros pendientes (solo admin) */}
      {isFamilyAdmin && pendingMembers.length > 0 && (
        <PendingAlert
          count={pendingMembers.length}
          onGoToMembers={() => setActiveTab('members')}
        />
      )}

      {/* ── TABS DE NAVEGACIÓN ── */}
      <div style={{ display:'flex', gap:3, borderBottom:'1px solid var(--border)', paddingBottom:1 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background:   activeTab === tab.id ? 'var(--border)' : 'transparent',
              color:        activeTab === tab.id ? 'var(--text)'   : 'var(--muted)',
              border:       'none',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              padding:      '8px 14px',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
              fontSize:     13,
              fontWeight:   600,
              transition:   'all .15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO POR TAB ── */}
      {activeTab === 'members' && (
        <MembersSection
          members={members}
          profile={profile}
          isFamilyAdmin={isFamilyAdmin}
          isOwner={profile?.role === 'owner'}
          onSetStatus={setMemberStatus}
          onSetRole={setMemberRole}
        />
      )}

      {activeTab === 'accounts' && (
        <AccountsSection
          bankAccounts={bankAccounts}
          cards={cards}
          isFamilyAdmin={isFamilyAdmin}
          modal={modal}
          openModal={openModal}
        />
      )}

      {activeTab === 'plans' && (
        <PlansSection currentPlan={family?.plan} memberCount={members.filter(m=>m.status==='active').length} />
      )}

      {/* Modales de crear cuenta y tarjeta */}
      {modal === 'acc' && <AccModal />}
      {modal === 'pm'  && <PmModal />}
    </div>
  )
}

// ── FamilyCard ────────────────────────────────────────────────────────────────
function FamilyCard({ family }) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(family.invite_code || '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card style={{
      background:'linear-gradient(135deg, #0c1020, #111828)',
      border:'1px solid #1e2a44',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:16 }}>
        <div>
          <div className="h2">{family.name}</div>
          <div style={{ marginTop:6, display:'flex', gap:8, alignItems:'center' }}>
            <PlanBadge plan={family.plan} />
            <span style={{ fontSize:11, color:'var(--muted)' }}>{family.currency}</span>
          </div>
        </div>
      </div>

      {/* Código de invitación */}
      <div className="lbl" style={{ marginBottom:6 }}>{t.inviteCode}</div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <code style={{
          background:    'var(--bg)', border:'1px solid var(--border)',
          borderRadius:  'var(--radius-sm)', padding:'8px 14px',
          fontSize:      15, fontWeight:700, letterSpacing:2,
          color:         'var(--blue)', flex:1, userSelect:'all',
        }}>
          {family.invite_code}
        </code>
        <Btn size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </Btn>
      </div>
      <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>
        Comparte este código para que otros se unan — requieren aprobación del admin
      </div>
    </Card>
  )
}

// ── PendingAlert ──────────────────────────────────────────────────────────────
function PendingAlert({ count, onGoToMembers }) {
  return (
    <div style={{
      background:   '#fbbf2414',
      border:       '1px solid #fbbf2433',
      borderRadius: 'var(--radius-sm)',
      padding:      '10px 14px',
      display:      'flex',
      alignItems:   'center',
      justifyContent:'space-between',
      gap:          10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#fbbf24' }}>
        <span style={{ fontSize:16 }}>⏳</span>
        <span>
          <strong>{count}</strong> miembro{count > 1 ? 's' : ''} esperando aprobación
        </span>
      </div>
      <Btn size="xs" variant="subtle" onClick={onGoToMembers}>
        Ver → Miembros
      </Btn>
    </div>
  )
}

// ── MembersSection ────────────────────────────────────────────────────────────
function MembersSection({ members, profile, isFamilyAdmin, isOwner, onSetStatus, onSetRole }) {
  const [loadingId,  setLoadingId]  = useState(null)
  const [error,      setError]      = useState('')

  const pending   = members.filter(m => m.status === 'pending')
  const active    = members.filter(m => m.status === 'active')
  const suspended = members.filter(m => m.status === 'suspended')

  const changeStatus = async (id, status) => {
    setLoadingId(id)
    setError('')
    const { error: err } = await onSetStatus(id, status)
    if (err) setError(err.message)
    setLoadingId(null)
  }

  const changeRole = async (id, role) => {
    setLoadingId(id)
    setError('')
    const { error: err } = await onSetRole(id, role)
    if (err) setError(err.message)
    setLoadingId(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {error && (
        <div style={{
          background:'var(--red)14', border:'1px solid var(--red)33',
          borderRadius:8, padding:'8px 12px', color:'var(--red)', fontSize:12,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* PENDIENTES */}
      {pending.length > 0 && (
        <Card accent="var(--yellow)44">
          <div style={{
            fontFamily:'var(--font-display)', fontWeight:700,
            fontSize:13, color:'var(--yellow)', marginBottom:12,
          }}>
            ⏳ Esperando aprobación ({pending.length})
          </div>
          {pending.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              isMe={m.id === profile?.id}
              isAdmin={isFamilyAdmin}
              isOwner={isOwner}
              loading={loadingId === m.id}
              onApprove={() => changeStatus(m.id, 'active')}
              onSuspend={() => changeStatus(m.id, 'suspended')}
              onRoleChange={isOwner ? (role) => changeRole(m.id, role) : null}
            />
          ))}
        </Card>
      )}

      {/* ACTIVOS */}
      <Card>
        <div style={{
          fontFamily:'var(--font-display)', fontWeight:700,
          fontSize:13, marginBottom:12,
        }}>
          ✓ Activos ({active.length})
        </div>
        {active.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            isMe={m.id === profile?.id}
            isAdmin={isFamilyAdmin}
            isOwner={isOwner}
            loading={loadingId === m.id}
            onSuspend={m.role !== 'owner' && isFamilyAdmin ? () => changeStatus(m.id, 'suspended') : null}
            onRoleChange={isOwner && m.role !== 'owner' ? (role) => changeRole(m.id, role) : null}
          />
        ))}
      </Card>

      {/* SUSPENDIDOS */}
      {suspended.length > 0 && (
        <Card>
          <div style={{
            fontFamily:'var(--font-display)', fontWeight:700,
            fontSize:13, color:'var(--muted)', marginBottom:12,
          }}>
            🚫 Suspendidos ({suspended.length})
          </div>
          {suspended.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              isMe={m.id === profile?.id}
              isAdmin={isFamilyAdmin}
              isOwner={isOwner}
              loading={loadingId === m.id}
              onApprove={() => changeStatus(m.id, 'active')}
              onRoleChange={null}
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
  const statusMeta  = STATUS_META[m.status] || STATUS_META.active
  const showActions = isAdmin && !isMe && m.role !== 'owner'

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          12,
      padding:      '10px 0',
      borderBottom: '1px solid var(--border)',
      position:     'relative',
    }}>
      {/* Avatar circular */}
      <div style={{
        width:36, height:36, borderRadius:'50%', flexShrink:0,
        background:     m.avatar_color + '22',
        border:         `2px solid ${m.avatar_color}44`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       18,
      }}>
        {m.avatar_emoji}
      </div>

      {/* Info del miembro */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontWeight:600, fontSize:13 }}>{m.display_name}</span>
          {isMe && (
            <span style={{
              fontSize:9, color:'var(--muted)', background:'var(--border)',
              borderRadius:20, padding:'1px 6px',
            }}>Tú</span>
          )}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap', alignItems:'center' }}>
          {/* Badge de estado */}
          <span style={{
            fontSize:9, fontWeight:700, color:statusMeta.color,
            background:statusMeta.bg, borderRadius:20, padding:'1px 6px',
          }}>
            {statusMeta.icon} {statusMeta.label}
          </span>
          {/* Rol */}
          <span style={{ fontSize:11, color:'var(--muted)' }}>
            {ROLE_LABEL[m.role] || m.role}
          </span>
          {/* Kid */}
          {m.is_kid && (
            <span style={{ fontSize:10, color:'var(--yellow)' }}>⭐ Kid</span>
          )}
        </div>
      </div>

      {/* Acciones (solo para admin/owner, no para uno mismo, no para owner) */}
      {showActions && (
        <div style={{ display:'flex', gap:4, alignItems:'center', position:'relative' }}>
          {loading ? (
            <span style={{ fontSize:12, color:'var(--muted)' }}>...</span>
          ) : (
            <>
              {/* Aprobar (si está pendiente o suspendido) */}
              {onApprove && (
                <Btn size="xs" variant="success" onClick={onApprove}>
                  ✓ Aprobar
                </Btn>
              )}
              {/* Suspender (si está activo) */}
              {onSuspend && (
                <Btn size="xs" variant="danger" onClick={onSuspend}>
                  ⊘ Suspender
                </Btn>
              )}
              {/* Cambiar rol (solo owner) */}
              {onRoleChange && (
                <div style={{ position:'relative' }}>
                  <Btn size="xs" variant="ghost" onClick={() => setShowRoles(!showRoles)}>
                    Rol ▾
                  </Btn>
                  {showRoles && (
                    <div style={{
                      position:'absolute', right:0, top:'100%', marginTop:4,
                      background:'var(--card)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius-sm)', zIndex:20, minWidth:140,
                      boxShadow:'0 4px 20px #00000055',
                    }}>
                      {['admin','member','kid'].map(role => (
                        <button
                          key={role}
                          onClick={() => { onRoleChange(role); setShowRoles(false) }}
                          style={{
                            display:'block', width:'100%', textAlign:'left',
                            padding:'9px 14px', border:'none', background:'transparent',
                            color: m.role === role ? 'var(--blue)' : 'var(--text)',
                            fontFamily:'var(--font-body)', fontSize:12,
                            cursor:'pointer', transition:'background .1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {ROLE_LABEL[role]}
                          {m.role === role && <span style={{ color:'var(--blue)', marginLeft:6 }}>✓</span>}
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

// ── AccountsSection ────────────────────────────────────────────────────────────
function AccountsSection({ bankAccounts, cards, isFamilyAdmin, modal, openModal }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Solo admin/owner puede gestionar cuentas */}
      {!isFamilyAdmin && (
        <div style={{
          background:'var(--bg)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', padding:'10px 14px',
          fontSize:12, color:'var(--muted)',
        }}>
          🔒 Solo el administrador puede crear y editar cuentas
        </div>
      )}

      {/* ── CUENTAS BANCARIAS ── */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>
            🏦 Cuentas bancarias ({bankAccounts.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('acc')}>
              + Nueva cuenta
            </Btn>
          )}
        </div>

        {bankAccounts.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'var(--muted)', fontSize:13 }}>
            Sin cuentas configuradas
          </div>
        ) : (
          bankAccounts.map(acc => (
            <AccountRow key={acc.id} account={acc} isFamilyAdmin={isFamilyAdmin} />
          ))
        )}
      </Card>

      {/* ── TARJETAS DE CRÉDITO / DÉBITO ── */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14 }}>
            💳 Tarjetas ({cards.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('pm')}>
              + Nueva tarjeta
            </Btn>
          )}
        </div>

        {cards.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'var(--muted)', fontSize:13 }}>
            Sin tarjetas configuradas
          </div>
        ) : (
          cards.map(card => (
            <AccountRow key={card.id} account={card} isFamilyAdmin={isFamilyAdmin} isCard />
          ))
        )}
      </Card>
    </div>
  )
}

// ── AccountRow ────────────────────────────────────────────────────────────────
function AccountRow({ account: acc, isFamilyAdmin, isCard }) {
  const [editing, setEditing] = useState(false)
  const { fmt: _ } = useApp() // no necesitamos esto, importamos fmt directamente

  return (
    <>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '10px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Indicador de color */}
        <div style={{
          width:36, height:36, borderRadius:'var(--radius-sm)',
          background:     acc.color + '18',
          border:         `1px solid ${acc.color}44`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       18,
          flexShrink:     0,
        }}>
          {isCard ? '💳' : '🏦'}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:13, color:acc.color }}>
            {acc.name}
            {acc.last_four && <span style={{ color:'var(--muted)', fontWeight:400, marginLeft:4 }}>···{acc.last_four}</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
            {acc.institution && `${acc.institution} · `}
            {acc.owner_name && `${acc.owner_name}`}
            {acc.credit_limit && ` · Límite: ${fmt(acc.credit_limit)}`}
          </div>
        </div>

        {/* Saldo o gasto */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div className="mono" style={{
            fontSize:14,
            color: isCard ? 'var(--red)' : (acc.balance >= 0 ? 'var(--green)' : 'var(--red)'),
          }}>
            {fmt(isCard ? (acc.balance || 0) : (acc.balance || 0))}
          </div>
          {isCard && acc.credit_limit && (
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
              de {fmt(acc.credit_limit)}
            </div>
          )}
        </div>

        {/* Botón editar (solo admin) */}
        {isFamilyAdmin && (
          <button
            onClick={() => setEditing(true)}
            title="Editar cuenta"
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--muted)', fontSize:13, padding:'4px 6px',
              borderRadius:4, transition:'color .12s', flexShrink:0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            ✏️
          </button>
        )}
      </div>

      {/* Modal de edición */}
      {editing && (
        <EditAccountModal
          account={acc}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

// ── PlansSection ──────────────────────────────────────────────────────────────
function PlansSection({ currentPlan, memberCount }) {
  const PLANS = [
    {
      id:       'free',
      price:    '$0 / mes',
      maxMem:   2,
      maxTxn:   50,
      hasKids:  false,
      hasAI:    false,
      hasStmt:  false,
    },
    {
      id:       'pro',
      price:    '$9.99 / mes',
      maxMem:   5,
      maxTxn:   500,
      hasKids:  true,
      hasAI:    false,
      hasStmt:  true,
    },
    {
      id:       'family',
      price:    '$19.99 / mes',
      maxMem:   -1,
      maxTxn:   -1,
      hasKids:  true,
      hasAI:    true,
      hasStmt:  true,
    },
  ]

  const maxForCurrentPlan = { free:2, pro:5, family:999 }[currentPlan || 'free'] || 2

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Uso actual del plan */}
      {currentPlan !== 'family' && (
        <Card style={{ background:'var(--bg)' }}>
          <div className="lbl" style={{ marginBottom:8 }}>
            Uso del plan {currentPlan?.toUpperCase()}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
            <span>Miembros activos</span>
            <span className="mono" style={{
              color: memberCount >= maxForCurrentPlan ? 'var(--red)' : 'var(--text)',
            }}>
              {memberCount} / {maxForCurrentPlan}
            </span>
          </div>
          <ProgressBar
            value={memberCount}
            max={maxForCurrentPlan}
            height={5}
          />
          {memberCount >= maxForCurrentPlan && (
            <div style={{ fontSize:11, color:'var(--red)', marginTop:6 }}>
              ⚠️ Límite de miembros alcanzado — actualiza tu plan
            </div>
          )}
        </Card>
      )}

      {/* Comparación de planes */}
      <div className="g3">
        {PLANS.map(plan => {
          const isActive = currentPlan === plan.id
          const color    = PLAN_COLORS[plan.id]

          return (
            <div
              key={plan.id}
              style={{
                background:   isActive ? color + '10' : 'var(--card)',
                border:       `1px solid ${isActive ? color + '44' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding:      16,
                position:     'relative',
                transition:   'border .2s',
              }}
            >
              {/* Badge activo */}
              {isActive && (
                <div style={{
                  position:'absolute', top:8, right:8,
                  fontSize:9, fontWeight:700, color, background:color+'22',
                  borderRadius:20, padding:'1px 7px',
                }}>
                  ACTUAL
                </div>
              )}

              <div style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    800,
                fontSize:      13,
                color,
                marginBottom:  4,
                textTransform: 'uppercase',
              }}>
                {plan.id}
              </div>

              <div className="mono" style={{ fontSize:18, marginBottom:12 }}>
                {plan.price}
              </div>

              <div style={{ fontSize:11, color:'var(--muted)', lineHeight:2 }}>
                <div>
                  {plan.maxMem === -1 ? '∞' : plan.maxMem} miembros
                </div>
                <div>
                  {plan.maxTxn === -1 ? '∞' : plan.maxTxn} transacciones
                </div>
                <div style={{ color: plan.hasKids ? 'var(--green)' : 'var(--muted)' }}>
                  {plan.hasKids ? '✓' : '✗'} Módulo Kids
                </div>
                <div style={{ color: plan.hasStmt ? 'var(--green)' : 'var(--muted)' }}>
                  {plan.hasStmt ? '✓' : '✗'} Estados financieros
                </div>
                <div style={{ color: plan.hasAI ? 'var(--blue)' : 'var(--muted)' }}>
                  {plan.hasAI ? '✓' : '✗'} CFO IA
                </div>
              </div>

              {!isActive && (
                <Btn
                  size="xs"
                  variant="ghost"
                  style={{ width:'100%', marginTop:12, color, borderColor:color+'44' }}
                  onClick={() => {}} // Integrar con Stripe en producción
                >
                  {plan.id === 'free' ? 'Bajar plan' : 'Actualizar'}
                </Btn>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        fontSize:11, color:'var(--muted)',
        background:'var(--bg)', borderRadius:'var(--radius-sm)', padding:'10px 14px',
      }}>
        💡 El upgrade a planes pagos se integra con Stripe.
        Contacta soporte para activar tu plan Pro o Family.
      </div>
    </div>
  )
}