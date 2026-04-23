// src/components/layout/BottomNav.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barra de navegación inferior para dispositivos móviles.
//
// Solo se muestra en pantallas ≤768px. En desktop la reemplaza Sidebar.jsx.
// La visibilidad se controla con una media query CSS inyectada en el componente
// (no en index.css) para que sea completamente autocontenida.
//
// ÍTEMS:
//   Solo los 5 más usados diariamente (el sidebar completo tiene 8+).
//   El resto del menú se accede girando el dispositivo o desde desktop.
//
// POSICIÓN:
//   position: fixed, bottom: 0 — siempre visible al fondo de la pantalla.
//   paddingBottom: 10px — espacio extra para el safe area de iOS (notch inferior).
//   zIndex: 40 — mismo nivel que el Header, debajo de modales.
//
// NOTA FUTURA:
//   Si se agrega un menú hamburguesa "More" como 5° ítem, puede
//   mostrar un sheet con el resto de las opciones de navegación.
//
// DEPENDENCIAS:
//   useApp() → t, tab, setTab
// ─────────────────────────────────────────────────────────────────────────────
import { useApp } from '../../context/AppContext'

// Los 5 ítems más frecuentes para mobile
const MOBILE_ITEMS = (t) => [
  { id: 'dashboard',    icon: '◈',  label: t.dashboard    },
  { id: 'transactions', icon: '⇅',  label: t.transactions },
  { id: 'debts',        icon: '▣',  label: t.debts        },
  { id: 'kids',         icon: '⭐', label: t.kids         },
  { id: 'family',       icon: '👨‍👩‍👧', label: t.family      },
]

export default function BottomNav() {
  const { t, tab, setTab } = useApp()
  const items = MOBILE_ITEMS(t)

  return (
    <>
      {/*
        Media query inline: el <nav> solo aparece en mobile.
        Se usa una clase única ".bottom-nav" para targetear el elemento.
        No se puede usar display:none aquí porque el prop style no admite
        media queries — por eso se inyecta un bloque <style>.
      */}
      <style>{`
        .bottom-nav { display: none; }
        @media (max-width: 768px) {
          .bottom-nav {
            display: flex !important;
          }
        }
      `}</style>

      <nav
        className="bottom-nav"
        style={{
          position:    'fixed',
          bottom:      0,
          left:        0,
          right:       0,
          background:  'var(--surface)',
          borderTop:   '1px solid var(--border)',
          paddingTop:  6,
          paddingBottom:10,  // safe area para iPhone con notch inferior
          zIndex:      40,
        }}
      >
        {items.map(item => (
          <MobileNavButton
            key={item.id}
            item={item}
            isActive={tab === item.id}
            onClick={() => setTab(item.id)}
          />
        ))}
      </nav>
    </>
  )
}

// ── MobileNavButton — Botón de tab mobile ─────────────────────────────────────
/**
 * Botón de navegación compacto: ícono arriba + label abajo.
 * El tab activo se resalta en azul (var(--blue)).
 */
function MobileNavButton({ item, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex:          1,
        background:    'none',
        border:        'none',
        cursor:        'pointer',
        color:         isActive ? 'var(--blue)' : 'var(--muted)',
        fontFamily:    'var(--font-body)',
        fontSize:      9,
        fontWeight:    600,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           3,
        transition:    'color .15s',
        padding:       '4px 0',
      }}
    >
      {/* Ícono más grande para touch targets */}
      <span style={{ fontSize:20, lineHeight:1 }}>{item.icon}</span>
      {/* Label pequeño debajo */}
      <span style={{ letterSpacing:0.2 }}>{item.label}</span>
    </button>
  )
}