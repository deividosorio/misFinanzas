// src/pages/Debts.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Vista informativa de deudas de largo plazo.
//
// CAMBIO DE DISEÑO:
//   Esta página ya NO acepta pagos directamente.
//   Los pagos se registran desde la página de Recurrentes,
//   donde cada pago recurrente puede vincularse a una deuda.
//   Esto refleja mejor la realidad: la hipoteca y el auto se pagan
//   mensualmente de forma recurrente, no de forma manual.
//
// QUÉ MUESTRA:
//   1. Resumen total de todas las deudas
//   2. Por cada deuda:
//      - Progreso de pago (barra visual)
//      - Métricas: pagado, restante, pagos estimados, interés total, fecha estimada
//      - Indicador del pago recurrente vinculado (si existe)
//      - Historial de los últimos pagos automáticos
//      - Botones: editar datos | eliminar
//
// CÓMO PAGAR:
//   El banner "¿Cómo registrar un pago?" guía al usuario a Recurrentes.
//   Si el recurrente tiene linked_debt_id, al marcarlo pagado
//   se abona automáticamente a la deuda correspondiente.
//
// NOTA: Los cálculos asumen cuota fija. Para hipotecas con renovación
// o tasa variable, el cálculo real diferiría. Se muestra como estimado.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import { EditDebtModal } from './EditModals'
import { DebtModal } from './Modals'
import { fmt, pct, toDay } from '../lib/constants'

export default function Debts() {
  const { t, debts, modal, openModal, setTab } = useApp()

  // Métricas globales de todas las deudas activas
  const totalDebt = useMemo(() => debts.reduce((s, d) => s + (d.total_amount || 0), 0), [debts])
  const totalPaid = useMemo(() => debts.reduce((s, d) => s + (d.paid_amount || 0), 0), [debts])
  const totalRemaining = totalDebt - totalPaid
  const totalMonthly = useMemo(() =>
    debts.reduce((s, d) => s + (d.monthly_payment || 0), 0), [debts])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Encabezado */}
      <SectionHeader
        title={t.debts}
        action={
          <Btn size="sm" variant="primary" onClick={() => openModal('debt')}>
            + {t.addDebt}
          </Btn>
        }
      />

      {/* ── RESUMEN GLOBAL ── */}
      {debts.length > 0 && (
        <div className="g4">
          {[
            { label: 'Deuda original total', value: fmt(totalDebt), color: 'var(--muted)' },
            { label: 'Total pagado', value: fmt(totalPaid), color: 'var(--green)' },
            { label: 'Total restante', value: fmt(totalRemaining), color: 'var(--red)' },
            { label: 'Pago mensual combinado', value: fmt(totalMonthly), color: 'var(--orange)' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px 16px',
            }}>
              <div className="lbl">{m.label}</div>
              <div className="mono" style={{ fontSize: 18, color: m.color, marginTop: 4 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BANNER INFORMATIVO: cómo registrar pagos ── */}
      {debts.length > 0 && (
        <div style={{
          background: '#4f7cff10',
          border: '1px solid #4f7cff33',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
                ¿Cómo registrar un pago de deuda?
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Ve a <strong>Recurrentes</strong>, selecciona el pago (ej: Hipoteca TD)
                y vincula la deuda correspondiente. Al marcarlo pagado,
                se abona automáticamente aquí.
              </div>
            </div>
          </div>
          <Btn
            size="sm"
            variant="ghost"
            style={{ color: 'var(--blue)', borderColor: 'var(--blue)33', flexShrink: 0 }}
            onClick={() => setTab('recurring')}
          >
            Ir a Recurrentes →
          </Btn>
        </div>
      )}

      {/* ── LISTA DE DEUDAS ── */}
      {debts.length === 0 ? (
        <Empty icon="🏦" message="Sin deudas registradas. ¡Excelente!" />
      ) : (
        debts.map(debt => <DebtCard key={debt.id} debt={debt} />)
      )}

      {/* Modal de nueva deuda */}
      {modal === 'debt' && <DebtModal />}
    </div>
  )
}

// ── DebtCard — tarjeta informativa de deuda ───────────────────────────────────
function DebtCard({ debt }) {
  const { t, deleteDebt, recurring, txns } = useApp()

  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  // Calcular métricas
  const paid = debt.paid_amount || 0
  const total = debt.total_amount || 0
  const monthly = debt.monthly_payment || 0
  const rate = debt.interest_rate || 0
  const remaining = total - paid
  const paidPct = pct(paid, total)
  const isCompleted = paid >= total

  // Pagos restantes estimados
  const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : 0

  // Interés total estimado (cuota fija)
  const totalInterest = monthly > 0 ? Math.max(0, (monthly * monthsLeft) - remaining) : 0

  // Fecha estimada de pago total
  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + monthsLeft)

  // Buscar el pago recurrente vinculado a esta deuda
  const linkedRecurring = recurring.find(r => r.linked_debt_id === debt.id)

  // Últimos pagos automáticos de esta deuda (máximo 3)
  const debtPayments = txns
    .filter(tx => tx.source_id === debt.id && tx.auto_source === 'debt_payment' && !tx.is_void)
    .slice(0, 3)

  const handleDelete = async () => {
    await deleteDebt(debt.id)
  }

  // Color de la barra de progreso según porcentaje pagado
  const barColor = paidPct >= 80 ? 'var(--green)'
    : paidPct >= 50 ? 'var(--blue)'
      : paidPct >= 25 ? 'var(--yellow)'
        : 'var(--red)'

  return (
    <>
      <Card accent={isCompleted ? 'var(--green)44' : undefined}>

        {/* ── CABECERA ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 14,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="h3">{debt.name}</div>
              {isCompleted && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--green)',
                  background: 'var(--green)18', borderRadius: 20, padding: '2px 8px',
                }}>
                  ✓ PAGADA
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
              {rate}% anual · Cuota estimada {fmt(monthly)}/mes
              {debt.start_date && ` · Inicio: ${debt.start_date}`}
            </div>
            {debt.notes && (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>
                {debt.notes}
              </div>
            )}
          </div>

          {/* Saldo restante + acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div className="mono" style={{
              fontSize: 22,
              color: isCompleted ? 'var(--green)' : 'var(--red)',
            }}>
              {fmt(remaining)}
            </div>

            <div style={{ display: 'flex', gap: 5 }}>
              <Btn size="xs" variant="ghost" onClick={() => setEditing(true)}>
                ✏️ Editar
              </Btn>
              {!confirmDel ? (
                <Btn size="xs" variant="danger" onClick={() => setConfirmDel(true)}>
                  ✕
                </Btn>
              ) : (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>¿Confirmar?</span>
                  <Btn size="xs" variant="danger" onClick={handleDelete}>Sí</Btn>
                  <Btn size="xs" variant="ghost" onClick={() => setConfirmDel(false)}>No</Btn>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BARRA DE PROGRESO ── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--muted)', marginBottom: 6,
          }}>
            <span>Pagado: {fmt(paid)} ({paidPct}%)</span>
            <span>Total original: {fmt(total)}</span>
          </div>
          <ProgressBar value={paid} max={total} height={12} color={barColor} />
        </div>

        {/* ── GRID DE MÉTRICAS ── */}
        <div className="g2" style={{ marginBottom: 14 }}>
          {[
            {
              label: t.paidAmount,
              value: fmt(paid),
              sub: `${paidPct}% del total`,
              color: 'var(--green)',
            },
            {
              label: t.remaining,
              value: fmt(remaining),
              sub: remaining > 0 ? `~${monthsLeft} pagos estimados` : 'Completada',
              color: remaining > 0 ? 'var(--red)' : 'var(--green)',
            },
            {
              label: t.estimatedPayoff,
              value: monthsLeft > 0
                ? payoffDate.toLocaleDateString('es-CA', { year: 'numeric', month: 'short' })
                : '—',
              sub: monthsLeft > 0 ? `${monthsLeft} meses` : '',
              color: 'var(--purple)',
            },
            {
              label: t.totalInterest,
              value: fmt(totalInterest),
              sub: 'estimado (cuota fija)',
              color: 'var(--yellow)',
            },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '10px 12px',
            }}>
              <div className="lbl">{m.label}</div>
              <div className="mono" style={{ fontSize: 14, color: m.color, marginTop: 2 }}>
                {m.value}
              </div>
              {m.sub && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{m.sub}</div>
              )}
            </div>
          ))}
        </div>

        {/* ── PAGO RECURRENTE VINCULADO ── */}
        {linkedRecurring ? (
          <div style={{
            background: 'var(--green)0a',
            border: '1px solid var(--green)33',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>↺</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                Pago recurrente vinculado
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                <strong style={{ color: 'var(--text)' }}>{linkedRecurring.name}</strong>
                {' · '}{fmt(linkedRecurring.amount)}/mes
                {' · Próximo: '}<strong style={{ color: 'var(--text)' }}>{linkedRecurring.next_due}</strong>
              </div>
            </div>
          </div>
        ) : (
          !isCompleted && (
            <div style={{
              background: 'var(--muted)0a',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 12,
              fontSize: 12,
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>💡</span>
              <span>
                Sin recurrente vinculado. Vincula uno desde{' '}
                <strong style={{ color: 'var(--text)' }}>Recurrentes → Editar → Vincular deuda</strong>
                {' '}para que los pagos se registren automáticamente.
              </span>
            </div>
          )
        )}

        {/* ── ÚLTIMOS PAGOS REGISTRADOS ── */}
        {debtPayments.length > 0 && (
          <div>
            <div className="lbl" style={{ marginBottom: 8 }}>Últimos pagos registrados</div>
            {debtPayments.map(tx => (
              <div key={tx.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, color: 'var(--green)', background: 'var(--green)14',
                    borderRadius: 4, padding: '1px 6px', fontWeight: 600
                  }}>
                    ↺ Auto
                  </span>
                  <span style={{ color: 'var(--muted)' }}>{tx.date}</span>
                  <span>{tx.description}</span>
                </div>
                <span className="mono" style={{ color: 'var(--red)', fontSize: 12 }}>
                  -{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── COMPLETADA ── */}
        {isCompleted && (
          <div style={{
            textAlign: 'center', padding: '16px 0',
            color: 'var(--green)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
          }}>
            🎉 ¡Deuda completamente pagada!
          </div>
        )}
      </Card>

      {editing && <EditDebtModal debt={debt} onClose={() => setEditing(false)} />}
    </>
  )
}