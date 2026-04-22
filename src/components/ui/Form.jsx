// src/components/ui/Form.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componentes de formulario — campos, inputs, selects y botones
// de acción estándar para los modales de la app.
//
// COMPONENTES EXPORTADOS:
//
//   Field        → Wrapper que combina una etiqueta (label) con cualquier input.
//                  Aplica la clase .lbl automáticamente a la etiqueta.
//
//   Input        → <input> estilizado con borde que cambia a azul en focus.
//                  Pasa todos los props adicionales al elemento nativo.
//
//   Select       → <select> estilizado que coincide visualmente con Input.
//                  Los <option> usan var(--card) para el dropdown.
//
//   ModalFooter  → Par estándar de botones Cancelar + Guardar para formularios.
//                  El botón de guardar puede desactivarse con disabled.
//
//   ColorPicker  → Grid de círculos de color para elegir el color de
//                  una cuenta, tarjeta o meta. El color seleccionado
//                  se resalta con un borde blanco.
//
// PATRONES DE USO:
//   <Field label="Descripción">
//     <Input value={f.desc} onChange={e => set('desc', e.target.value)} />
//   </Field>
//
//   <Field label="Categoría">
//     <Select value={f.cat} onChange={e => set('cat', e.target.value)}>
//       {cats.map(c => <option key={c} value={c}>{t.cats[c]}</option>)}
//     </Select>
//   </Field>
//
//   <ModalFooter onClose={closeModal} onSave={handleSave} disabled={!isValid} />
// ─────────────────────────────────────────────────────────────────────────────
import Btn from './Btn'

// ── Estilos base compartidos entre Input y Select ─────────────────────────────
const BASE_FIELD_STYLE = {
  background:   'var(--bg)',
  border:       '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding:      '9px 13px',
  color:        'var(--text)',
  fontFamily:   'var(--font-body)',
  fontSize:     13,
  width:        '100%',
  outline:      'none',
  transition:   'border-color .15s',
}

// ── Field ─────────────────────────────────────────────────────────────────────
/**
 * Wrapper de campo de formulario con etiqueta opcional.
 * La etiqueta usa la clase .lbl (definida en index.css):
 * mayúsculas, color muted, 10px, letra espaciada.
 *
 * @param {string}    label    - Texto de la etiqueta (opcional)
 * @param {ReactNode} children - El input, select u otro control
 */
export function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {label && (
        <div className="lbl">{label}</div>
      )}
      {children}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
/**
 * Elemento <input> estilizado.
 *
 * El borde cambia a azul al hacer focus (onFocus/onBlur manuales porque
 * CSS-in-JS no soporta pseudo-selectores como :focus).
 *
 * Pasa todos los props adicionales al input nativo:
 *   type, value, onChange, placeholder, min, max, step, maxLength,
 *   onKeyDown, disabled, etc.
 *
 * @param {object} style - Estilos adicionales (override)
 */
export function Input({ style, ...props }) {
  return (
    <input
      style={{ ...BASE_FIELD_STYLE, ...style }}
      onFocus={e  => { e.target.style.borderColor = 'var(--blue)' }}
      onBlur={e   => { e.target.style.borderColor = 'var(--border)' }}
      {...props}
    />
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
/**
 * Elemento <select> estilizado que coincide visualmente con Input.
 *
 * Las opciones del dropdown heredan var(--card) como fondo en navegadores
 * que lo soporten (principalmente desktop). En iOS el dropdown es nativo.
 *
 * @param {ReactNode} children - Elementos <option>
 * @param {object}    style    - Estilos adicionales
 */
export function Select({ children, style, ...props }) {
  return (
    <select
      style={{
        ...BASE_FIELD_STYLE,
        cursor:    'pointer',
        // Estilo del dropdown en Chromium/Firefox
        colorScheme:'dark',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

// ── ModalFooter ───────────────────────────────────────────────────────────────
/**
 * Fila estándar de botones al final de los formularios modales.
 *
 * Layout:  [Cancelar (flex:1)] [Guardar (flex:2)]
 * El botón de guardar ocupa el doble de espacio que el de cancelar,
 * siguiendo la convención UX de destacar la acción principal.
 *
 * @param {function} onClose      - Función para cerrar sin guardar
 * @param {function} onSave       - Función para guardar
 * @param {string}   saveLabel    - Texto del botón guardar (default: 'Guardar')
 * @param {string}   cancelLabel  - Texto del botón cancelar (default: 'Cancelar')
 * @param {boolean}  disabled     - Si true, desactiva el botón guardar
 */
export function ModalFooter({
  onClose,
  onSave,
  saveLabel   = 'Guardar',
  cancelLabel = 'Cancelar',
  disabled,
}) {
  return (
    <div style={{ display:'flex', gap:8, marginTop:8 }}>
      {/* Cancelar: ghost, menor prominencia */}
      <Btn
        variant="ghost"
        style={{ flex:1 }}
        onClick={onClose}
      >
        {cancelLabel}
      </Btn>

      {/* Guardar: primary, mayor prominencia, puede estar desactivado */}
      <Btn
        variant="primary"
        style={{ flex:2 }}
        onClick={onSave}
        disabled={disabled}
      >
        {saveLabel}
      </Btn>
    </div>
  )
}

// ── ColorPicker ───────────────────────────────────────────────────────────────
/**
 * Grid de círculos de color para seleccionar el color de una cuenta,
 * tarjeta o meta de ahorro.
 *
 * El color seleccionado se resalta con un borde blanco de 3px.
 * Los colores disponibles se pasan como prop (generalmente ACC_COLORS).
 *
 * @param {string[]} colors   - Array de colores en formato hex
 * @param {string}   selected - Color actualmente seleccionado
 * @param {function} onChange - Callback con el color seleccionado: (color: string) => void
 */
export function ColorPicker({ colors, selected, onChange }) {
  return (
    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
      {colors.map(color => (
        <div
          key={color}
          onClick={() => onChange(color)}
          title={color}
          style={{
            width:        28,
            height:       28,
            borderRadius: 8,
            background:   color,
            cursor:       'pointer',
            // Borde blanco si está seleccionado, transparente si no
            border: selected === color
              ? '3px solid #ffffff'
              : '3px solid transparent',
            transition:   'border .1s, transform .1s',
            flexShrink:   0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'   }}
        />
      ))}
    </div>
  )
}