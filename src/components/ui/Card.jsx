// src/components/ui/Card.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componentes de tarjeta — contenedores visuales de contenido.
//
// VARIANTES:
//   Card      → Tarjeta estándar (20px padding, var(--card) background)
//               Usada para la mayoría de secciones: cuentas, deudas, gráficas.
//
//   CardSm    → Tarjeta pequeña (14px padding, var(--bg) background)
//               Usada dentro de otras tarjetas para sub-métricas.
//               Ej: los 4 sub-KPIs dentro de la tarjeta de deuda.
//
//   CardGlass → Tarjeta con efecto glassmorphism (backdrop-filter: blur)
//               Usada en modales y overlays donde hay contenido detrás.
//               Solo funciona sobre fondos no sólidos.
//
// PROP accent:
//   Color de borde personalizado. Usado cuando una tarjeta está "activa"
//   o "seleccionada" (ej: cuenta activa en el filtro del dashboard).
//   Ejemplo: <Card accent={account.color + '44'}>...</Card>
//   El '44' al final es opacidad hex (~27%) para un borde sutil pero visible.
//
// USO:
//   <Card>contenido normal</Card>
//   <Card accent="#4f7cff44" style={{ background:'#4f7cff10' }}>seleccionada</Card>
//   <CardSm>sub-métrica dentro de otra Card</CardSm>
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Card — Tarjeta estándar.
 *
 * @param {ReactNode} children - Contenido
 * @param {string}    accent   - Color de borde personalizado (hex con alpha)
 * @param {object}    style    - Estilos adicionales
 * @param props                - Props adicionales pasados al div (onClick, etc.)
 */
export function Card({ children, style, accent, ...props }) {
  return (
    <div
      style={{
        background:   'var(--card)',
        border:       `1px solid ${accent || 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding:      20,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CardSm — Tarjeta pequeña para sub-contenido.
 * Usa var(--bg) como fondo para contrastar con la Card padre que usa var(--card).
 *
 * @param {ReactNode} children
 * @param {object}    style
 */
export function CardSm({ children, style, ...props }) {
  return (
    <div
      style={{
        background:   'var(--bg)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding:      14,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CardGlass — Tarjeta con efecto glassmorphism.
 * Requiere que haya contenido visual detrás para que el blur sea visible.
 * Usada en: banners destacados (patrimonio neto, bienvenida).
 *
 * @param {ReactNode} children
 * @param {object}    style
 */
export function CardGlass({ children, style, ...props }) {
  return (
    <div
      style={{
        background:     'rgba(14, 17, 24, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', // Safari
        border:         '1px solid var(--border)',
        borderRadius:   'var(--radius)',
        padding:        20,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// Export default = Card (la más usada)
export default Card