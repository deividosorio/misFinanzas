// src/components/charts/BarChart.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gráficas de barras reutilizables — vertical agrupada y horizontal.
//
// DOS VARIANTES:
//
//   MonthlyBarChart → Barras verticales agrupadas por mes.
//     Muestra income / expense / saving como 3 barras por mes.
//     Usada en: Dashboard (tendencia mensual), Admin (MRR).
//
//   HorizontalBarChart → Barras horizontales por categoría.
//     Útil para comparar categorías donde los nombres son largos.
//     Usada en: Statements → Estado de Resultados (distribución de gastos).
//
// CONFIGURACIÓN DE BARRAS:
//   barSize: tamaño fijo de cada barra en px (evita barras demasiado anchas
//   en períodos con pocos meses o demasiado delgadas con muchos).
//   radius: [top-left, top-right, bottom-right, bottom-left] para redondear
//   solo la parte superior de las barras verticales.
//
// DEPENDENCIAS:
//   recharts: BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
//             CartesianGrid, Cell
// ─────────────────────────────────────────────────────────────────────────────
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { CAT_COLORS } from '../../lib/constants'

const TOOLTIP_STYLE = {
  background:   'var(--card)',
  border:       '1px solid var(--border)',
  borderRadius: 8,
  fontSize:     12,
}

// ── MonthlyBarChart — Barras verticales agrupadas por mes ─────────────────────
/**
 * Gráfica de barras verticales agrupadas para comparar series por mes.
 *
 * Cada mes tiene hasta 3 barras (income, expense, saving).
 * Las barras tienen la parte superior redondeada para un look moderno.
 *
 * @param {Array}    data      - [{ label, income, expense, saving }]
 * @param {Array}    bars      - Config de barras: [{ key, color, label }]
 * @param {number}   height    - Altura en px (default: 180)
 * @param {number}   barSize   - Ancho de cada barra en px (default: 9)
 * @param {function} formatter - Formato del tooltip: v => string
 *
 * EJEMPLO:
 *   <MonthlyBarChart
 *     data={trendData}
 *     height={180}
 *     formatter={v => fmt(v)}
 *     bars={[
 *       { key:'income',  color:'#2dd4a0', label:'Ingresos' },
 *       { key:'expense', color:'#ff6b6b', label:'Gastos'   },
 *       { key:'saving',  color:'#a78bfa', label:'Ahorros'  },
 *     ]}
 *   />
 */
export function MonthlyBarChart({
  data      = [],
  bars      = [],
  height    = 180,
  barSize   = 9,
  formatter,
}) {
  if (!data.length) {
    return (
      <div style={{
        height,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--muted)', fontSize:12,
      }}>
        Sin datos
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        barSize={barSize}
        barGap={2}        // espacio entre barras del mismo grupo
        barCategoryGap="20%"  // espacio entre grupos de meses
        margin={{ top:4, right:4, bottom:0, left:0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill:'var(--muted)', fontSize:9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill:'var(--muted)', fontSize:9 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatter}
          cursor={{ fill:'var(--border)', opacity:0.3 }}
        />

        {/* Renderizar una Bar por cada serie configurada */}
        {bars.map(bar => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.label || bar.key}
            fill={bar.color}
            radius={[3, 3, 0, 0]}   // solo esquinas superiores redondeadas
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

// ── HorizontalBarChart — Barras horizontales por categoría ────────────────────
/**
 * Gráfica de barras horizontales para comparar valores por categoría.
 * El layout="vertical" en Recharts invierte los ejes:
 *   - XAxis → valores numéricos (horizontal)
 *   - YAxis → categorías (vertical, etiquetas a la izquierda)
 *
 * Cada barra tiene el color de la categoría correspondiente (CAT_COLORS).
 *
 * @param {Array}    data         - [{ category: string, value: number }]
 * @param {number}   height       - Altura total en px (default: 220)
 * @param {number}   yAxisWidth   - Ancho reservado para etiquetas (default: 90)
 * @param {function} formatter    - Formato del tooltip: v => string
 * @param {object}   labelMap     - Mapa categoría → nombre: { food: 'Alimentación' }
 *
 * EJEMPLO:
 *   <HorizontalBarChart
 *     data={summary.by_category}
 *     formatter={v => fmt(v)}
 *     labelMap={t.cats}
 *     height={220}
 *   />
 */
export function HorizontalBarChart({
  data        = [],
  height      = 220,
  yAxisWidth  = 90,
  formatter,
  labelMap    = {},
}) {
  if (!data.length) {
    return (
      <div style={{
        height,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--muted)', fontSize:12,
      }}>
        Sin datos
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout="vertical"    // barras horizontales
        barSize={14}
        margin={{ top:0, right:12, bottom:0, left:0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" horizontal={false} />

        {/* Eje numérico (horizontal) */}
        <XAxis
          type="number"
          tick={{ fill:'var(--muted)', fontSize:9 }}
          axisLine={false}
          tickLine={false}
        />

        {/* Eje de categorías (vertical) */}
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill:'var(--muted)', fontSize:11 }}
          tickFormatter={cat => labelMap[cat] || cat}
          width={yAxisWidth}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatter}
          labelFormatter={l => labelMap[l] || l}
          cursor={{ fill:'var(--border)', opacity:0.3 }}
        />

        {/* Una sola Bar con colores por categoría (Cell) */}
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map(entry => (
            <Cell
              key={entry.category}
              fill={CAT_COLORS[entry.category] || '#4f7cff'}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}