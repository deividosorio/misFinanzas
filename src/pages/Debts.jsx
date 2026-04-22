// src/pages/Debts.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión completa de deudas de largo plazo.
//
// FUNCIONALIDADES:
//   1. Lista de deudas con progreso visual de pago
//   2. Métricas calculadas: restante, pagos pendientes, fecha estimada, interés total
//   3. Input de pago → payDebt() → AUTO-CREA transacción de tipo 'expense'
//   4. Editar deuda → EditDebtModal (nombre, monto, cuota, tasa, fecha inicio)
//   5. Eliminar deuda (con confirmación inline)
//   6. Crear nueva deuda → DebtModal
//   7. Indicador visual cuando la deuda está completamente pagada
//
// AUTO-TRANSACCIÓN AL PAGAR:
//   Cuando el usuario registra un pago, payDebt() en AppContext:
//   1. Actualiza paid_amount en la deuda
//   2. Crea automáticamente una transacción: { type:'expense', auto_source:'debt_payment' }
//   3. La idempotencia evita duplicados si se llama dos veces
//
// CÁLCULOS DE AMORTIZACIÓN (simplificados, cuota fija):
//   remaining       = total - paid
//   months_left     = ceil(remaining / monthly_payment)
//   total_interest  = (monthly_payment * months_left) - remaining
//   payoff_date     = hoy + months_left meses
//
// NOTA: Los cálculos asumen cuota fija. Para hipotecas con renovación
// o tasa variable, el cálculo real diferiría. Se muestra como estimado.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import { EditDebtModal } from './EditModals'
import { DebtModal } from './Modals'
import { fmt, pct, toDay } from '../lib/constants'

export default function Debts() {
  const { t, debts, modal, openModal } = useApp()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Encabezado con botón de nueva deuda */}
      <SectionHeader
        title={t.debts}
        action={
          <Btn size="sm" variant="primary" onClick={() => openModal('debt')}>
            + {t.addDebt}
          </Btn>
        }
      />

      {/* Resumen total */}
      {debts.length > 0 && <DebtsSummary debts={debts} />}

      {/* Lista de deudas */}
      {debts.length === 0 ? (
        <Empty icon="🏦" message="Sin deudas registradas. ¡Excelente!" />
      ) : (
        debts.map(debt => (
          <DebtCard key={debt.id} debt={debt} />
        ))
      )}

      {/* Modal de nueva deuda */}
      {modal === 'debt' && <DebtModal />}
    </div>
  )
}

// ── DebtsSummary — Resumen total de todas las deudas ──────────────────────────
function DebtsSummary({ debts }) {
  const totalDebt      = debts.reduce((s, d) => s + (d.total_amount || 0), 0)
  const totalPaid      = debts.reduce((s, d) => s + (d.paid_amount  || 0), 0)
  const totalRemaining = totalDebt - totalPaid

  return (
    <div className="g3">
      {[
        { label:'Deuda total original', value:fmt(totalDebt),     color:'var(--muted)'  },
        { label:'Total pagado',         value:fmt(totalPaid),     color:'var(--green)'  },
        { label:'Total restante',       value:fmt(totalRemaining),color:'var(--red)'    },
      ].map(s => (
        <div key={s.label} style={{
          background:   'var(--card)', border:'1px solid var(--border)',
          borderRadius: 'var(--radius)', padding:'14px 16px',
        }}>
          <div className="lbl">{s.label}</div>
          <div className="mono" style={{ fontSize:18, color:s.color, marginTop:4 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── DebtCard — Tarjeta individual de deuda ────────────────────────────────────
function DebtCard({ debt }) {
  const { t, payDebt, deleteDebt } = useApp()

  // Estado local del input de pago
  const [payInput,    setPayInput]    = useState('')
  const [payLoading,  setPayLoading]  = useState(false)
  const [payError,    setPayError]    = useState('')
  const [paySuccess,  setPaySuccess]  = useState('')

  // Controla si el modal de edición está abierto
  const [editing, setEditing] = useState(false)

  // Controla si se muestra la confirmación de eliminación
  const [confirmDel, setConfirmDel] = useState(false)

  // ── Calcular métricas ────────────────────────────────────────────────────
  const paid      = debt.paid_amount     || 0
  const total     = debt.total_amount    || 0
  const monthly   = debt.monthly_payment || 0
  const rate      = debt.interest_rate   || 0
  const remaining = total - paid

  // Número de pagos restantes (redondeado hacia arriba)
  const monthsLeft    = monthly > 0 ? Math.ceil(remaining / monthly) : 0

  // Interés total estimado = lo que pagarías con cuota fija - lo que queda del capital
  const totalInterest = monthly > 0 ? Math.max(0, (monthly * monthsLeft) - remaining) : 0

  // Fecha estimada de pago total
  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + monthsLeft)

  // Porcentaje pagado
  const paidPct = pct(paid, total)
  const isCompleted = paid >= total

  // ── Registrar pago ───────────────────────────────────────────────────────
  const handlePay = async () => {
    const amount = parseFloat(payInput)
    if (isNaN(amount) || amount <= 0) {
      setPayError('Ingresa un monto válido mayor que cero')
      return
    }
    if (amount > remaining) {
      setPayError(`El monto supera el saldo restante de ${fmt(remaining)}`)
      return
    }

    setPayLoading(true)
    setPayError('')
    const { error } = await payDebt(debt.id, amount)
    if (error) {
      setPayError(error.message)
    } else {
      setPaySuccess(`✓ Pago de ${fmt(amount)} registrado + transacción creada automáticamente`)
      setPayInput('')
      setTimeout(() => setPaySuccess(''), 3500)
    }
    setPayLoading(false)
  }

  // ── Eliminar deuda ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    await deleteDebt(debt.id)
  }

  return (
    <>
      <Card accent={isCompleted ? 'var(--green)44' : undefined}>

        {/* ── CABECERA: nombre + acciones ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className="h3">{debt.name}</div>
              {isCompleted && (
                <span style={{
                  fontSize:10, fontWeight:700, color:'var(--green)',
                  background:'var(--green)18', borderRadius:20, padding:'2px 8px',
                }}>
                  ✓ PAGADA
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              {rate}% anual · {fmt(monthly)}/mes
              {debt.start_date && ` · Desde ${debt.start_date}`}
            </div>
            {debt.notes && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2, fontStyle:'italic' }}>
                {debt.notes}
              </div>
            )}
          </div>

          {/* Monto restante + botones de acción */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <div className="mono" style={{
              fontSize: 20,
              color: isCompleted ? 'var(--green)' : 'var(--red)',
            }}>
              {fmt(remaining)}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <Btn
                size="xs"
                variant="ghost"
                onClick={() => setEditing(true)}
                title="Editar datos de la deuda"
              >
                ✏️ Editar
              </Btn>
              {!confirmDel ? (
                <Btn
                  size="xs"
                  variant="danger"
                  onClick={() => setConfirmDel(true)}
                  title="Eliminar deuda"
                >
                  ✕
                </Btn>
              ) : (
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>¿Confirmar?</span>
                  <Btn size="xs" variant="danger"  onClick={handleDelete}>Sí</Btn>
                  <Btn size="xs" variant="ghost"   onClick={() => setConfirmDel(false)}>No</Btn>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BARRA DE PROGRESO ── */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, color:'var(--muted)' }}>
              Pagado: {fmt(paid)} ({paidPct}%)
            </span>
            <span style={{ fontSize:11, color:'var(--muted)' }}>
              Total: {fmt(total)}
            </span>
          </div>
          {/* Color gradiente: más verde conforme se paga más */}
          <ProgressBar value={paid} max={total} height={10} color={
            paidPct >= 80 ? 'var(--green)' :
            paidPct >= 50 ? 'var(--blue)' :
            paidPct >= 25 ? 'var(--yellow)' : 'var(--red)'
          } />
        </div>

        {/* ── GRID DE MÉTRICAS ── */}
        <div className="g2" style={{ marginBottom:14 }}>
          {[
            {
              label: t.paidAmount,
              value: fmt(paid),
              sub:   `${paidPct}% del total`,
              color: 'var(--green)',
            },
            {
              label: t.remaining,
              value: fmt(remaining),
              sub:   monthsLeft > 0 ? `~${monthsLeft} ${t.paymentsLeft}` : 'Sin cuota definida',
              color: remaining > 0 ? 'var(--red)' : 'var(--green)',
            },
            {
              label: t.estimatedPayoff,
              value: monthsLeft > 0
                ? payoffDate.toLocaleDateString('es-CA', { year:'numeric', month:'short' })
                : '—',
              sub:   '',
              color: 'var(--purple)',
            },
            {
              label: t.totalInterest,
              value: fmt(totalInterest),
              sub:   'estimado (cuota fija)',
              color: 'var(--yellow)',
            },
          ].map(m => (
            <div key={m.label} style={{
              background:   'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              padding:      '10px 12px',
              border:       '1px solid var(--border)',
            }}>
              <div className="lbl">{m.label}</div>
              <div className="mono" style={{ fontSize:14, color:m.color, marginTop:2 }}>
                {m.value}
              </div>
              {m.sub && (
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>
                  {m.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── SECCIÓN DE PAGO (solo si no está completada) ── */}
        {!isCompleted && (
          <div>
            {/* Mensajes de error/éxito */}
            {payError && (
              <div style={{
                background:'var(--red)10', border:'1px solid var(--red)33',
                borderRadius:6, padding:'7px 10px', fontSize:12, color:'var(--red)', marginBottom:8,
              }}>
                ⚠️ {payError}
              </div>
            )}
            {paySuccess && (
              <div style={{
                background:'var(--green)10', border:'1px solid var(--green)33',
                borderRadius:6, padding:'7px 10px', fontSize:12, color:'var(--green)', marginBottom:8,
              }}>
                {paySuccess}
              </div>
            )}

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              {/* Input de monto a pagar */}
              <input
                type="number"
                value={payInput}
                onChange={e => setPayInput(e.target.value)}
                placeholder={monthly > 0 ? `Cuota: ${fmt(monthly)}` : 'Monto a abonar'}
                onKeyDown={e => e.key === 'Enter' && handlePay()}
                min="0"
                step="0.01"
                style={{
                  flex:1, background:'var(--bg)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)', padding:'9px 13px',
                  color:'var(--text)', fontFamily:'var(--font-body)', fontSize:13,
                  outline:'none', transition:'border .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />

              {/* Botón de pago rápido con la cuota mensual */}
              {monthly > 0 && (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => setPayInput(String(monthly))}
                  title="Usar la cuota mensual"
                >
                  {fmt(monthly)}
                </Btn>
              )}

              {/* Botón de registrar pago */}
              <Btn
                variant="success"
                size="sm"
                onClick={handlePay}
                disabled={payLoading || !payInput}
                style={{ whiteSpace:'nowrap' }}
              >
                {payLoading ? '...' : `💰 ${t.makePayment}`}
              </Btn>
            </div>

            {/* Aviso de auto-transacción */}
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:6 }}>
              ↺ El pago creará automáticamente un movimiento en tu historial
            </div>
          </div>
        )}

        {/* ── ESTADO COMPLETADO ── */}
        {isCompleted && (
          <div style={{
            textAlign:'center', padding:'14px 0',
            color:'var(--green)', fontFamily:'var(--font-display)',
            fontWeight:700, fontSize:15,
          }}>
            🎉 ¡Deuda completamente pagada!
          </div>
        )}
      </Card>

      {/* Modal de edición (montado fuera de la Card) */}
      {editing && (
        <EditDebtModal
          debt={debt}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}