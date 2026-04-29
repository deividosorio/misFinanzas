// src/components/layout/FilterBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barra de filtros combinados — período de tiempo + cuenta/tarjeta.
//
// APARECE EN: Dashboard, Transactions, Statements (definido en App.jsx).
//
// SECCIÓN 1 — FILTRO DE PERÍODO (solo en tabs con gráficas):
//   Modo "Mes": input type="month" — selecciona un mes específico
//   Modo "Rango": dos inputs type="date" — define from y to libremente
//   Botón "Aplicar" → llama a applyFilter() → actualiza `af` en contexto
//     → useEffect en AppContext detecta el cambio → loadData() se ejecuta
//
// SECCIÓN 2 — CHIPS DE CUENTA (siempre visibles):
//   "Todas" → resetea selAcc y selPm (vista consolidada)
//   Un chip por cada cuenta bancaria (color personalizado de la cuenta)
//   Al seleccionar una cuenta, se desactiva cualquier tarjeta activa
//
// SECCIÓN 3 — CHIPS DE TARJETA (solo si hay tarjetas de crédito):
//   Un chip por cada tarjeta de crédito/débito
//   Al seleccionar una tarjeta, se desactiva cualquier cuenta activa
//
// INTERACTIVIDAD:
//   Los filtros se reflejan inmediatamente en filteredTxns (calculado en AppContext).
//   Para gráficas y KPIs, el cambio requiere hacer clic en "Aplicar" (trigger loadData).
//
// DEPENDENCIAS:
//   useApp() → todos los estados de filtro y setters
//   Chip     → botón tipo pill con color activo/inactivo
//   Btn      → botón primario/ghost para los toggles de modo
// ─────────────────────────────────────────────────────────────────────────────
// src/components/layout/FilterBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// v4: Selector de cuenta UNIFICADO
// Ya no hay selPm (forma de pago) separado.
// Un solo filtro de cuenta muestra activos y crédito en la misma lista.
// ─────────────────────────────────────────────────────────────────────────────
import { useApp } from '../../context/AppContext'
import Btn from '../ui/Btn'
import { ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../../lib/constants'

const TABS_WITH_PERIOD = ['dashboard', 'statements']

export default function FilterBar() {
  const {
    t, tab,
    accounts,
    selAcc, setSelAcc,
    pMode, setPMode,
    selMonth, setSelMonth,
    rFrom, setRFrom,
    rTo, setRTo,
    applyFilter,
  } = useApp()

  const showPeriod = TABS_WITH_PERIOD.includes(tab)

  const DATE_INPUT = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 10px',
    color: 'var(--text)',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  // Separar para mostrar con etiquetas
  const assetAccounts = accounts.filter(a => a.is_active && !CREDIT_SUBTYPES.includes(a.subtype))
  const creditAccounts = accounts.filter(a => a.is_active && CREDIT_SUBTYPES.includes(a.subtype))

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      marginBottom: 14,
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>

      {/* ── PERÍODO (solo en tabs con gráficas) ── */}
      {showPeriod && (
        <>
          <div style={{ display: 'flex', gap: 3 }}>
            <Btn size="xs" variant={pMode === 'month' ? 'primary' : 'ghost'} onClick={() => setPMode('month')}>
              {t.selectMonth}
            </Btn>
            <Btn size="xs" variant={pMode === 'range' ? 'primary' : 'ghost'} onClick={() => setPMode('range')}>
              {t.customRange}
            </Btn>
          </div>

          {pMode === 'month' ? (
            <input type="month" value={selMonth}
              onChange={e => setSelMonth(e.target.value)}
              style={{ ...DATE_INPUT, width: 150 }} />
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t.from}</span>
              <input type="date" value={rFrom} onChange={e => setRFrom(e.target.value)}
                style={{ ...DATE_INPUT, width: 132 }} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>→</span>
              <input type="date" value={rTo} onChange={e => setRTo(e.target.value)}
                style={{ ...DATE_INPUT, width: 132 }} />
            </div>
          )}

          <Btn size="xs" variant="primary" onClick={applyFilter}>{t.apply}</Btn>
          <VDiv />
        </>
      )}

      {/* ── CHIPS DE CUENTA UNIFICADOS ── */}
      {/* Chip "Todas" */}
      <AccountChip
        active={!selAcc}
        color={null}
        onClick={() => setSelAcc(null)}
      >
        {t.allAccounts}
      </AccountChip>

      {/* Cuentas de activo */}
      {assetAccounts.map(a => (
        <AccountChip
          key={a.id}
          active={selAcc === a.id}
          color={a.color}
          onClick={() => setSelAcc(selAcc === a.id ? null : a.id)}
        >
          {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
        </AccountChip>
      ))}

      {/* Separador si hay tarjetas */}
      {creditAccounts.length > 0 && <VDiv />}

      {/* Tarjetas de crédito */}
      {creditAccounts.map(a => (
        <AccountChip
          key={a.id}
          active={selAcc === a.id}
          color={a.color}
          onClick={() => setSelAcc(selAcc === a.id ? null : a.id)}
        >
          💳 {a.name}{a.last_four ? ` ···${a.last_four}` : ''}
        </AccountChip>
      ))}
    </div>
  )
}

// Chip de cuenta
function AccountChip({ active, color, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: 'none',
      borderRadius: 20,
      padding: '5px 12px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      lineHeight: 1.4,
      transition: 'all .15s',
      background: active ? (color || 'var(--blue)') : 'var(--border)',
      color: active ? '#fff' : (color || 'var(--muted)'),
      outline: active ? `1px solid ${color || 'var(--blue)'}44` : 'none',
    }}>
      {children}
    </button>
  )
}

// Separador vertical
function VDiv() {
  return <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px', flexShrink: 0 }} />
}