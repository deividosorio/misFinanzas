// src/pages/Recurring.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión de pagos periódicos configurados.
//
// FUNCIONALIDADES:
//   1. Lista de pagos recurrentes con semáforo de estado
//   2. Marcar como pagado → markRecPaid() → AUTO-CREA transacción 'expense'
//      → Avanza next_due al siguiente período
//   3. Editar pago recurrente → EditRecurringModal
//   4. Eliminar con confirmación
//   5. Crear nuevo pago → RecurringModal
//   6. Filtro por estado: Todos / Vencidos / Próximos / Al día
//   7. Resumen mensual total
//
// SEMÁFORO DE ESTADO:
//   overdue  (rojo)    → next_due < hoy
//   dueSoon  (amarillo)→ next_due en los próximos 5 días
//   upToDate (verde)   → next_due más de 5 días en el futuro
//
// AUTO-TRANSACCIÓN:
//   Al marcar como pagado, markRecPaid() en AppContext:
//   1. Avanza next_due según la frecuencia configurada
//   2. Crea transacción: { type:'expense', auto_source:'recurring', source_id:rec.id }
//   3. Idempotencia: no crea duplicado si ya existe para ese source_id+fecha
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, Empty } from '../components/ui/index'
import { EditRecurringModal } from './EditModals'
import { RecurringModal } from './Modals'
import { fmt, toDay } from '../lib/constants'

// Umbrales para el semáforo de estado (en días)
const DUE_SOON_DAYS = 5

// Calcula días hasta el próximo pago (puede ser negativo si ya venció)
function daysUntil(dateStr) {
  if (!dateStr) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

// Determina el estado del semáforo
function getStatus(dateStr) {
  const d = daysUntil(dateStr)
  if (d < 0)            return 'overdue'
  if (d <= DUE_SOON_DAYS) return 'dueSoon'
  return 'upToDate'
}

const STATUS_META = {
  overdue:   { color:'var(--red)',    bg:'#ff6b6b18', icon:'🔴', label:'Vencido'        },
  dueSoon:   { color:'var(--yellow)', bg:'#fbbf2418', icon:'🟡', label:'Próximo'         },
  upToDate:  { color:'var(--green)',  bg:'#2dd4a018', icon:'🟢', label:'Al día'          },
}

export default function Recurring() {
  const { t, recurring, modal, openModal } = useApp()

  // Filtro de estado activo
  const [statusFilter, setStatusFilter] = useState('all')

  // Calcular resumen mensual
  const monthlyTotal = useMemo(() =>
    recurring
      .filter(r => r.is_active !== false && r.frequency === 'monthly')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
  [recurring])

  const yearlyTotal = useMemo(() =>
    recurring.filter(r => r.is_active !== false).reduce((sum, r) => {
      const mult = { weekly:52, biweekly:26, monthly:12, yearly:1 }[r.frequency] || 12
      return sum + (r.amount || 0) * mult
    }, 0),
  [recurring])

  // Aplicar filtro de estado
  const visibleRecurring = useMemo(() => {
    if (statusFilter === 'all') return recurring.filter(r => r.is_active !== false)
    return recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === statusFilter)
  }, [recurring, statusFilter])

  // Contadores por estado (para los botones de filtro)
  const counts = useMemo(() => ({
    overdue:  recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'overdue').length,
    dueSoon:  recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'dueSoon').length,
    upToDate: recurring.filter(r => r.is_active !== false && getStatus(r.next_due) === 'upToDate').length,
  }), [recurring])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── ENCABEZADO ── */}
      <SectionHeader
        title={t.recurring}
        action={
          <Btn size="sm" variant="primary" onClick={() => openModal('recurring')}>
            + {t.addRecurring}
          </Btn>
        }
      />

      {/* ── RESUMEN MENSUAL ── */}
      {recurring.length > 0 && (
        <div className="g2">
          <div style={{
            background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'14px 16px',
          }}>
            <div className="lbl">Total mensual comprometido</div>
            <div className="mono" style={{ fontSize:20, color:'var(--red)', marginTop:4 }}>
              {fmt(monthlyTotal)}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              {recurring.filter(r => r.frequency === 'monthly').length} pagos mensuales
            </div>
          </div>
          <div style={{
            background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', padding:'14px 16px',
          }}>
            <div className="lbl">Total anual estimado</div>
            <div className="mono" style={{ fontSize:20, color:'var(--orange)', marginTop:4 }}>
              {fmt(yearlyTotal)}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              {recurring.length} pagos en total
            </div>
          </div>
        </div>
      )}

      {/* ── FILTROS DE ESTADO ── */}
      {recurring.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <Btn
            size="sm"
            variant={statusFilter === 'all' ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter('all')}
          >
            Todos ({recurring.filter(r => r.is_active !== false).length})
          </Btn>
          {counts.overdue > 0 && (
            <Btn
              size="sm"
              variant={statusFilter === 'overdue' ? 'danger' : 'ghost'}
              onClick={() => setStatusFilter('overdue')}
              style={statusFilter !== 'overdue' ? { color:'var(--red)', borderColor:'var(--red)33' } : {}}
            >
              🔴 {t.overdue} ({counts.overdue})
            </Btn>
          )}
          {counts.dueSoon > 0 && (
            <Btn
              size="sm"
              variant={statusFilter === 'dueSoon' ? 'subtle' : 'ghost'}
              onClick={() => setStatusFilter('dueSoon')}
              style={statusFilter !== 'dueSoon' ? { color:'var(--yellow)', borderColor:'var(--yellow)33' } : {}}
            >
              🟡 {t.dueSoon} ({counts.dueSoon})
            </Btn>
          )}
          <Btn
            size="sm"
            variant={statusFilter === 'upToDate' ? 'success' : 'ghost'}
            onClick={() => setStatusFilter('upToDate')}
            style={statusFilter !== 'upToDate' ? { color:'var(--green)', borderColor:'var(--green)33' } : {}}
          >
            🟢 {t.upToDate} ({counts.upToDate})
          </Btn>
        </div>
      )}

      {/* ── LISTA DE PAGOS RECURRENTES ── */}
      {visibleRecurring.length === 0 ? (
        <Empty icon="↺" message={t.noData} />
      ) : (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap:                 12,
        }}>
          {visibleRecurring.map(rec => (
            <RecurringCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}

      {/* Modal de nuevo pago recurrente */}
      {modal === 'recurring' && <RecurringModal />}
    </div>
  )
}

// ── RecurringCard — Tarjeta individual de pago recurrente ─────────────────────
function RecurringCard({ rec }) {
  const { t, markRecPaid, deleteRecurring } = useApp()

  const [payLoading,  setPayLoading]  = useState(false)
  const [paySuccess,  setPaySuccess]  = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)

  const status     = getStatus(rec.next_due)
  const statusMeta = STATUS_META[status]
  const days       = daysUntil(rec.next_due)

  // Etiqueta de tiempo hasta el pago
  const daysLabel = days < 0
    ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
    : days === 0
      ? '¡Hoy!'
      : days === 1
        ? 'Mañana'
        : `En ${days} días`

  // Etiqueta de frecuencia
  const freqLabel = {
    monthly:  'Mensual',
    biweekly: 'Quincenal',
    weekly:   'Semanal',
    yearly:   'Anual',
  }[rec.frequency] || rec.frequency

  const handleMarkPaid = async () => {
    setPayLoading(true)
    const { error } = await markRecPaid(rec.id)
    if (!error) {
      setPaySuccess(true)
      setTimeout(() => setPaySuccess(false), 2500)
    }
    setPayLoading(false)
  }

  const handleDelete = async () => {
    await deleteRecurring(rec.id)
  }

  return (
    <>
      <Card accent={status === 'overdue' ? 'var(--red)44' : status === 'dueSoon' ? 'var(--yellow)33' : undefined}>

        {/* ── CABECERA: estado + nombre ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            {/* Badge de estado */}
            <span style={{
              fontSize:10, fontWeight:700, color:statusMeta.color,
              background:statusMeta.bg, borderRadius:20, padding:'2px 8px',
              display:'inline-block', marginBottom:6,
            }}>
              {statusMeta.icon} {t[status] || statusMeta.label}
            </span>
            <div style={{ fontWeight:700, fontSize:15 }}>{rec.name}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
              {freqLabel} · {t.cats?.[rec.category] || rec.category}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display:'flex', gap:4, marginTop:2 }}>
            <button
              onClick={() => setEditing(true)}
              title="Editar"
              style={{
                background:'none', border:'none', cursor:'pointer',
                color:'var(--muted)', fontSize:13, padding:'3px 5px',
                borderRadius:4, transition:'color .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              ✏️
            </button>
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                title="Eliminar"
                style={{
                  background:'none', border:'none', cursor:'pointer',
                  color:'var(--muted)', fontSize:13, padding:'3px 5px',
                  borderRadius:4, transition:'color .12s',
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

        {/* ── MONTO ── */}
        <div className="mono" style={{ fontSize:22, marginBottom:10 }}>
          {fmt(rec.amount)}
        </div>

        {/* ── PRÓXIMO PAGO ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div>
            <div className="lbl">{t.nextDue}</div>
            <div style={{ fontSize:13, fontWeight:500 }}>{rec.next_due}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{
              fontSize:12, fontWeight:700, color:statusMeta.color,
            }}>
              {daysLabel}
            </div>
          </div>
        </div>

        {/* Notas */}
        {rec.notes && (
          <div style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic', marginBottom:10 }}>
            {rec.notes}
          </div>
        )}

        {/* ── BOTÓN MARCAR PAGADO ── */}
        {paySuccess ? (
          <div style={{
            background:'var(--green)14', border:'1px solid var(--green)33',
            borderRadius:'var(--radius-sm)', padding:'8px 12px',
            fontSize:12, color:'var(--green)', textAlign:'center',
          }}>
            ✓ Pagado · Próximo: {rec.next_due}
          </div>
        ) : (
          <Btn
            variant="success"
            size="sm"
            style={{ width:'100%' }}
            onClick={handleMarkPaid}
            disabled={payLoading}
          >
            {payLoading ? '...' : `✓ ${t.markPaid}`}
          </Btn>
        )}

        {/* Aviso de auto-transacción */}
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:6, textAlign:'center' }}>
          ↺ Crea movimiento automático al marcar pagado
        </div>
      </Card>

      {/* Modal de edición */}
      {editing && (
        <EditRecurringModal
          rec={rec}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}