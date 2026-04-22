// src/components/ui/Btn.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componente de botón principal de la aplicación.
//
// VARIANTES DE ESTILO:
//   primary → azul sólido    — acción principal (Guardar, Agregar, Aplicar)
//   ghost   → transparente   — acción secundaria (Cancelar, Exportar)
//   danger  → rojo suave     — acciones destructivas (Eliminar)
//   success → verde suave    — confirmaciones (Marcar pagado, Depositar)
//   subtle  → gris neutro    — acciones de bajo énfasis
//
// TAMAÑOS:
//   xs  → 3px/8px padding, 11px font  — badges, filtros inline
//   sm  → 5px/11px padding, 12px font — acciones en tarjetas
//   md  → 8px/16px padding, 13px font — formularios (DEFAULT)
//   lg  → 11px/20px padding, 14px font — CTAs principales
//
// COMPORTAMIENTO:
//   disabled → opacity 0.5, cursor not-allowed (no bloquea el evento click,
//              eso lo hace el atributo disabled nativo del button)
//   onMouseEnter/Leave → efecto hover manual (CSS-in-JS no soporta :hover)
//
// USO:
//   <Btn variant="primary" size="sm" onClick={handleSave}>Guardar</Btn>
//   <Btn variant="ghost" size="xs">Cancelar</Btn>
//   <Btn variant="danger" disabled={loading}>Eliminar</Btn>
// ─────────────────────────────────────────────────────────────────────────────

// Estilos de cada variante — aplicados al elemento <button>
const VARIANTS = {
  primary: {
    background: 'var(--blue)',
    color:      '#fff',
    border:     'none',
  },
  ghost: {
    background: 'transparent',
    color:      'var(--muted)',
    border:     '1px solid var(--border)',
  },
  danger: {
    background: '#ff6b6b14',
    color:      '#ff6b6b',
    border:     '1px solid #ff6b6b22',
  },
  success: {
    background: '#2dd4a014',
    color:      '#2dd4a0',
    border:     '1px solid #2dd4a022',
  },
  subtle: {
    background: 'var(--border)',
    color:      'var(--text)',
    border:     'none',
  },
}

// Dimensiones de cada tamaño
const SIZES = {
  xs: { padding: '3px 8px',   fontSize: '11px', borderRadius: '6px'                   },
  sm: { padding: '5px 11px',  fontSize: '12px', borderRadius: '8px'                   },
  md: { padding: '8px 16px',  fontSize: '13px', borderRadius: 'var(--radius-sm)'      },
  lg: { padding: '11px 20px', fontSize: '14px', borderRadius: 'var(--radius)'         },
}

// Colores de hover para variantes con fondo oscuro (ghost)
const HOVER_OVERRIDES = {
  ghost: { background: 'var(--border)', color: 'var(--text)' },
}

/**
 * Btn — Botón reutilizable con variantes y tamaños.
 *
 * @param {'primary'|'ghost'|'danger'|'success'|'subtle'} variant
 * @param {'xs'|'sm'|'md'|'lg'} size
 * @param {ReactNode} children - Contenido del botón
 * @param {object}   style     - Estilos adicionales (override)
 * @param {boolean}  disabled  - Desactiva el botón
 * @param {function} onClick   - Handler de clic
 */
export default function Btn({
  variant  = 'primary',
  size     = 'md',
  children,
  style,
  disabled,
  onClick,
  ...props
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.primary
  const sizeStyle    = SIZES[size] || SIZES.md

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // Hover manual para variantes que lo necesitan
      onMouseEnter={e => {
        if (disabled) return
        const hover = HOVER_OVERRIDES[variant]
        if (hover) Object.assign(e.currentTarget.style, hover)
      }}
      onMouseLeave={e => {
        if (disabled) return
        const hover = HOVER_OVERRIDES[variant]
        if (hover) {
          // Restaurar estilos originales
          e.currentTarget.style.background = variantStyle.background
          e.currentTarget.style.color      = variantStyle.color
        }
      }}
      style={{
        // Base del botón
        fontFamily:  'var(--font-body)',
        fontWeight:  600,
        cursor:      disabled ? 'not-allowed' : 'pointer',
        opacity:     disabled ? 0.5 : 1,
        transition:  'all .15s',
        display:     'inline-flex',
        alignItems:  'center',
        gap:         6,
        whiteSpace:  'nowrap',
        lineHeight:  1,
        // Variante + tamaño
        ...variantStyle,
        ...sizeStyle,
        // Overrides del llamador
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}