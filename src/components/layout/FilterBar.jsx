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
import { useApp } from '../../context/AppContext'
import Btn from '../ui/Btn'
import { Chip } from '../ui/Badges'

// Tabs que muestran el selector de período
const PERIOD_TABS = ['dashboard', 'statements']

export default function FilterBar() {
  const {
    t, tab,
    accounts, cards,
    selAcc, setSelAcc,
    selPm,  setSelPm,
    pMode,  setPMode,
    selMonth, setSelMonth,
    rFrom,  setRFrom,
    rTo,    setRTo,
    applyFilter,
  } = useApp()

  // ¿Mostrar el selector de período en este tab?
  const showPeriod = PERIOD_TABS.includes(tab)

  // Estilos para los inputs de fecha (reutilizados en dos lugares)
  const DATE_INPUT_STYLE = {
    background:   'var(--bg)',
    border:       '1px solid var(--border)',
    borderRadius: 8,
    padding:      '6px 10px',
    color:        'var(--text)',
    fontSize:     12,
    outline:      'none',
    fontFamily:   'var(--font-body)',
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding:      '10px 14px',
      marginBottom: 14,
      display:      'flex',
      gap:          8,
      flexWrap:     'wrap',
      alignItems:   'center',
    }}>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1: FILTRO DE PERÍODO                                     */}
      {/* Solo se renderiza en tabs que muestran gráficas temporales        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showPeriod && (
        <>
          {/* Toggle: Mes | Rango */}
          <div style={{ display:'flex', gap:3 }}>
            <Btn
              size="xs"
              variant={pMode === 'month' ? 'primary' : 'ghost'}
              onClick={() => setPMode('month')}
            >
              {t.selectMonth}
            </Btn>
            <Btn
              size="xs"
              variant={pMode === 'range' ? 'primary' : 'ghost'}
              onClick={() => setPMode('range')}
            >
              {t.customRange}
            </Btn>
          </div>

          {/* Input de período según el modo activo */}
          {pMode === 'month' ? (
            /* Modo Mes: un solo input type="month" nativo del browser */
            <input
              type="month"
              value={selMonth}
              onChange={e => setSelMonth(e.target.value)}
              style={{ ...DATE_INPUT_STYLE, width:150 }}
            />
          ) : (
            /* Modo Rango: dos inputs de fecha con flecha entre ellos */
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'var(--muted)' }}>{t.from}</span>
              <input
                type="date"
                value={rFrom}
                onChange={e => setRFrom(e.target.value)}
                style={{ ...DATE_INPUT_STYLE, width:132 }}
              />
              <span style={{ fontSize:11, color:'var(--muted)' }}>→</span>
              <input
                type="date"
                value={rTo}
                onChange={e => setRTo(e.target.value)}
                style={{ ...DATE_INPUT_STYLE, width:132 }}
              />
            </div>
          )}

          {/* Botón Aplicar — dispara loadData() con el nuevo período */}
          <Btn size="xs" variant="primary" onClick={applyFilter}>
            {t.apply}
          </Btn>

          {/* Separador visual entre período y cuenta/tarjeta */}
          <Divider />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2: CHIPS DE CUENTA                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* "Todas" — resetea ambos filtros */}
      <Chip
        active={!selAcc && !selPm}
        onClick={() => { setSelAcc(null); setSelPm(null) }}
      >
        {t.allAccounts}
      </Chip>

      {/* Un chip por cada cuenta bancaria registrada */}
      {accounts.map(account => (
        <Chip
          key={account.id}
          active={selAcc === account.id}
          color={account.color}
          onClick={() => {
            // Toggle: si ya estaba activa, desactivar. Si no, activar y limpiar tarjeta.
            setSelAcc(selAcc === account.id ? null : account.id)
            setSelPm(null)
          }}
        >
          ⬤ {account.name}
        </Chip>
      ))}

      {/* Separador antes de tarjetas (solo si hay tarjetas de crédito) */}
      {cards.filter(c => c.type === 'credit_card' || c.credit_limit).length > 0 && (
        <>
          <Divider />

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECCIÓN 3: CHIPS DE TARJETA                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {cards
            .filter(c => c.type === 'credit_card' || c.credit_limit)
            .map(card => (
              <Chip
                key={card.id}
                active={selPm === card.id}
                color={card.color}
                onClick={() => {
                  setSelPm(selPm === card.id ? null : card.id)
                  setSelAcc(null)
                }}
              >
                💳 {card.name}
              </Chip>
            ))
          }
        </>
      )}
    </div>
  )
}

// ── Divider — Separador visual vertical ──────────────────────────────────────
/**
 * Línea vertical usada para separar las secciones del FilterBar.
 * Componente propio (no exportado) para mantener el código limpio.
 */
function Divider() {
  return (
    <div style={{
      width:      1,
      height:     20,
      background: 'var(--border)',
      margin:     '0 2px',
      flexShrink: 0,
    }} />
  )
}