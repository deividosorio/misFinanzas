// src/pages/Recurring.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión de pagos periódicos con integración de deudas.
//
// NUEVA FUNCIONALIDAD — VINCULACIÓN DE DEUDA:
//   Cada pago recurrente puede estar vinculado a una deuda registrada.
//   Campo: linked_debt_id (referencia a debts.id)
//
//   Si el recurrente TIENE linked_debt_id:
//     → Al marcar como pagado: avanza next_due + crea transacción + abona a la deuda
//     → Muestra un badge "Abona a: [Nombre de Deuda]"
//     → La deuda recibe el crédito automáticamente sin entrada manual
//
//   Si el recurrente NO TIENE linked_debt_id:
//     → Al marcar como pagado: avanza next_due + crea solo la transacción
//     → Comportamiento anterior
//
// FLUJO DE MARCAR PAGADO:
//   Clic en "Marcar pagado"
//     → Si tiene deuda vinculada: muestra confirmación con desglose
//     → Si NO tiene: pregunta si quiere vincular a una deuda (opcional)
//     → Confirmar → markRecPaid() → auto-transacción + abono en deuda
//
// SEMÁFORO:
//   🔴 overdue   → vencido (next_due < hoy)
//   🟡 dueSoon   → próximos 5 días
//   🟢 upToDate  → más de 5 días
//
// EDICIÓN:
//   El modal de edición incluye el selector de deuda vinculada.
//   El usuario puede desvincular seleccionando "Sin deuda vinculada".
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Recurring.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v4:
//   - RecurringCard muestra el ícono y tipo de cuenta (débito vs crédito)
//   - PayConfirmModal distingue si el pago va a cuenta débito o tarjeta crédito
//   - Se importa ACCOUNT_SUBTYPES y CREDIT_SUBTYPES de constants
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, Empty } from '../components/ui/index'
import { EditRecurringModal } from './EditModals'
import { RecurringModal } from './Modals'
import { fmt, toDay, ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../lib/constants'

const DUE_SOON_DAYS = 5

function daysUntil(dateStr) {
  if (!dateStr) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

function getStatus(dateStr) {
  const d = daysUntil(dateStr)
  if (d < 0) return 'overdue'
  if (d <= DUE_SOON_DAYS) return 'dueSoon'
  return 'upToDate'
}

const STATUS_META = {
  overdue: { color: 'var(--red)', bg: '#ff6b6b15', icon: '🔴', label: 'Vencido' },
  dueSoon: { color: 'var(--yellow)', bg: '#fbbf2415', icon: '🟡', label: 'Próximo' },
  upToDate: { color: 'var(--green)', bg: '#2dd4a015', icon: '🟢', label: 'Al día' },
}

export default function Recurring() {
  const { t, recurring, modal, openModal } = useApp()
  const [statusFilter, setStatusFilter] = useState('all')

  const monthlyTotal = useMemo(() =>
    recurring.filter(r => r.is_active !== false && r.frequency === 'monthly')
      .reduce((s, r) => s + (r.amount || 0), 0)
    , [recurring])

  const yearlyTotal = useMemo(() =>
    recurring.filter(r => r.is_active !== false).reduce((s, r) => {
      const mult = { weekly: 52, biweekly: 26, monthly: 12, yearly: 1 }[r.frequency] || 12
      return s + (r.amount || 0) * mult
    }, 0)
    , [recurring])

  const counts = useMemo(() => ({
    overdue: recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'overdue').length,
    dueSoon: recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'dueSoon').length,
    upToDate: recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'upToDate').length,
  }), [recurring])

  const visible = useMemo(() => {
    const active = recurring.filter(r => r.is_active !== false)
    return statusFilter === 'all' ? active : active.filter(r => getStatus(r.next_due) === statusFilter)
  }, [recurring, statusFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader
        title={t.recurring}
        action={<Btn size="sm" variant="primary" onClick={() => openModal('recurring')}>+ {t.addRecurring}</Btn>}
      />

      {/* Resumen */}
      {recurring.length > 0 && (
        <div className="g2">
          {[
            {
              label: 'Comprometido mensualmente', value: fmt(monthlyTotal), color: 'var(--red)',
              sub: `${recurring.filter(r => r.frequency === 'monthly').length} pagos mensuales`
            },
            {
              label: 'Proyección anual', value: fmt(yearlyTotal), color: 'var(--orange)',
              sub: `${recurring.length} pagos configurados`
            },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
            }}>
              <div className="lbl">{m.label}</div>
              <div className="mono" style={{ fontSize: 22, color: m.color, marginTop: 4 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {recurring.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn size="sm" variant={statusFilter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('all')}>
            Todos ({recurring.filter(r => r.is_active !== false).length})
          </Btn>
          {counts.overdue > 0 && (
            <Btn size="sm"
              variant={statusFilter === 'overdue' ? 'danger' : 'ghost'}
              style={statusFilter !== 'overdue' ? { color: 'var(--red)', borderColor: 'var(--red)33' } : {}}
              onClick={() => setStatusFilter('overdue')}>
              🔴 {t.overdue} ({counts.overdue})
            </Btn>
          )}
          {counts.dueSoon > 0 && (
            <Btn size="sm"
              variant={statusFilter === 'dueSoon' ? 'subtle' : 'ghost'}
              style={statusFilter !== 'dueSoon' ? { color: 'var(--yellow)', borderColor: 'var(--yellow)33' } : {}}
              onClick={() => setStatusFilter('dueSoon')}>
              🟡 {t.dueSoon} ({counts.dueSoon})
            </Btn>
          )}
          <Btn size="sm"
            variant={statusFilter === 'upToDate' ? 'success' : 'ghost'}
            style={statusFilter !== 'upToDate' ? { color: 'var(--green)', borderColor: 'var(--green)33' } : {}}
            onClick={() => setStatusFilter('upToDate')}>
            🟢 {t.upToDate} ({counts.upToDate})
          </Btn>
        </div>
      )}

      {/* Lista */}
      {visible.length === 0 ? (
        <Empty icon="↺" message={t.noData} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {visible.map(rec => <RecurringCard key={rec.id} rec={rec} />)}
        </div>
      )}

      {modal === 'recurring' && <RecurringModal />}
    </div>
  )
}

// ── RecurringCard ─────────────────────────────────────────────────────────────
function RecurringCard({ rec }) {
  const { t, markRecPaid, deleteRecurring, debts, getAccount } = useApp()

  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)

  const status = getStatus(rec.next_due)
  const statusMeta = STATUS_META[status]
  const days = daysUntil(rec.next_due)

  const daysLabel = days < 0
    ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
    : days === 0 ? '¡Hoy!'
      : days === 1 ? 'Mañana'
        : `En ${days} días`

  const freqLabel = {
    monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal', yearly: 'Anual',
  }[rec.frequency] || rec.frequency

  // v4: cuenta vinculada al recurrente (puede ser débito o crédito)
  const account = getAccount(rec.account_id)
  const isCredit = account ? CREDIT_SUBTYPES.includes(account.subtype) : false
  const accCfg = account ? ACCOUNT_SUBTYPES[account.subtype] : null

  // Deuda vinculada
  const linkedDebt = debts.find(d => d.id === rec.linked_debt_id)

  const handleConfirmPay = async () => {
    setPayLoading(true)
    const { error } = await markRecPaid(rec.id)
    if (!error) {
      setPaySuccess(true)
      setShowPayModal(false)
      setTimeout(() => setPaySuccess(false), 3000)
    }
    setPayLoading(false)
  }

  return (
    <>
      <Card accent={
        status === 'overdue' ? 'var(--red)44' :
          status === 'dueSoon' ? 'var(--yellow)33' : undefined
      }>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: statusMeta.color, background: statusMeta.bg,
              borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 6,
            }}>
              {statusMeta.icon} {statusMeta.label}
            </span>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{rec.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              {freqLabel} · {t.cats?.[rec.category] || rec.category}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <IconBtn icon="✏️" hoverColor="var(--blue)" title="Editar"
              onClick={() => setEditing(true)} />
            {!confirmDel ? (
              <IconBtn icon="✕" hoverColor="var(--red)" title="Eliminar"
                onClick={() => setConfirmDel(true)} />
            ) : (
              <div style={{ display: 'flex', gap: 3 }}>
                <Btn size="xs" variant="danger" onClick={() => deleteRecurring(rec.id)}>Sí</Btn>
                <Btn size="xs" variant="ghost" onClick={() => setConfirmDel(false)}>No</Btn>
              </div>
            )}
          </div>
        </div>

        {/* Monto */}
        <div className="mono" style={{ fontSize: 24, marginBottom: 10 }}>{fmt(rec.amount)}</div>

        {/* Próximo pago + días */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div className="lbl">{t.nextDue}</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{rec.next_due}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: statusMeta.color }}>
              {daysLabel}
            </div>
          </div>
        </div>

        {/* v4: Cuenta vinculada con indicador de tipo */}
        {account && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
            fontSize: 11,
            color: isCredit ? 'var(--red)' : account.color,
          }}>
            <span>{isCredit ? '💳' : accCfg?.icon || '🏦'}</span>
            <span style={{ fontWeight: 500 }}>{account.name}</span>
            {account.last_four && <span style={{ color: 'var(--muted)' }}>···{account.last_four}</span>}
            <span style={{ color: 'var(--muted)', fontSize: 10 }}>
              · {isCredit ? 'Crédito' : 'Débito'}
            </span>
          </div>
        )}

        {/* Deuda vinculada */}
        {linkedDebt && (
          <div style={{
            background: 'var(--orange)0a', border: '1px solid var(--orange)33',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>▣</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--orange)' }}>
                Abona a deuda
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {linkedDebt.name} · {fmt(linkedDebt.total_amount - linkedDebt.paid_amount)} restante
              </div>
            </div>
          </div>
        )}

        {rec.notes && (
          <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 10 }}>
            {rec.notes}
          </div>
        )}

        {/* Botón de pago */}
        {paySuccess ? (
          <div style={{
            background: 'var(--green)14', border: '1px solid var(--green)33',
            borderRadius: 'var(--radius-sm)', padding: '9px 12px',
            fontSize: 12, color: 'var(--green)', textAlign: 'center',
          }}>
            ✓ Pagado{linkedDebt ? ` · Abonado a ${linkedDebt.name}` : ''} · Próximo: {rec.next_due}
          </div>
        ) : (
          <Btn variant="success" size="sm" style={{ width: '100%' }}
            onClick={() => setShowPayModal(true)}>
            ✓ {t.markPaid}
          </Btn>
        )}

        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>
          ↺ Crea movimiento automático
          {linkedDebt && ' · Abona a la deuda'}
        </div>
      </Card>

      {/* Modal de confirmación de pago */}
      {showPayModal && (
        <PayConfirmModal
          rec={rec}
          account={account}
          isCredit={isCredit}
          accCfg={accCfg}
          linkedDebt={linkedDebt}
          loading={payLoading}
          onConfirm={handleConfirmPay}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {editing && <EditRecurringModal rec={rec} onClose={() => setEditing(false)} />}
    </>
  )
}

// ── PayConfirmModal ───────────────────────────────────────────────────────────
function PayConfirmModal({ rec, account, isCredit, accCfg, linkedDebt, loading, onConfirm, onClose }) {
  const today = toDay()

  // Calcular próxima fecha
  const nx = new Date(rec.next_due)
  if (rec.frequency === 'monthly') nx.setMonth(nx.getMonth() + 1)
  else if (rec.frequency === 'yearly') nx.setMonth(nx.getMonth() + 12)
  else if (rec.frequency === 'biweekly') nx.setDate(nx.getDate() + 14)
  else nx.setDate(nx.getDate() + 7)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: '#00000088', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 26, width: '100%', maxWidth: 420,
        boxShadow: '0 8px 40px #00000055',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
          ✓ Confirmar pago
        </div>

        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 14,
        }}>
          {/* Nombre y monto */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{rec.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {today} · {{ monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal', yearly: 'Anual' }[rec.frequency]}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 18, color: 'var(--red)' }}>
              {fmt(rec.amount)}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Transacción automática */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'var(--purple)', background: 'var(--purple)18',
                borderRadius: 20, padding: '2px 7px', flexShrink: 0, marginTop: 1,
              }}>AUTO</span>
              <span>
                Transacción de gasto por <strong style={{ color: 'var(--text)' }}>{fmt(rec.amount)}</strong>
              </span>
            </div>

            {/* v4: Indicador de tipo de cuenta */}
            {account && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: isCredit ? 'var(--red)' : 'var(--green)',
                  background: isCredit ? '#ff6b6b18' : '#2dd4a018',
                  borderRadius: 20, padding: '2px 7px', flexShrink: 0, marginTop: 1,
                }}>
                  {isCredit ? 'CRÉDITO' : 'DÉBITO'}
                </span>
                <span>
                  {isCredit ? (
                    <>
                      Aumentará la deuda de{' '}
                      <strong style={{ color: 'var(--text)' }}>{account.name}</strong>
                      {account.last_four && ` ···${account.last_four}`}
                    </>
                  ) : (
                    <>
                      Se descontará del saldo de{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        {accCfg?.icon} {account.name}
                      </strong>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Abono a deuda si está vinculada */}
            {linkedDebt && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: 'var(--orange)', background: 'var(--orange)18',
                  borderRadius: 20, padding: '2px 7px', flexShrink: 0, marginTop: 1,
                }}>DEUDA</span>
                <span>
                  Se abonará <strong style={{ color: 'var(--text)' }}>{fmt(rec.amount)}</strong>{' '}
                  a <strong style={{ color: 'var(--orange)' }}>{linkedDebt.name}</strong>
                  {' '}(restante: {fmt(linkedDebt.total_amount - linkedDebt.paid_amount)})
                </span>
              </div>
            )}

            {/* Nueva fecha */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue)18',
                borderRadius: 20, padding: '2px 7px', flexShrink: 0, marginTop: 1,
              }}>FECHA</span>
              <span>
                Próximo vencimiento:{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {nx.toLocaleDateString('es-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" style={{ flex: 1 }} onClick={onClose} disabled={loading}>
            Cancelar
          </Btn>
          <Btn variant="success" style={{ flex: 2 }} onClick={onConfirm} disabled={loading}>
            {loading ? 'Registrando...' : `✓ Confirmar ${fmt(rec.amount)}`}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── IconBtn ───────────────────────────────────────────────────────────────────
function IconBtn({ icon, title, onClick, hoverColor }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--muted)', fontSize: 13, padding: '3px 5px',
      borderRadius: 4, transition: 'color .12s', lineHeight: 1,
    }}
      onMouseEnter={e => e.currentTarget.style.color = hoverColor || 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
    >
      {icon}
    </button>
  )
}