// src/components/charts/TrendMiniBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Mini gráfica de barras para visualizar la tasa de ahorro mensual.
//
// CASO DE USO:
//   Statements → Tendencia → Sección "Tasa de ahorro mensual"
//   Muestra una columna compacta por mes con:
//   - Altura proporcional a la tasa de ahorro (0-70%+)
//   - Color semántico (verde/amarillo/rojo según el porcentaje)
//   - Etiqueta del mes y valor de tasa debajo de cada columna
//
// POR QUÉ NO USAR RECHARTS AQUÍ:
//   Para una visualización tan simple y compacta, HTML/CSS puro es más
//   eficiente que Recharts. Evita el overhead de SVG para unos pocos elementos.
//   Además, el control del color semántico es más directo.
//
// LÓGICA DE COLOR:
//   ≥40% → verde   — excelente tasa de ahorro (sobre el promedio canadiense)
//   ≥20% → amarillo — tasa aceptable, hay margen de mejora
//   <20%  → rojo    — tasa baja, alerta financiera
//
// USO:
//   <SavingsRateBar months={trendData} />
//   donde cada ítem tiene: { label: 'May\'25', income: 12400, expense: 7820 }
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SavingsRateBar — Mini gráfica de tasa de ahorro por mes.
 *
 * @param {Array}    months   - Datos mensuales con income y expense
 * @param {number}   maxHeight - Altura máxima de las barras en px (default: 40)
 *
 * La tasa de ahorro se calcula como:
 *   savings_rate = (income - expense) / income * 100
 * (Si income es 0, la tasa es 0 para evitar división por cero)
 */
export default function SavingsRateBar({ months = [], maxHeight = 40 }) {
  if (!months.length) return null

  return (
    <div style={{
      display:  'flex',
      gap:      8,
      flexWrap: 'wrap',
      alignItems:'flex-end',  // alinear al fondo para que barras "crezcan hacia arriba"
    }}>
      {months.map((m, i) => {
        // Calcular tasa de ahorro del mes
        const rate = m.income > 0
          ? parseFloat(((m.income - m.expense) / m.income * 100).toFixed(1))
          : 0

        // Color semántico según la tasa
        const barColor = rate >= 40
          ? 'var(--green)'
          : rate >= 20
            ? 'var(--yellow)'
            : 'var(--red)'

        // Altura de la barra: proporcional a la tasa (max 70% → maxHeight px)
        // Mínimo de 4px para que siempre sea visible
        const barHeightPx = Math.max(4, (rate / 70) * maxHeight)

        return (
          <div
            key={m.month || i}
            style={{
              flex:          1,
              minWidth:      40,
              textAlign:     'center',
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           4,
            }}
          >
            {/* Contenedor de la barra con altura fija */}
            <div style={{
              height:         maxHeight,
              display:        'flex',
              alignItems:     'flex-end',
              justifyContent: 'center',
              width:          '100%',
            }}>
              {/* La barra en sí */}
              <div style={{
                width:        24,
                height:       barHeightPx,
                borderRadius: '4px 4px 0 0',
                background:   barColor,
                opacity:      0.75,
                transition:   'height .6s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>

            {/* Etiqueta del mes */}
            <div style={{ fontSize:9, color:'var(--muted)', lineHeight:1 }}>
              {m.label || m.month?.slice(5) || ''}
            </div>

            {/* Valor de la tasa */}
            <div style={{
              fontSize:   11,
              fontWeight: 700,
              color:      barColor,
              lineHeight: 1,
            }}>
              {rate}%
            </div>
          </div>
        )
      })}
    </div>
  )
}