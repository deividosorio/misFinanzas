// src/components/charts/index.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barrel export para todos los componentes de gráficas.
//
// VENTAJA: Un solo import para acceder a todas las gráficas.
//
// USO:
//   import { TrendAreaChart, CategoryPieChart, MonthlyBarChart } from '../components/charts'
//
// CONTENIDO:
//   TrendAreaChart      → Área con gradiente para tendencias temporales (AreaChart.jsx)
//   CategoryPieChart    → Donut para distribución por categorías (PieChart.jsx)
//   MonthlyBarChart     → Barras verticales agrupadas por mes (BarChart.jsx)
//   HorizontalBarChart  → Barras horizontales por categoría (BarChart.jsx)
//   SavingsRateBar      → Mini barras de tasa de ahorro (TrendMiniBar.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// Gráfica de área — tendencia temporal
export { default as TrendAreaChart } from './AreaChart'

// Gráfica de dona — distribución por categoría
export { default as CategoryPieChart } from './PieChart'

// Gráficas de barras — vertical y horizontal
export { MonthlyBarChart, HorizontalBarChart } from './BarChart'

// Mini barra de tasa de ahorro — HTML puro (sin Recharts)
export { default as SavingsRateBar } from './TrendMiniBar'