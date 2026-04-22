// src/components/charts/AreaChart.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gráfica de área reutilizable para mostrar tendencias temporales.
//
// CASOS DE USO EN MIFINANZA:
//   - Dashboard: ingresos vs gastos de los últimos 8 meses
//   - Statements: tendencia del período seleccionado
//   - Admin: curva de MRR (Monthly Recurring Revenue)
//
// POR QUÉ ÁREA Y NO LÍNEA:
//   Las gráficas de área con gradiente translúcido comunican mejor
//   la "masa" o volumen de los datos, no solo la tendencia puntual.
//   Son más legibles en pantallas pequeñas y fondo oscuro.
//
// GRADIENTES:
//   Cada serie tiene un gradiente propio definido con linearGradient SVG.
//   El id del gradiente debe ser único si hay múltiples instancias en la
//   misma página — por eso recibe un `gradientId` como prop.
//
// TOOLTIP:
//   Estilo oscuro consistente con el tema de la app.
//   El formatter permite personalizar el formato del valor (ej: fmt(v)).
//
// DEPENDENCIAS:
//   recharts: AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
//             CartesianGrid, defs, linearGradient, stop
// ─────────────────────────────────────────────────────────────────────────────
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  defs,
} from 'recharts'

// Estilo del tooltip — consistente en toda la app
const TOOLTIP_STYLE = {
  background:   'var(--card)',
  border:       '1px solid var(--border)',
  borderRadius: 8,
  fontSize:     12,
  color:        'var(--text)',
}

/**
 * TrendAreaChart — Gráfica de área para tendencias con múltiples series.
 *
 * @param {Array}  data          - Array de objetos con las series de datos
 * @param {Array}  series        - Configuración de series:
 *                                 [{ key, color, label, gradientId }]
 * @param {string} xKey          - Clave del eje X en los datos (ej: 'label')
 * @param {number} height        - Altura de la gráfica en px (default: 200)
 * @param {function} formatter   - Función para formatear valores del tooltip
 *                                 (ej: v => fmt(v))
 * @param {function} labelFormatter - Función para formatear labels del tooltip
 *
 * EJEMPLO DE USO:
 *   <TrendAreaChart
 *     data={monthlyTrend}
 *     xKey="label"
 *     height={220}
 *     formatter={v => fmt(v)}
 *     series={[
 *       { key:'income',  color:'#2dd4a0', label:'Ingresos', gradientId:'gi1' },
 *       { key:'expense', color:'#ff6b6b', label:'Gastos',   gradientId:'ge1' },
 *     ]}
 *   />
 */
export default function TrendAreaChart({
  data         = [],
  series       = [],
  xKey         = 'label',
  height       = 200,
  formatter,
  labelFormatter,
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
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart
        data={data}
        margin={{ top:4, right:4, bottom:0, left:0 }}
      >
        {/* ── GRADIENTES SVG (uno por serie) ── */}
        {/*
          Los gradientes van de color sólido (5% opacidad 25%)
          a transparente (95% opacidad 0%). Esto crea el efecto
          "fade to bottom" característico de las gráficas de área.
        */}
        <defs>
          {series.map(s => (
            <linearGradient
              key={s.gradientId}
              id={s.gradientId}
              x1="0" y1="0" x2="0" y2="1"
            >
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>

        {/* ── GRILLA DE FONDO ── */}
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#1a2030"
          vertical={false}  // solo líneas horizontales para limpieza visual
        />

        {/* ── EJES ── */}
        <XAxis
          dataKey={xKey}
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

        {/* ── TOOLTIP ── */}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={formatter}
          labelFormatter={labelFormatter}
          cursor={{ stroke:'var(--border)', strokeWidth:1 }}
        />

        {/* ── ÁREAS (una por serie) ── */}
        {series.map(s => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label || s.key}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#${s.gradientId})`}   // referencia al gradiente SVG
            dot={false}                        // sin puntos — línea limpia
            activeDot={{ r:4, fill:s.color }}  // punto al hacer hover
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  )
}