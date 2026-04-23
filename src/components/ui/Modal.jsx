// src/components/ui/Modal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componente modal accesible con overlay y cierre múltiple.
//
// CARACTERÍSTICAS DE ACCESIBILIDAD:
//   - Cierre con tecla Escape (useEffect + event listener)
//   - Cierre al hacer clic en el fondo oscuro (onClick en el overlay)
//   - stopPropagation en el contenido para evitar cierre accidental
//   - Scroll interno (overflowY: auto) si el contenido supera 90vh
//
// CAPAS VISUALES:
//   Overlay (fondo oscuro, z:100) → Contenedor del modal → Contenido
//   El zIndex 100 está por encima del Header (40) y del Sidebar (40).
//
// HEADER DEL MODAL:
//   Título a la izquierda + botón ✕ a la derecha.
//   El botón ✕ tiene hover effect manual.
//
// USO:
//   <Modal title="Nueva transacción" onClose={closeModal}>
//     <div>contenido del formulario...</div>
//   </Modal>
//
//   Ancho personalizado:
//   <Modal title="..." onClose={...} width={560}>...</Modal>
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react'

/**
 * Modal — Overlay modal con header y cierre accesible.
 *
 * @param {string}   title    - Título mostrado en el header del modal
 * @param {function} onClose  - Función para cerrar el modal
 * @param {ReactNode} children - Contenido (formulario, confirmación, etc.)
 * @param {number}   width    - Ancho máximo en px (default: 440)
 */
export default function Modal({ title, onClose, children, width = 440 }) {

  // ── Cerrar con tecla Escape ─────────────────────────────────────────────
  // Se registra al montar y se limpia al desmontar para evitar memory leaks.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    // ── OVERLAY OSCURO ────────────────────────────────────────────────────
    // onClick aquí → cierra el modal al hacer clic fuera del contenido.
    // backdropFilter: blur → enfoca la atención en el modal.
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,         // top:0, right:0, bottom:0, left:0
        background:     '#00000099',
        zIndex:         100,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        16,
        overflowY:      'auto',    // permite scroll si el modal es muy alto
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {/* ── CONTENEDOR DEL MODAL ─────────────────────────────────────── */}
      {/* stopPropagation → evita que el clic dentro cierre el modal.     */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   'var(--card)',
          border:       '1px solid var(--border)',
          borderRadius: 20,
          padding:      26,
          width:        '100%',
          maxWidth:     width,
          maxHeight:    '90vh',
          overflowY:    'auto',    // scroll interno si el contenido es largo
          boxShadow:    '0 8px 48px #00000066',
          // Animación de entrada suave
          animation:    'modalIn .2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ── HEADER DEL MODAL ──────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   20,
        }}>
          {/* Título */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize:   16,
            fontWeight: 700,
          }}>
            {title}
          </div>

          {/* Botón cerrar ✕ */}
          <button
            onClick={onClose}
            title="Cerrar"
            style={{
              background:   'none',
              border:       'none',
              cursor:       'pointer',
              color:        'var(--muted)',
              fontSize:     18,
              lineHeight:   1,
              padding:      '4px 6px',
              borderRadius: 4,
              transition:   'color .15s, background .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color      = 'var(--text)'
              e.currentTarget.style.background = 'var(--border)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color      = 'var(--muted)'
              e.currentTarget.style.background = 'none'
            }}
          >
            ✕
          </button>
        </div>

        {/* ── CONTENIDO DEL MODAL ───────────────────────────────────── */}
        {children}
      </div>

      {/* Animación de entrada — definida aquí para no contaminar index.css */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}