// src/components/charts/PieChart.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gráfica de dona (donut) para distribución por categorías.
//
// CASOS DE USO:
//   - Dashboard: distribución de gastos por categoría del período
//   - Statements → Estado de Resultados: pie de gastos
//
// POR QUÉ DONUT Y NO PIE PURO:
//   El agujero central (innerRadius) permite mostrar el total o un KPI
//   en el centro sin necesidad de un elemento adicional.
//   Visualmente es más moderno y legible con pocos colores.
//
// LEYENDA MANUAL:
//   En lugar de usar el componente Legend de Recharts (que puede
//   desalinearse en mobile), se renderiza una leyenda manual debajo
//   del chart con flexbox. Solo muestra las primeras N categorías.
//
// COLORES:
//   Cada categoría tiene un color predefinido en CAT_COLORS (constants.js).
//   Si una categoría no tiene color definido, usa el azul por defecto.
// ─────────────────────────────────────────────────────────────────────────────
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CAT_COLORS } from '../../lib/constants'

const TOOLTIP_STYLE = {
  background:   'var(--card)',
  border:       '1px solid var(--border)',
  borderRadius: 8,
  fontSize:     12,
}

/**
 * CategoryPieChart — Donut chart para distribución por categorías.
 *
 * @param {Array}    data          - [{ category: string, value: number }]
 * @param {number}   height        - Altura en px (default: 180)
 * @param {number}   innerRadius   - Radio del agujero (default: 42)
 * @param {number}   outerRadius   - Radio exterior (default: 70)
 * @param {number}   legendMax     - Máximo de ítems en la leyenda (default: 6)
 * @param {function} formatter     - Formato del tooltip: v => string
 * @param {function} labelFormatter - Formato del label del tooltip
 * @param {object}   labelMap      - Mapa categoría → nombre legible
 *                                   (ej: t.cats — las traducciones)
 *
 * EJEMPLO:
 *   <CategoryPieChart
 *     data={summary.by_category}
 *     formatter={v => fmt(v)}
 *     labelFormatter={cat => t.cats[cat] || cat}
 *     labelMap={t.cats}
 *   />
 */
export default function CategoryPieChart({
  data         = [],
  height       = 180,
  innerRadius  = 42,
  outerRadius  = 70,
  legendMax    = 6,
  formatter,
  labelFormatter,
  labelMap     = {},
}) {
  if (!data.length) {
    return (
      <div style={{
        height,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          'var(--muted)',
        fontSize:       12,
      }}>
        Sin datos para mostrar
      </div>
    )
  }

  return (
    <div>
      {/* ── GRÁFICA ── */}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}           // espacio entre sectores
            strokeWidth={0}            // sin borde entre sectores
          >
            {data.map(entry => (
              <Cell
                key={entry.category}
                fill={CAT_COLORS[entry.category] || '#4f7cff'}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={formatter}
            labelFormatter={labelFormatter || (l => labelMap[l] || l)}
          />
        </RechartsPieChart>
      </ResponsiveContainer>

      {/* ── LEYENDA MANUAL ── */}
      {/*
        Muestra los primeros `legendMax` ítems con su color y nombre.
        El layout flex con wrap permite que se ajuste en mobile.
      */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        {data.slice(0, legendMax).map(d => (
          <div
            key={d.category}
            style={{ display:'flex', alignItems:'center', gap:4 }}
          >
            {/* Punto de color */}
            <div style={{
              width:        7,
              height:       7,
              borderRadius: 2,
              background:   CAT_COLORS[d.category] || '#4f7cff',
              flexShrink:   0,
            }} />
            {/* Nombre de la categoría */}
            <span style={{ fontSize:10, color:'var(--muted)', lineHeight:1 }}>
              {labelMap[d.category] || d.category}
            </span>
          </div>
        ))}

        {/* Indicador si hay más categorías */}
        {data.length > legendMax && (
          <span style={{ fontSize:10, color:'var(--muted)' }}>
            +{data.length - legendMax} más
          </span>
        )}
      </div>
    </div>
  )
}