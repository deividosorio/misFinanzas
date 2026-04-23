// src/pages/Transactions.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Página completa de historial de movimientos financieros.
//
// FUNCIONALIDADES:
//   1. Lista filtrable por tipo (Todos / Ingreso / Gasto / Ahorro)
//   2. Badge de origen automático (muestra si fue generado por deuda/recurrente/ahorro)
//   3. Editar transacción → EditTxModal (pre-llena campos con valores actuales)
//   4. Eliminar transacción (con confirmación inline)
//      - Las auto-transacciones se anulan (is_void=true), no se borran
//   5. Importar desde CSV (TD, RBC, Scotiabank, Desjardins)
//   6. Exportar a CSV
//   7. Botón de nueva transacción → TxModal
//
// FLUJO DE EDICIÓN:
//   Botón ✏️ en fila → setEditing(txn) → <EditTxModal txn={editing} />
//   Al guardar: editTxn(id, changes) → actualiza estado global → re-render
//
// SOBRE LAS AUTO-TRANSACCIONES:
//   Las transacciones con auto_source !== null fueron creadas automáticamente
//   cuando se pagó una deuda, se marcó un recurrente o se depositó en una meta.
//   Se muestran con un badge de color (AutoTransactionBadge) y al eliminarlas
//   se anulan (is_void=true) en lugar de borrarse para mantener el historial.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, Empty } from '../components/ui/index'
import AutoTransactionBadge from '../components/ui/AutoTransactionBadge'
import { EditTxModal } from './EditModals'
import { TxModal } from './Modals'
import { fmt, toDay } from '../lib/constants'

export default function Transactions() {
  const { t, filteredTxns, txns, filterType, setFilterType, openModal, modal } = useApp()

  // Transacción siendo editada actualmente (null = ninguna)
  const [editing, setEditing] = useState(null)

  // Transacción esperando confirmación de eliminación (null = ninguna)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Filtro por tipo aplicado sobre las txns ya filtradas por período/cuenta
  const visibleTxns = filterType === 'all'
    ? filteredTxns
    : filteredTxns.filter(tx => tx.type === filterType)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── BARRA DE CONTROLES ── */}
      <div style={{
        display:        'flex',
        gap:            8,
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        alignItems:     'center',
      }}>

        {/* Filtros por tipo de transacción */}
        <div style={{ display:'flex', gap:4 }}>
          {['all','income','expense','saving'].map(f => (
            <Btn
              key={f}
              size="sm"
              variant={filterType === f ? 'primary' : 'ghost'}
              onClick={() => setFilterType(f)}
            >
              {f === 'all' ? t.allTypes : t[f]}
            </Btn>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <CsvImportButton />
          <CsvExportButton txns={txns} />
          <Btn size="sm" variant="primary" onClick={() => openModal('tx')}>
            + {t.addTransaction}
          </Btn>
        </div>
      </div>

      {/* ── LISTA DE TRANSACCIONES ── */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        {visibleTxns.length === 0 ? (
          <div style={{ padding:20 }}>
            <Empty icon="📭" message={t.noData} />
          </div>
        ) : (
          <div>
            {/* Header de la tabla */}
            <div style={{
              display:         'grid',
              gridTemplateColumns: '1fr 90px 70px 80px',
              gap:             8,
              padding:         '10px 16px',
              borderBottom:    '1px solid var(--border)',
              background:      'var(--surface)',
            }}>
              {['Descripción','Cuenta','Monto','Acciones'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, color:'var(--muted)',
                  textTransform:'uppercase', letterSpacing:0.5 }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Filas de transacciones */}
            {visibleTxns.map((tx, i) => (
              <TxRow
                key={tx.id}
                tx={tx}
                isLast={i === visibleTxns.length - 1}
                onEdit={() => setEditing(tx)}
                onDeleteRequest={() => setConfirmDelete(tx.id)}
                confirmDelete={confirmDelete === tx.id}
                onConfirmDelete={() => { /* handled inside */ }}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ── MODAL DE NUEVA TRANSACCIÓN ── */}
      {modal === 'tx' && <TxModal />}

      {/* ── MODAL DE EDICIÓN ── */}
      {editing && (
        <EditTxModal
          txn={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ── TxRow — Fila individual de transacción ────────────────────────────────────
/**
 * Muestra una transacción con:
 * - Ícono de tipo + descripción + categoría + cuenta + badge auto-origen
 * - Fecha
 * - Monto con color semántico
 * - Botones: editar (✏️) y eliminar (✕) con confirmación inline
 *
 * Las auto-transacciones muestran un aviso antes de eliminar.
 */
function TxRow({ tx, isLast, onEdit, onDeleteRequest, confirmDelete, onCancelDelete }) {
  const { t, deleteTxn, getAccount } = useApp()

  const account = getAccount(tx.account_id)
  const card    = getAccount(tx.payment_account_id)

  // Color del monto según tipo
  const amountColor = {
    income:  'var(--green)',
    expense: 'var(--red)',
    saving:  'var(--purple)',
  }[tx.type] || 'var(--text)'

  // Ícono según tipo
  const typeIcon = { income:'↑', expense:'↓', saving:'◎', transfer:'↔' }[tx.type] || '·'

  const handleDelete = async () => {
    await deleteTxn(tx.id)
  }

  return (
    <div style={{
      display:      'flex',
      flexDirection:'column',
      padding:      '0 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition:   'background .1s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Contenido principal de la fila */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 90px 70px 80px',
        gap:                 8,
        alignItems:          'center',
        padding:             '11px 0',
      }}>

        {/* COLUMNA 1: Tipo + Descripción + metadata */}
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          {/* Ícono de tipo */}
          <div style={{
            width:         32,
            height:        32,
            borderRadius:  'var(--radius-sm)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            fontSize:      14,
            flexShrink:    0,
            background:    tx.type === 'income'  ? '#2dd4a012' :
                           tx.type === 'expense' ? '#ff6b6b12' : '#a78bfa12',
          }}>
            {typeIcon}
          </div>

          {/* Texto */}
          <div style={{ minWidth:0 }}>
            {/* Descripción principal */}
            <div style={{
              fontSize:     13,
              fontWeight:   500,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
              marginBottom: 3,
            }}>
              {tx.description}
            </div>

            {/* Metadata: tipo, categoría, cuenta, tarjeta, fecha, badge auto */}
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
              {/* Badge de tipo */}
              <span style={{
                fontSize:10, fontWeight:600, borderRadius:4, padding:'1px 6px',
                background: amountColor + '14',
                color:      amountColor,
              }}>
                {t[tx.type]}
              </span>

              {/* Categoría */}
              <span style={{ fontSize:10, color:'var(--muted)' }}>
                {t.cats?.[tx.category] || tx.category}
              </span>

              {/* Cuenta bancaria */}
              {account && (
                <span style={{ fontSize:10, color:account.color || 'var(--blue)' }}>
                  ⬤ {account.name}
                </span>
              )}

              {/* Tarjeta de pago */}
              {card && (
                <span style={{ fontSize:10, color:card.color || 'var(--red)' }}>
                  💳 {card.name}
                </span>
              )}

              {/* Fecha */}
              <span style={{ fontSize:10, color:'var(--muted)' }}>{tx.date}</span>

              {/* Badge de transacción automática */}
              <AutoTransactionBadge source={tx.auto_source} />
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Nombre de cuenta corto */}
        <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden',
          textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {account?.name || '—'}
        </div>

        {/* COLUMNA 3: Monto */}
        <div
          className="mono"
          style={{ color:amountColor, fontSize:13, textAlign:'right', fontWeight:700 }}
        >
          {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
        </div>

        {/* COLUMNA 4: Acciones */}
        <div style={{ display:'flex', gap:4, justifyContent:'flex-end' }}>
          {/* Editar — no disponible para auto-transacciones */}
          {!tx.auto_source ? (
            <ActionBtn
              icon="✏️"
              title="Editar transacción"
              onClick={onEdit}
              color="var(--blue)"
            />
          ) : (
            <span style={{
              fontSize:9, color:'var(--muted)', padding:'0 4px',
              title:'Generado automáticamente',
            }} title="Generado automáticamente">🔒</span>
          )}

          {/* Eliminar */}
          <ActionBtn
            icon="✕"
            title={tx.auto_source ? 'Anular transacción automática' : 'Eliminar transacción'}
            onClick={onDeleteRequest}
            color="var(--red)"
          />
        </div>
      </div>

      {/* ── CONFIRMACIÓN DE ELIMINACIÓN (inline) ── */}
      {confirmDelete && (
        <div style={{
          background:   tx.auto_source ? '#fbbf2410' : '#ff6b6b10',
          borderTop:    `1px solid ${tx.auto_source ? '#fbbf2433' : '#ff6b6b33'}`,
          borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
          padding:      '10px 0 12px',
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          flexWrap:     'wrap',
        }}>
          <span style={{ fontSize:12, color:'var(--muted)', flex:1 }}>
            {tx.auto_source
              ? '⚠️ Esta transacción fue generada automáticamente. ¿Anularla?'
              : '¿Eliminar esta transacción permanentemente?'
            }
          </span>
          <Btn size="xs" variant="danger" onClick={handleDelete}>
            {tx.auto_source ? 'Anular' : 'Eliminar'}
          </Btn>
          <Btn size="xs" variant="ghost" onClick={onCancelDelete}>
            Cancelar
          </Btn>
        </div>
      )}
    </div>
  )
}

// ── ActionBtn — Botón de acción compacto ──────────────────────────────────────
function ActionBtn({ icon, title, onClick, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background:   'none',
        border:       'none',
        cursor:       'pointer',
        color:        'var(--muted)',
        fontSize:     13,
        padding:      '4px 6px',
        borderRadius: 4,
        transition:   'color .12s, background .12s',
        lineHeight:   1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color      = color || 'var(--text)'
        e.currentTarget.style.background = (color || '#fff') + '18'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color      = 'var(--muted)'
        e.currentTarget.style.background = 'none'
      }}
    >
      {icon}
    </button>
  )
}

// ── CsvExportButton ────────────────────────────────────────────────────────────
function CsvExportButton({ txns }) {
  const { t } = useApp()

  const exportCSV = () => {
    const headers = 'Date,Type,Category,Description,Amount,Account,AutoSource'
    const rows = txns
      .filter(tx => !tx.is_void)
      .map(tx =>
        `${tx.date},${tx.type},${tx.category},"${tx.description}",${tx.amount},"${tx.account_id||''}","${tx.auto_source||''}"`
      )
    const blob = new Blob([[headers, ...rows].join('\n')], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `mifinanza-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Btn size="sm" variant="ghost" onClick={exportCSV}>
      ⬇ {t.exportCSV}
    </Btn>
  )
}

// ── CsvImportButton ────────────────────────────────────────────────────────────
/**
 * Importa transacciones desde un CSV bancario canadiense.
 * Formato esperado: fecha,descripción,monto
 * Bancos compatibles: TD, RBC, Scotiabank, Desjardins
 */
function CsvImportButton() {
  const { t, setTxns } = useApp()
  const [importing, setImporting]   = useState(false)
  const [preview,   setPreview]     = useState([])
  const [parseErr,  setParseErr]    = useState('')
  const [showModal, setShowModal]   = useState(false)
  const fileRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const lines   = (ev.target.result || '').split('\n').filter(Boolean)
        const hasHeader = lines[0]?.toLowerCase().includes('date') ||
                          lines[0]?.toLowerCase().includes('fecha')
        const dataLines = hasHeader ? lines.slice(1) : lines

        const parsed = dataLines.map((line, i) => {
          // Manejar campos entre comillas
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return {
            id:                 'csv-'+i+'-'+Date.now(),
            date:               cols[0] || toDay(),
            description:        cols[1] || 'Transacción importada',
            amount:             Math.abs(parseFloat(cols[2]) || 0),
            type:               'expense',
            category:           'other_expense',
            auto_source:        null,
            is_void:            false,
            account_id:         null,
            payment_account_id: null,
          }
        }).filter(r => r.amount > 0)

        if (!parsed.length) {
          setParseErr('No se encontraron transacciones válidas.')
          return
        }
        setPreview(parsed.slice(0, 5))
        setShowModal(true)
      } catch {
        setParseErr('Error al leer el archivo.')
      }
    }
    reader.readAsText(file, 'UTF-8')
    // Resetear input para poder importar el mismo archivo de nuevo
    e.target.value = ''
  }

  const handleImport = () => {
    if (!preview.length) return
    setTxns(prev => [...preview, ...prev])
    setShowModal(false)
    setPreview([])
  }

  return (
    <>
      {/* Input oculto — se activa por el botón */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileChange}
        style={{ display:'none' }}
      />

      <Btn size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
        📂 {t.importCSV || 'Importar CSV'}
      </Btn>

      {/* Modal de confirmación de importación */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position:'fixed', inset:0, background:'#00000088', zIndex:100,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          backdropFilter:'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:16, padding:24, maxWidth:420, width:'100%',
            boxShadow:'0 8px 40px #00000055',
          }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, marginBottom:14 }}>
              📂 Vista previa — importación CSV
            </div>

            {/* Info de formato */}
            <div style={{
              background:'var(--bg)', borderRadius:8, padding:'10px 12px',
              fontSize:11, color:'var(--muted)', lineHeight:1.8, marginBottom:14,
            }}>
              Formato: <code>fecha, descripción, monto</code><br />
              Se importarán como <strong>Gasto / Otro gasto</strong>. Puedes editar después.
            </div>

            {/* Filas de preview */}
            {preview.map((row, i) => (
              <div key={i} style={{
                display:'flex', gap:10, fontSize:11, color:'var(--muted)',
                padding:'6px 0', borderBottom:'1px solid var(--border)', alignItems:'center',
              }}>
                <span style={{ flexShrink:0, color:'var(--muted)' }}>{row.date}</span>
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {row.description}
                </span>
                <span style={{ color:'var(--red)', flexShrink:0 }}>{fmt(row.amount)}</span>
              </div>
            ))}

            <div style={{ fontSize:11, color:'var(--muted)', marginTop:8, marginBottom:16 }}>
              Las transacciones se importarán como gastos. Puedes editar tipo y categoría individualmente.
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="ghost" style={{ flex:1 }} onClick={() => setShowModal(false)}>
                Cancelar
              </Btn>
              <Btn variant="primary" style={{ flex:2 }} onClick={handleImport}>
                Importar {preview.length} transacciones
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Error de parse */}
      {parseErr && (
        <div style={{
          position:'fixed', bottom:20, right:20, zIndex:200,
          background:'var(--red)14', border:'1px solid var(--red)33',
          borderRadius:8, padding:'10px 14px', color:'var(--red)',
          fontSize:12, boxShadow:'0 4px 20px #00000044',
        }}>
          ⚠️ {parseErr}
          <button onClick={() => setParseErr('')} style={{
            marginLeft:10, background:'none', border:'none',
            color:'var(--red)', cursor:'pointer', fontSize:14,
          }}>✕</button>
        </div>
      )}
    </>
  )
}