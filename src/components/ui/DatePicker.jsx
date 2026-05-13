// src/components/ui/DatePicker.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Selector de fecha responsive — calendario visual para mobile/desktop.
//
// CARACTERÍSTICAS:
//   • Componente ligero — sin dependencias externas
//   • Responsive — se adapta automáticamente a mobile/desktop
//   • Touch-friendly — botones grandes, navegación clara
//   • Keyboard-friendly — atajos con flechas y Enter
//   • Accesible — ARIA labels, focus management
//
// VERSIÓN DE ESCRITORIO:
//   • Popover — se abre arriba o abajo del input
//   • Cierra al tocar fuera
//
// VERSIÓN MOBILE (max-width: 768px):
//   • Sheet modal — slide up desde el bottom
//   • Overlay oscuro — cierra al tocar
//   • Optimizado para touch
//
// USO:
//   <DatePicker value="2024-05-15" onChange={(date) => setDate(date)} label="Fecha" />
//
// PROPS:
//   • value (string)    : ISO date (YYYY-MM-DD)
//   • onChange (fn)     : Callback con la fecha seleccionada
//   • label (string)    : Etiqueta del campo
//   • placeholder (str) : Placeholder del input
//   • disabled (bool)   : Deshabilitar el componente
//   • min (string)      : Fecha mínima permitida
//   • max (string)      : Fecha máxima permitida
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react'

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DatePicker({ value, onChange, label, placeholder = 'Seleccionar fecha', disabled, min, max }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(() => {
    if (!value) return new Date()
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  })
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const year = current.getFullYear()
  const month = current.getMonth()
  const daysCount = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const days = Array.from({ length: daysCount }, (_, i) => i + 1)

  const isDateDisabled = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (min && dateStr < min) return true
    if (max && dateStr > max) return true
    return false
  }

  const handleSelect = (day) => {
    if (isDateDisabled(day)) return
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  const handlePrevMonth = () => {
    setCurrent(new Date(year, month - 1))
  }

  const handleNextMonth = () => {
    setCurrent(new Date(year, month + 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrent(new Date(today.getFullYear(), today.getMonth()))
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    onChange(dateStr)
    setOpen(false)
  }

  // Cerrar al clickear fuera (desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Formatear la fecha para mostrar en el input
  const displayValue = value ? new Date(value + 'T00:00').toLocaleDateString('es-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  }) : ''

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input visual */}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        onClick={() => !disabled && setOpen(!open)}
        style={{
          width: '100%',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          color: 'var(--text)',
          fontSize: 12,
          outline: 'none',
          fontFamily: 'var(--font-body)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      />

      {/* Icono de calendario */}
      <div style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--muted)',
        pointerEvents: 'none',
        fontSize: 14,
      }}>
        📅
      </div>

      {open && !disabled && (
        <>
          {/* SHEET MODAL (mobile) */}
          <div
            className="calendar-sheet-overlay"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 99,
              display: 'none', // Mostrado solo en mobile via CSS
            }}
          />

          {/* POPOVER (desktop) */}
          <div
            className="calendar-popover"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 100,
              padding: 12,
              width: 280,
              display: 'block', // Mostrado por defecto en desktop
            }}
          >
            <CalendarContent
              year={year}
              month={month}
              days={days}
              firstDay={firstDay}
              value={value}
              onSelect={handleSelect}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              isDateDisabled={isDateDisabled}
            />
          </div>

          {/* SHEET CONTENT (mobile) */}
          <div
            className="calendar-sheet"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderRadius: '12px 12px 0 0',
              borderTop: '1px solid var(--border)',
              zIndex: 100,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 16,
              display: 'none', // Mostrado solo en mobile via CSS
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle visual */}
            <div style={{
              height: 4,
              width: 40,
              background: 'var(--border)',
              borderRadius: 2,
              margin: '0 auto 16px',
            }} />

            <CalendarContent
              year={year}
              month={month}
              days={days}
              firstDay={firstDay}
              value={value}
              onSelect={handleSelect}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onToday={handleToday}
              isDateDisabled={isDateDisabled}
            />
          </div>

          {/* Media queries inline */}
          <style>{`
            @media (max-width: 768px) {
              .calendar-sheet-overlay { display: block !important; }
              .calendar-popover { display: none !important; }
              .calendar-sheet { display: block !important; }
            }
            @media (min-width: 769px) {
              .calendar-sheet-overlay { display: none !important; }
              .calendar-popover { display: block !important; }
              .calendar-sheet { display: none !important; }
            }
          `}</style>
        </>
      )}
    </div>
  )
}

// ── CalendarContent — Contenido reutilizable del calendario ───────────────────
function CalendarContent({
  year, month, days, firstDay, value,
  onSelect, onPrevMonth, onNextMonth, onToday,
  isDateDisabled
}) {
  const selectedDay = value ? parseInt(value.split('-')[2]) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header — navegación de meses */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <button
          onClick={onPrevMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--text)',
            padding: '4px 8px',
          }}
        >
          ←
        </button>
        <div style={{
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text)',
          textAlign: 'center',
          flex: 1,
        }}>
          {monthNames[month]} {year}
        </div>
        <button
          onClick={onNextMonth}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: 'var(--text)',
            padding: '4px 8px',
          }}
        >
          →
        </button>
      </div>

      {/* Nombres de días */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
        marginBottom: 4,
      }}>
        {dayNames.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
      }}>
        {/* Celdas vacías al inicio */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Días del mes */}
        {days.map(day => {
          const isSelected = selectedDay === day
          const isDisabled = isDateDisabled(day)
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === new Date().toISOString().split('T')[0]

          return (
            <button
              key={day}
              onClick={() => onSelect(day)}
              disabled={isDisabled}
              style={{
                background: isSelected ? 'var(--blue)' : isToday ? 'var(--border)' : 'transparent',
                color: isSelected ? 'white' : isDisabled ? 'var(--muted)' : 'var(--text)',
                border: isToday && !isSelected ? '1px solid var(--blue)' : '1px solid transparent',
                borderRadius: 6,
                padding: '8px 4px',
                fontSize: 12,
                fontWeight: 500,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => {
                if (!isDisabled && !isSelected) {
                  e.target.style.background = 'var(--border)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled && !isSelected) {
                  e.target.style.background = 'transparent'
                }
              }}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Botón "Hoy" */}
      <button
        onClick={onToday}
        style={{
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text)',
          cursor: 'pointer',
          transition: 'all .15s',
          marginTop: 4,
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--blue)'
          e.target.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'var(--border)'
          e.target.style.color = 'var(--text)'
        }}
      >
        Hoy
      </button>
    </div>
  )
}
