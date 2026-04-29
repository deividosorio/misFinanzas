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
// src/pages/Transactions.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v4:
//   - Eliminada columna "Tarjeta" (era payment_account_id) — ya no existe
//   - Columna "Cuenta" muestra el ícono del subtype correcto
//     (💳 para crédito, 🏦/🏧/💵/📈 para activos)
//   - Al borrar, ya no referencia payment_account_id
//   - EditTxModal actualizado para usar selector unificado
//   - Badge de tipo de cuenta: rojo para crédito, color de cuenta para activo
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, Empty } from '../components/ui/index'
import AutoTransactionBadge from '../components/ui/AutoTransactionBadge'
import { EditTxModal } from './EditModals'
import { TxModal } from './Modals'
import { fmt, toDay, ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../lib/constants'

export default function Transactions() {
  const { t, filteredTxns, txns, filterType, setFilterType, openModal, modal } = useApp()
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const visible = filterType === 'all'
    ? filteredTxns
    : filteredTxns.filter(tx => tx.type === filterType)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Controles superiores */}
      <div style={{
        display: 'flex', gap: 8,
        justifyContent: 'space-between',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Filtro por tipo */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'income', 'expense', 'saving'].map(f => (
            <Btn key={f} size="sm"
              variant={filterType === f ? 'primary' : 'ghost'}
              onClick={() => setFilterType(f)}
            >
              {f === 'all' ? t.allTypes : t[f]}
            </Btn>
          ))}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <CsvImportButton />
          <CsvExportButton txns={txns} />
          <Btn size="sm" variant="primary" onClick={() => openModal('tx')}>
            + {t.addTransaction}
          </Btn>
        </div>
      </div>

      {/* Lista */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div style={{ padding: 20 }}><Empty icon="📭" message={t.noData} /></div>
        ) : (
          <div>
            {/* Cabecera de tabla */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 80px 76px',
              gap: 8, padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface)',
            }}>
              {['Descripción', 'Cuenta', 'Monto', ''].map((h, i) => (
                <div key={i} style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {h}
                </div>
              ))}
            </div>

            {visible.map((tx, i) => (
              <TxRow
                key={tx.id}
                tx={tx}
                isLast={i === visible.length - 1}
                onEdit={() => setEditing(tx)}
                confirmDelete={confirmDelete === tx.id}
                onDeleteRequest={() => setConfirmDelete(tx.id)}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        )}
      </Card>

      {modal === 'tx' && <TxModal />}
      {editing && <EditTxModal txn={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

// ── TxRow ─────────────────────────────────────────────────────────────────────
function TxRow({ tx, isLast, onEdit, confirmDelete, onDeleteRequest, onCancelDelete }) {
  const { t, deleteTxn, getAccount } = useApp()

  // v4: una sola cuenta — puede ser activo o crédito
  const account = getAccount(tx.account_id)
  const isCredit = account ? CREDIT_SUBTYPES.includes(account.subtype) : false
  const subCfg = account ? ACCOUNT_SUBTYPES[account.subtype] : null

  // Color semántico del monto
  const amtColor = { income: 'var(--green)', expense: 'var(--red)', saving: 'var(--purple)' }[tx.type] || 'var(--text)'
  const sign = tx.type === 'income' ? '+' : '-'

  // Ícono de tipo de transacción
  const typeIcon = { income: '↑', expense: '↓', saving: '◎', transfer: '↔' }[tx.type] || '·'

  const handleDelete = async () => {
    await deleteTxn(tx.id)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      padding: '0 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition: 'background .1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Fila principal */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 110px 80px 76px',
        gap: 8, alignItems: 'center', padding: '11px 0',
      }}>

        {/* COLUMNA 1: Tipo + descripción + metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
            background: tx.type === 'income' ? '#2dd4a012' : tx.type === 'expense' ? '#ff6b6b12' : '#a78bfa12',
          }}>
            {typeIcon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginBottom: 3,
            }}>
              {tx.description}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Tipo */}
              <span style={{
                fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 6px',
                background: amtColor + '14', color: amtColor,
              }}>
                {t[tx.type]}
              </span>
              {/* Categoría */}
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {t.cats?.[tx.category] || tx.category}
              </span>
              {/* Fecha */}
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{tx.date}</span>
              {/* Badge auto-transacción */}
              <AutoTransactionBadge source={tx.auto_source} />
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Cuenta unificada (activo o crédito) */}
        <div style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {account ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              color: isCredit ? 'var(--red)' : (account.color || 'var(--muted)'),
            }}>
              <span>{isCredit ? '💳' : (subCfg?.icon || '🏦')}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {account.name}
                {account.last_four ? ` ···${account.last_four}` : ''}
              </span>
            </span>
          ) : (
            <span style={{ color: 'var(--muted)' }}>—</span>
          )}
        </div>

        {/* COLUMNA 3: Monto */}
        <div className="mono" style={{
          color: amtColor, fontSize: 13, fontWeight: 700, textAlign: 'right',
        }}>
          {sign}{fmt(tx.amount)}
        </div>

        {/* COLUMNA 4: Acciones */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          {/* Editar — no disponible para auto-transacciones */}
          {!tx.auto_source ? (
            <IconBtn icon="✏️" title="Editar" hoverColor="var(--blue)" onClick={onEdit} />
          ) : (
            <span title="Generado automáticamente"
              style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 6px' }}>
              🔒
            </span>
          )}
          <IconBtn icon="✕" title="Eliminar" hoverColor="var(--red)" onClick={onDeleteRequest} />
        </div>
      </div>

      {/* Confirmación de eliminación inline */}
      {confirmDelete && (
        <div style={{
          background: tx.auto_source ? '#fbbf2410' : '#ff6b6b10',
          borderTop: `1px solid ${tx.auto_source ? '#fbbf2433' : '#ff6b6b33'}`,
          padding: '9px 0 11px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
            {tx.auto_source
              ? '⚠️ Transacción automática. ¿Anularla?'
              : '¿Eliminar permanentemente?'
            }
          </span>
          <Btn size="xs" variant="danger" onClick={handleDelete}>
            {tx.auto_source ? 'Anular' : 'Eliminar'}
          </Btn>
          <Btn size="xs" variant="ghost" onClick={onCancelDelete}>Cancelar</Btn>
        </div>
      )}
    </div>
  )
}

// ── IconBtn ───────────────────────────────────────────────────────────────────
function IconBtn({ icon, title, onClick, hoverColor }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--muted)', fontSize: 13, padding: '4px 6px',
      borderRadius: 4, transition: 'color .12s, background .12s', lineHeight: 1,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.color = hoverColor || 'var(--text)'
        e.currentTarget.style.background = (hoverColor || '#fff') + '18'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--muted)'
        e.currentTarget.style.background = 'none'
      }}>
      {icon}
    </button>
  )
}

// ── CsvExportButton ───────────────────────────────────────────────────────────
function CsvExportButton({ txns }) {
  const { t } = useApp()
  const exportCSV = () => {
    const headers = 'Date,Type,Category,Description,Amount,Account,AutoSource'
    const rows = txns
      .filter(tx => !tx.is_void)
      .map(tx =>
        `${tx.date},${tx.type},${tx.category},"${tx.description}",${tx.amount},"${tx.account_id || ''}","${tx.auto_source || ''}"`
      )
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mifinanza-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  return <Btn size="sm" variant="ghost" onClick={exportCSV}>⬇ {t.exportCSV}</Btn>
}

// ── CsvImportButton ───────────────────────────────────────────────────────────
function CsvImportButton() {
  const { t, setTxns } = useApp()
  const [preview, setPreview] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [parseErr, setParseErr] = useState('')
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParseErr('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const lines = (ev.target.result || '').split('\n').filter(Boolean)
        const hasHeader = lines[0]?.toLowerCase().includes('date') || lines[0]?.toLowerCase().includes('fecha')
        const data = (hasHeader ? lines.slice(1) : lines).map((line, i) => {
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return {
            id: 'csv-' + i + '-' + Date.now(),
            date: cols[0] || toDay(), description: cols[1] || 'Importado',
            amount: Math.abs(parseFloat(cols[2]) || 0),
            type: 'expense', category: 'other_expense',
            auto_source: null, is_void: false, account_id: null,
          }
        }).filter(r => r.amount > 0)
        if (!data.length) { setParseErr('No se encontraron transacciones válidas'); return }
        setPreview(data.slice(0, 5))
        setShowModal(true)
      } catch { setParseErr('Error al leer el archivo') }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleImport = () => {
    setTxns(prev => [...preview, ...prev])
    setShowModal(false); setPreview([])
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.txt"
        onChange={handleFile} style={{ display: 'none' }} />
      <Btn size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
        📂 {t.importCSV || 'Importar'}
      </Btn>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, background: '#00000088', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, maxWidth: 420, width: '100%',
            boxShadow: '0 8px 40px #00000055',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              📂 Vista previa — importación
            </div>
            <div style={{
              background: 'var(--bg)', borderRadius: 8, padding: '9px 12px',
              fontSize: 11, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 14,
            }}>
              Formato: <code>fecha, descripción, monto</code><br />
              Se importarán como <strong>Gasto / Otro gasto</strong> sin cuenta asignada.
            </div>
            {preview.map((row, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)',
                padding: '6px 0', borderBottom: '1px solid var(--border)', alignItems: 'center',
              }}>
                <span style={{ flexShrink: 0 }}>{row.date}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.description}
                </span>
                <span style={{ color: 'var(--red)', flexShrink: 0 }}>{fmt(row.amount)}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--muted)', margin: '12px 0 16px' }}>
              Podrás editar el tipo y categoría de cada transacción después.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</Btn>
              <Btn variant="primary" style={{ flex: 2 }} onClick={handleImport}>
                Importar {preview.length} transacciones
              </Btn>
            </div>
          </div>
        </div>
      )}

      {parseErr && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 200,
          background: 'var(--red)14', border: '1px solid var(--red)33',
          borderRadius: 8, padding: '10px 14px', color: 'var(--red)',
          fontSize: 12, boxShadow: '0 4px 20px #00000044',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          ⚠️ {parseErr}
          <button onClick={() => setParseErr('')} style={{
            background: 'none', border: 'none', color: 'var(--red)',
            cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>
      )}
    </>
  )
}