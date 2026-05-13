// src/components/layout/BottomNav.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barra de navegación inferior para dispositivos móviles.
//
// Solo se muestra en pantallas ≤768px. En desktop la reemplaza Sidebar.jsx.
// La visibilidad se controla con una media query CSS inyectada en el componente
// (no en index.css) para que sea completamente autocontenida.
//
// ÍTEMS:
//   Los 4 más usados diariamente + 1 botón "More" (hamburguesa).
//   El resto del menú se accede a través del sheet modal del botón "More".
//
// POSICIÓN:
//   position: fixed, bottom: 0 — siempre visible al fondo de la pantalla.
//   paddingBottom: 10px — espacio extra para el safe area de iOS (notch inferior).
//   zIndex: 40 — mismo nivel que el Header, debajo de modales.
//
// INTERACCIÓN:
//   El 5° ítem (≡) abre un sheet con las opciones adicionales:
//   Recurrentes, Ahorros, Estados, y Admin (solo si isOwner).
//
// DEPENDENCIAS:
//   useApp() → t, tab, setTab, isOwner
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../../context/AppContext'

// Los 4 ítems más frecuentes para mobile (sin "More")
const MOBILE_ITEMS = (t) => [
  { id: 'dashboard',    icon: '◈',  label: t.dashboard    },
  { id: 'transactions', icon: '⇅',  label: t.transactions },
  { id: 'debts',        icon: '▣',  label: t.debts        },
  { id: 'kids',         icon: '⭐', label: t.kids         },
]

// Ítems adicionales en el menú "More"
const MORE_ITEMS = (t, isOwner) => [
  { id: 'family',       icon: '👨‍👩‍👧', label: t.family      },
  { id: 'recurring',    icon: '↺',  label: t.recurring    },
  { id: 'savings',      icon: '◎',  label: t.savings      },
  { id: 'statements',   icon: '📊', label: t.statements   },
  ...(isOwner ? [{ id: 'admin', icon: '⚙', label: t.admin }] : []),
]

export default function BottomNav() {
  const { t, tab, setTab, isOwner } = useApp()
  const [moreOpen, setMoreOpen] = useState(false)
  const items = MOBILE_ITEMS(t)
  const moreItems = MORE_ITEMS(t, isOwner)

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
        {/* Los 4 ítems principales */}
        {items.map(item => (
          <MobileNavButton
            key={item.id}
            item={item}
            isActive={tab === item.id}
            onClick={() => setTab(item.id)}
          />
        ))}

        {/* 5° ítem: Botón "More" (hamburguesa) */}
        <button
          onClick={() => setMoreOpen(true)}
          style={{
            flex:          1,
            background:    'none',
            border:        'none',
            cursor:        'pointer',
            color:         'var(--muted)',
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
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>≡</span>
          <span style={{ letterSpacing: 0.2 }}>{t.more}</span>
        </button>
      </nav>

      {/* Sheet modal con opciones adicionales */}
      {moreOpen && (
        <MoreSheet
          items={moreItems}
          activeTab={tab}
          onSelectItem={(id) => {
            setTab(id)
            setMoreOpen(false)
          }}
          onClose={() => setMoreOpen(false)}
        />
      )}
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

// ── MoreSheet — Sheet modal con opciones adicionales ───────────────────────────
/**
 * Sheet (modal bottom sheet) que muestra los ítems adicionales del menú.
 * 
 * CARACTERÍSTICAS:
 *   - Overlay oscuro que se cierra al tocar
 *   - Animación de entrada/salida (slide up)
 *   - Touch-friendly para mobile
 *   - Mismo estilo de botones que MobileNavButton
 *
 * @param {array}    items        - Ítems a mostrar en el sheet
 * @param {string}   activeTab    - ID del tab activo
 * @param {function} onSelectItem - Callback al seleccionar un ítem
 * @param {function} onClose      - Callback para cerrar el sheet
 */
function MoreSheet({ items, activeTab, onSelectItem, onClose }) {
  return (
    <>
      {/* Overlay oscuro — cierra el sheet al tocar */}
      <div
        onClick={onClose}
        onTouchEnd={onClose}
        style={{
          position:  'fixed',
          top:       0,
          left:      0,
          right:     0,
          bottom:    0,
          background:'rgba(0, 0, 0, 0.5)',
          zIndex:    99,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Sheet container — slide up desde el bottom */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position:      'fixed',
          bottom:        0,
          left:          0,
          right:         0,
          background:    'var(--surface)',
          borderRadius:  '12px 12px 0 0',
          borderTop:     '1px solid var(--border)',
          zIndex:        100,
          maxHeight:     '80vh',
          overflowY:     'auto',
          animation:     'slideUp 0.3s ease-out',
          paddingBottom: 16,
        }}
      >
        {/* Handle (dragbar visual) */}
        <div
          style={{
            height:      4,
            width:       40,
            background:  'var(--border)',
            borderRadius:'2px',
            margin:      '12px auto',
          }}
        />

        {/* Grid de ítems — 2 columnas */}
        <div
          style={{
            display:       'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap:           12,
            padding:       '0 12px',
          }}
        >
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              style={{
                background:   activeTab === item.id ? 'var(--border)' : 'none',
                color:        activeTab === item.id ? 'var(--blue)' : 'var(--muted)',
                border:       '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor:       'pointer',
                padding:      '12px 8px',
                fontFamily:   'var(--font-body)',
                fontSize:     12,
                fontWeight:   600,
                display:      'flex',
                flexDirection:'column',
                alignItems:   'center',
                gap:          6,
                transition:   'all .15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--border)'
                e.currentTarget.style.color = activeTab === item.id ? 'var(--blue)' : 'var(--text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = activeTab === item.id ? 'var(--border)' : 'none'
                e.currentTarget.style.color = activeTab === item.id ? 'var(--blue)' : 'var(--muted)'
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ letterSpacing: 0.2 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </>
  )
}