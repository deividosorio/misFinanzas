// src/components/ui/Badges.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componentes de badge, chip y banners de estado.
//
// COMPONENTES EXPORTADOS:
//
//   Chip       → Botón tipo "pill" con estado activo/inactivo y color.
//                Usado en FilterBar para filtrar por cuenta o tarjeta.
//
//   PlanBadge  → Badge del plan SaaS activo (free/pro/family/admin).
//                Color y texto según el plan. Usado en Header y Family.jsx.
//
//   DemoBanner → Banner informativo de "Modo Demo".
//                Visible cuando la app corre sin Supabase configurado.
//                Invita al usuario a configurar .env.local.
//
// NOTA SOBRE Chip:
//   El color activo es el color de la cuenta/tarjeta (personalizable).
//   El color inactivo es var(--border) con texto var(--muted).
//   Esta diferenciación visual es importante para que el usuario
//   identifique qué filtro está activo de un vistazo.
// ─────────────────────────────────────────────────────────────────────────────
import { PLAN_COLORS } from '../../lib/constants'

// ── Chip — Botón de filtro tipo pill ─────────────────────────────────────────
/**
 * Botón con forma de pill (border-radius: 20px) para filtros rápidos.
 *
 * Estado activo:
 *   - Fondo: color de la cuenta/tarjeta (o var(--blue) si no hay color)
 *   - Texto: blanco
 *   - Outline: color + 44 (opacity ~27%) para un borde sutil
 *
 * Estado inactivo:
 *   - Fondo: var(--border)
 *   - Texto: color de la cuenta/tarjeta (tinted) o var(--muted)
 *
 * @param {boolean}  active   - Si el chip está seleccionado
 * @param {string}   color    - Color de acento (hex) — opcional
 * @param {ReactNode} children - Contenido del chip (texto + ícono)
 * @param {function} onClick   - Callback al hacer clic
 */
export function Chip({ active, color, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border:       'none',
        borderRadius: 20,
        padding:      '5px 12px',
        cursor:       'pointer',
        fontFamily:   'var(--font-body)',
        fontSize:     12,
        fontWeight:   600,
        transition:   'all .15s',
        whiteSpace:   'nowrap',
        lineHeight:   1.4,

        // Colores según estado
        background: active
          ? (color || 'var(--blue)')
          : 'var(--border)',
        color: active
          ? '#fff'
          : (color || 'var(--muted)'),

        // Outline solo cuando está activo
        outline: active
          ? `1px solid ${color || 'var(--blue)'}44`
          : 'none',
      }}
    >
      {children}
    </button>
  )
}

// ── PlanBadge — Badge de plan SaaS ───────────────────────────────────────────
/**
 * Muestra el plan activo de la familia con el color correspondiente.
 *
 * Colores definidos en constants.js:
 *   free   → gris   (#5a6180)
 *   pro    → azul   (#4f7cff)
 *   family → verde  (#2dd4a0)
 *   admin  → rojo   (#ff6b6b)
 *
 * El background es el color con opacidad ~13% (22 en hex).
 * Esto crea un badge discreto pero identificable.
 *
 * @param {string} plan - 'free' | 'pro' | 'family' | 'admin'
 */
export function PlanBadge({ plan }) {
  const color = PLAN_COLORS[plan] || '#5a6180'
  return (
    <span style={{
      borderRadius:    20,
      padding:         '3px 9px',
      fontSize:        10,
      fontWeight:      700,
      letterSpacing:   0.3,
      textTransform:   'uppercase',
      background:      color + '22',  // color con 13% de opacidad
      color:           color,
      whiteSpace:      'nowrap',
    }}>
      {plan}
    </span>
  )
}

// PlanBadge es el export default (más usado externamente)
export default PlanBadge

// ── DemoBanner — Aviso de modo demo ──────────────────────────────────────────
/**
 * Banner informativo que aparece cuando la app corre en modo demo
 * (sin Supabase configurado → supabase = null → isDemoMode = true).
 *
 * Proporciona:
 *   1. Indicación clara de que los datos no se persisten
 *   2. Instrucción concisa para activar Supabase
 *
 * Color: amarillo (#fbbf24) — llamativo pero no alarma
 * Posición: arriba del contenido principal, debajo del FilterBar
 */
export function DemoBanner() {
  return (
    <div style={{
      background:   '#fbbf2414',
      border:       '1px solid #fbbf2433',
      borderRadius: 'var(--radius-sm)',
      padding:      '8px 14px',
      fontSize:     12,
      color:        '#fbbf24',
      marginBottom: 14,
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      lineHeight:   1.5,
    }}>
      <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
      <span>
        <strong>Modo demo</strong> — Los datos no se guardan entre sesiones.
        Copia <code style={{ background:'#fbbf2420', padding:'1px 5px', borderRadius:3 }}>
          .env.local.example
        </code> → <code style={{ background:'#fbbf2420', padding:'1px 5px', borderRadius:3 }}>
          .env.local
        </code> y agrega tus claves de Supabase para persistir los datos.
      </span>
    </div>
  )
}