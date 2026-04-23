// src/components/ui/DataDisplay.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componentes para mostrar datos financieros de forma clara.
//
// COMPONENTES EXPORTADOS:
//
//   KPICard       → Tarjeta de indicador clave (número grande + label + sub)
//                   Usada en el grid de 4 KPIs del Dashboard.
//
//   ProgressBar   → Barra de progreso con color automático según el porcentaje.
//                   Verde ≤50% · Amarillo 51-80% · Rojo >80%
//                   (Para deudas la lógica es inversa — más pagado = más verde)
//
//   SectionHeader → Título h2 de sección con acción opcional a la derecha.
//                   Patrón muy frecuente: título + botón "+ Agregar"
//
//   Empty         → Estado vacío para listas sin datos.
//                   Muestra un emoji grande y un mensaje descriptivo.
//
//   TypeBadge     → Badge de color semántico por tipo de transacción.
//                   income=verde · expense=rojo · saving=lavanda
//
//   TxRow         → Fila individual de transacción para listas.
//                   Reutilizada en Dashboard y Transactions.
// ─────────────────────────────────────────────────────────────────────────────

// ── KPICard — Tarjeta de indicador clave ──────────────────────────────────────
/**
 * Muestra un número financiero grande con contexto visual.
 *
 * Diseño:
 *   - Ícono decorativo de fondo (muy transparente, opacity 4%)
 *   - Etiqueta pequeña arriba (label)
 *   - Número grande abajo (value) con color semántico
 *   - Subtexto opcional (sub) para info adicional
 *
 * @param {string} label  - Etiqueta descriptiva (ej: "Total Ingresos")
 * @param {string} value  - Valor formateado (ej: "$12,400")
 * @param {string} color  - Color del número (ej: 'var(--green)')
 * @param {string} icon   - Emoji decorativo de fondo (ej: '↑')
 * @param {string} sub    - Texto secundario (ej: "56% tasa ahorro")
 * @param {object} style  - Estilos adicionales para el contenedor
 */
export function KPICard({ label, value, color, icon, sub, style }) {
  return (
    <div style={{
      background:   'var(--card)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding:      18,
      position:     'relative',
      overflow:     'hidden',
      ...style,
    }}>
      {/* Ícono decorativo en esquina superior derecha — muy sutil */}
      {icon && (
        <div style={{
          position:   'absolute',
          top:        -8,
          right:      -4,
          fontSize:   52,
          opacity:    0.04,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {icon}
        </div>
      )}

      {/* Etiqueta */}
      <div className="lbl" style={{ marginBottom:4 }}>{label}</div>

      {/* Número principal */}
      <div className="mono" style={{
        fontSize: 20,
        color:    color || 'var(--text)',
      }}>
        {value}
      </div>

      {/* Subtexto opcional */}
      {sub && (
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── ProgressBar — Barra de progreso ──────────────────────────────────────────
/**
 * Barra de progreso con color semántico automático.
 *
 * Lógica de color automático (si no se pasa `color`):
 *   ≤50% → verde   (bien, hay margen)
 *   51-80% → amarillo (advertencia, acercándose al límite)
 *   >80%  → rojo   (alerta, límite cercano o superado)
 *
 * Para tarjetas de crédito: >80% de utilización es rojo ✓
 * Para deudas: el color por defecto también funciona (más pagado = más verde)
 * Para metas: usar color={goal.color} para mantener la identidad visual de la meta
 *
 * La transición CSS suaviza el cambio de ancho al cargar datos (0.8s).
 *
 * @param {number} value   - Valor actual
 * @param {number} max     - Valor máximo / 100%
 * @param {number} height  - Altura de la barra en px (default: 8)
 * @param {string} color   - Color fijo (override del automático)
 */
export function ProgressBar({ value, max, height = 8, color }) {
  // Calcular porcentaje (0-100, nunca negativo ni superior a 100)
  const percentage = max > 0
    ? Math.min(100, Math.max(0, Math.round((value / max) * 100)))
    : 0

  // Color automático según umbral
  const autoColor = percentage > 80
    ? 'var(--red)'
    : percentage > 50
      ? 'var(--yellow)'
      : 'var(--green)'

  const fillColor = color || autoColor

  return (
    /* Contenedor: fondo gris oscuro (vacío) */
    <div className="pb" style={{ height }}>
      {/* Relleno: color semántico, transición suave */}
      <div
        className="pf"
        style={{ width:`${percentage}%`, background:fillColor }}
      />
    </div>
  )
}

// ── SectionHeader — Encabezado de sección ────────────────────────────────────
/**
 * Título h2 de sección con acción opcional en el lado derecho.
 *
 * Patrón más común:
 *   <SectionHeader
 *     title="Deudas"
 *     action={<Btn size="sm" onClick={...}>+ Nueva deuda</Btn>}
 *   />
 *
 * @param {string}    title  - Título de la sección
 * @param {ReactNode} action - Componente de acción (botón, etc.) — opcional
 */
export function SectionHeader({ title, action }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginBottom:   14,
    }}>
      <div className="h2">{title}</div>
      {action && action}
    </div>
  )
}

// ── Empty — Estado vacío ──────────────────────────────────────────────────────
/**
 * Pantalla de estado vacío cuando no hay datos para mostrar.
 * Proporciona feedback visual claro al usuario en lugar de mostrar nada.
 *
 * Se usa cuando:
 *   - No hay transacciones en el período seleccionado
 *   - No hay deudas registradas
 *   - No hay metas configuradas
 *   - El filtro activo no devuelve resultados
 *
 * @param {string} icon    - Emoji ilustrativo (default: '📭')
 * @param {string} message - Mensaje descriptivo (default: 'Sin datos')
 */
export function Empty({ icon = '📭', message = 'Sin datos' }) {
  return (
    <div style={{
      textAlign:  'center',
      padding:    40,
      color:      'var(--muted)',
    }}>
      <div style={{ fontSize:40, marginBottom:12, lineHeight:1 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{message}</div>
    </div>
  )
}

// ── TypeBadge — Badge de tipo de transacción ──────────────────────────────────
/**
 * Badge semántico que indica el tipo de una transacción.
 *
 * Colores:
 *   income  → verde  (#2dd4a0) — dinero que entra
 *   expense → rojo   (#ff6b6b) — dinero que sale
 *   saving  → lavanda (#a78bfa) — dinero apartado
 *
 * @param {'income'|'expense'|'saving'} type - Tipo de transacción
 * @param {string} label - Texto a mostrar (normalmente t[type])
 */
const TYPE_STYLES = {
  income:  { background:'#2dd4a014', color:'#2dd4a0' },
  expense: { background:'#ff6b6b14', color:'#ff6b6b' },
  saving:  { background:'#a78bfa14', color:'#a78bfa' },
}

export function TypeBadge({ type, label }) {
  return (
    <span style={{
      ...(TYPE_STYLES[type] || {}),
      borderRadius: 5,
      padding:      '2px 7px',
      fontSize:     11,
      fontWeight:   600,
      whiteSpace:   'nowrap',
    }}>
      {label || type}
    </span>
  )
}