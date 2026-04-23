// src/pages/Savings.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión de metas de ahorro para adultos.
//
// FUNCIONALIDADES:
//   1. Lista de metas con barra de progreso hacia el objetivo
//   2. Depósito → depositGoal() → AUTO-CREA transacción 'saving'
//   3. Editar meta → EditSavingsGoalModal (nombre, objetivo, emoji, color, deadline)
//   4. Eliminar meta con confirmación
//   5. Crear nueva meta → GoalModal
//   6. Estado 'completado' con celebración visual
//   7. Filtro: Activas / Completadas
//   8. Resumen total ahorrado vs objetivo
//
// DIFERENCIA CON KIDS:
//   Las metas adultas no tienen gamificación (sin cerdito animado).
//   Son más directas y muestran fecha límite si está configurada.
//   Las metas Kids están en Kids.jsx con interfaz gamificada separada.
//
// AUTO-TRANSACCIÓN AL DEPOSITAR:
//   depositGoal() en AppContext:
//   1. Actualiza current_amount en la meta
//   2. Si current >= target: cambia status a 'completed'
//   3. Crea transacción: { type:'saving', auto_source:'savings_deposit' }
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import { EditSavingsGoalModal } from './EditModals'
import { GoalModal } from './Modals'
import { fmt, pct } from '../lib/constants'

export default function Savings() {
  const { t, goals, modal, openModal } = useApp()

  // Filtro activas / completadas
  const [showCompleted, setShowCompleted] = useState(false)

  const activeGoals    = useMemo(() => goals.filter(g => g.status !== 'completed'), [goals])
  const completedGoals = useMemo(() => goals.filter(g => g.status === 'completed'),  [goals])
  const visibleGoals   = showCompleted ? completedGoals : activeGoals

  // Resumen total
  const totalTarget  = useMemo(() => goals.reduce((s, g) => s + (g.target_amount || 0),  0), [goals])
  const totalCurrent = useMemo(() => goals.reduce((s, g) => s + (g.current_amount || 0), 0), [goals])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── ENCABEZADO ── */}
      <SectionHeader
        title={t.savings}
        action={
          <Btn size="sm" variant="primary" onClick={() => openModal('goal')}>
            + {t.addGoal}
          </Btn>
        }
      />

      {/* ── RESUMEN TOTAL ── */}
      {goals.length > 0 && (
        <Card style={{ background:'linear-gradient(135deg, #0c1020, #111828)', border:'1px solid #1e2a44' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <div>
              <div className="lbl">Total ahorrado (todas las metas)</div>
              <div className="mono" style={{ fontSize:24, color:'var(--purple)', marginTop:4 }}>
                {fmt(totalCurrent)}
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                de {fmt(totalTarget)} objetivo total
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="lbl">{activeGoals.length} activas · {completedGoals.length} completadas</div>
              <div style={{ marginTop:8, width:120 }}>
                <ProgressBar value={totalCurrent} max={totalTarget} color="var(--purple)" height={8} />
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, textAlign:'right' }}>
                  {pct(totalCurrent, totalTarget)}% alcanzado
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── TABS: Activas / Completadas ── */}
      {completedGoals.length > 0 && (
        <div style={{ display:'flex', gap:6 }}>
          <Btn
            size="sm"
            variant={!showCompleted ? 'primary' : 'ghost'}
            onClick={() => setShowCompleted(false)}
          >
            Activas ({activeGoals.length})
          </Btn>
          <Btn
            size="sm"
            variant={showCompleted ? 'success' : 'ghost'}
            onClick={() => setShowCompleted(true)}
          >
            ✓ Completadas ({completedGoals.length})
          </Btn>
        </div>
      )}

      {/* ── GRID DE METAS ── */}
      {visibleGoals.length === 0 ? (
        <Empty
          icon={showCompleted ? '🏆' : '◎'}
          message={showCompleted
            ? 'Aún no has completado ninguna meta'
            : t.noData
          }
        />
      ) : (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap:                 12,
        }}>
          {visibleGoals.map(goal => (
            <SavingsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* Modal de nueva meta */}
      {modal === 'goal' && <GoalModal />}
    </div>
  )
}

// ── SavingsGoalCard — Tarjeta de meta de ahorro ───────────────────────────────
function SavingsGoalCard({ goal }) {
  const { t, depositGoal, deleteGoal } = useApp()

  const [inputVal,   setInputVal]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState('')
  const [error,      setError]      = useState('')
  const [editing,    setEditing]    = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const current     = goal.current_amount || 0
  const target      = goal.target_amount  || 0
  const progress    = pct(current, target)
  const remaining   = target - current
  const isCompleted = goal.status === 'completed' || current >= target

  // Fecha límite formateada
  const deadlineStr = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString('es-CA', { year:'numeric', month:'short', day:'numeric' })
    : null

  // Días hasta la fecha límite
  const daysToDeadline = goal.deadline
    ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // Color de la deadline según urgencia
  const deadlineColor = daysToDeadline !== null
    ? daysToDeadline < 0   ? 'var(--red)'
    : daysToDeadline <= 30 ? 'var(--yellow)'
    : 'var(--muted)'
    : 'var(--muted)'

  const handleDeposit = async () => {
    const amount = parseFloat(inputVal)
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (amount > remaining) {
      setError(`El monto supera lo que falta (${fmt(remaining)})`)
      return
    }

    setLoading(true)
    setError('')
    const { error: err } = await depositGoal(goal.id, amount)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(`✓ ${fmt(amount)} depositados · Transacción creada automáticamente`)
      setInputVal('')
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    await deleteGoal(goal.id)
  }

  return (
    <>
      <Card accent={goal.color ? goal.color + '33' : undefined}
        style={{ position:'relative', overflow:'hidden' }}>

        {/* Fondo decorativo con el color de la meta */}
        <div style={{
          position:   'absolute',
          top:        -20,
          right:      -20,
          width:      80,
          height:     80,
          borderRadius:'50%',
          background: (goal.color || '#4f7cff') + '08',
          pointerEvents:'none',
        }} />

        {/* ── CABECERA: emoji + nombre + acciones ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:30, lineHeight:1 }}>{goal.emoji || '🎯'}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{goal.name}</div>
              {goal.notes && (
                <div style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic', marginTop:1 }}>
                  {goal.notes}
                </div>
              )}
              {/* Fecha límite */}
              {deadlineStr && (
                <div style={{ fontSize:10, color:deadlineColor, marginTop:2 }}>
                  ⏱ {deadlineStr}
                  {daysToDeadline !== null && daysToDeadline >= 0 && (
                    <span> ({daysToDeadline} días)</span>
                  )}
                  {daysToDeadline !== null && daysToDeadline < 0 && (
                    <span style={{ color:'var(--red)' }}> (vencida)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {!isCompleted && (
              <button onClick={() => setEditing(true)} title="Editar meta" style={{
                background:'none', border:'none', cursor:'pointer', color:'var(--muted)',
                fontSize:13, padding:'3px 5px', borderRadius:4, transition:'color .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                ✏️
              </button>
            )}
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} title="Eliminar" style={{
                background:'none', border:'none', cursor:'pointer', color:'var(--muted)',
                fontSize:13, padding:'3px 5px', borderRadius:4, transition:'color .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >
                ✕
              </button>
            ) : (
              <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                <Btn size="xs" variant="danger" onClick={handleDelete}>Sí</Btn>
                <Btn size="xs" variant="ghost"  onClick={() => setConfirmDel(false)}>No</Btn>
              </div>
            )}
          </div>
        </div>

        {/* ── BARRA DE PROGRESO ── */}
        <ProgressBar value={current} max={target} height={8} color={goal.color} />

        {/* Números: actual / porcentaje / objetivo */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          fontSize:       12,
          margin:         '8px 0 12px',
        }}>
          <span className="mono" style={{ color:goal.color || 'var(--blue)', fontSize:16 }}>
            {fmt(current)}
          </span>
          <span style={{ color:'var(--muted)', fontSize:11 }}>
            {progress}%
          </span>
          <span style={{ color:'var(--muted)' }}>
            {fmt(target)}
          </span>
        </div>

        {/* Faltante */}
        {!isCompleted && (
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>
            Faltan <strong style={{ color:'var(--text)' }}>{fmt(remaining)}</strong> para la meta
          </div>
        )}

        {/* ── MENSAJES ── */}
        {error && (
          <div style={{
            background:'var(--red)10', border:'1px solid var(--red)33',
            borderRadius:6, padding:'7px 10px', fontSize:12, color:'var(--red)', marginBottom:8,
          }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{
            background:'var(--green)10', border:'1px solid var(--green)33',
            borderRadius:6, padding:'7px 10px', fontSize:12, color:'var(--green)', marginBottom:8,
          }}>
            {success}
          </div>
        )}

        {/* ── ACCIONES ── */}
        {isCompleted ? (
          /* Estado completado */
          <div style={{
            background:   (goal.color || 'var(--green)') + '18',
            border:       `1px solid ${goal.color || 'var(--green)'}44`,
            borderRadius: 'var(--radius-sm)',
            padding:      '12px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize:22, marginBottom:4 }}>🎉</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize:   13,
              color:      goal.color || 'var(--green)',
            }}>
              {t.completed}
            </div>
          </div>
        ) : (
          /* Input de depósito */
          <div>
            <div style={{ display:'flex', gap:6 }}>
              <input
                type="number"
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setError('') }}
                placeholder="Monto a depositar"
                onKeyDown={e => e.key === 'Enter' && handleDeposit()}
                min="0"
                step="0.01"
                style={{
                  flex:1, background:'var(--bg)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)', padding:'8px 12px',
                  color:'var(--text)', fontFamily:'var(--font-body)',
                  fontSize:13, outline:'none', transition:'border .15s',
                }}
                onFocus={e => e.target.style.borderColor = goal.color || 'var(--blue)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border)'}
              />
              <Btn
                variant="primary"
                size="sm"
                onClick={handleDeposit}
                disabled={loading || !inputVal}
                style={{ background:goal.color || 'var(--blue)', flexShrink:0 }}
              >
                {loading ? '...' : `+ ${t.deposit}`}
              </Btn>
            </div>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:5 }}>
              ↺ Crea movimiento de ahorro automáticamente
            </div>
          </div>
        )}
      </Card>

      {/* Modal de edición */}
      {editing && (
        <EditSavingsGoalModal
          goal={goal}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}