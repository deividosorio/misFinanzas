// src/components/layout/Sidebar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barra de navegación lateral — solo visible en desktop (≥769px).
//
// En mobile es reemplazada por BottomNav.jsx.
// Se oculta con la clase CSS .hide-mobile definida en index.css.
//
// COMPORTAMIENTO:
//   - El tab activo se resalta con fondo var(--border) y color var(--text)
//   - Los tabs inactivos tienen color var(--muted)
//   - El panel de Admin solo aparece si el usuario tiene role='owner'
//   - position: sticky, top: 54px (debajo del Header) — scrollea con el contenido
//     pero se queda fijo visualmente
//
// ÍTEMS DE NAVEGACIÓN:
//   Todos los usuarios adultos ven: Dashboard, Movimientos, Deudas,
//   Recurrentes, Ahorros, Kids, Estados, Familia
//   Solo el owner ve: Admin
//
// DEPENDENCIAS:
//   useApp() → t, tab, setTab, isOwner
// ─────────────────────────────────────────────────────────────────────────────
import { useApp } from '../../context/AppContext'

// Definición de cada ítem de navegación
// id     → clave del tab, debe coincidir con las claves de PAGE_MAP en App.jsx
// icon   → emoji o símbolo representativo
// label  → clave de traducción en el objeto t
const buildNavItems = (t, isOwner) => [
  { id: 'dashboard',    icon: '◈',  label: t.dashboard    },
  { id: 'transactions', icon: '⇅',  label: t.transactions },
  { id: 'debts',        icon: '▣',  label: t.debts        },
  { id: 'recurring',    icon: '↺',  label: t.recurring    },
  { id: 'savings',      icon: '◎',  label: t.savings      },
  { id: 'kids',         icon: '⭐', label: t.kids         },
  { id: 'statements',   icon: '📊', label: t.statements   },
  { id: 'family',       icon: '👨‍👩‍👧', label: t.family      },
  // Separador visual antes de Admin
  ...(isOwner ? [{ id: 'admin', icon: '⚙', label: t.admin }] : []),
]

export default function Sidebar() {
  const { t, tab, setTab, isOwner } = useApp()
  const navItems = buildNavItems(t, isOwner)

  return (
    <aside
      className="hide-mobile"   // index.css: display:none en ≤768px
      style={{
        width:         200,
        background:    'var(--surface)',
        borderRight:   '1px solid var(--border)',
        padding:       '10px 8px',
        display:       'flex',
        flexDirection: 'column',
        gap:           2,
        position:      'sticky',
        top:           54,           // altura del Header
        height:        'calc(100vh - 54px)',
        overflowY:     'auto',
        flexShrink:    0,
      }}
    >
      {navItems.map(item => (
        <NavButton
          key={item.id}
          item={item}
          isActive={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
    </aside>
  )
}

// ── NavButton — Botón individual de navegación ─────────────────────────────────
/**
 * Botón de navegación con ícono + texto.
 * El estado activo se controla externamente vía isActive.
 *
 * @param {object}   item     - { id, icon, label }
 * @param {boolean}  isActive - Si es el tab actual
 * @param {function} onClick  - Callback al hacer clic
 */
function NavButton({ item, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      title={item.label}   // tooltip en hover para texto truncado
      style={{
        background:   isActive ? 'var(--border)' : 'none',
        color:        isActive ? 'var(--text)'   : 'var(--muted)',
        border:       'none',
        cursor:       'pointer',
        padding:      '8px 12px',
        borderRadius: 'var(--radius-sm)',
        fontFamily:   'var(--font-body)',
        fontSize:     13,
        fontWeight:   500,
        transition:   'all .15s',
        display:      'flex',
        alignItems:   'center',
        gap:          7,
        textAlign:    'left',
        whiteSpace:   'nowrap',
        width:        '100%',
      }}
      // Efecto hover manual (no usamos :hover en CSS-in-JS)
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--muted)' }}
    >
      <span style={{ fontSize:15, lineHeight:1, flexShrink:0 }}>{item.icon}</span>
      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</span>
    </button>
  )
}