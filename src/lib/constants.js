// src/lib/constants.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Constantes compartidas y funciones utilitarias puras.
//
// “Pura” = sin efectos secundarios, sin estado, sin imports de React.
// Este archivo puede importarse desde CUALQUIER parte del proyecto.
//
// CONTIENE:
//   - Paleta de colores por categoría financiera (CAT_COLORS)
//   - Colores disponibles para cuentas (ACC_COLORS)
//   - Colores por plan SaaS (PLAN_COLORS)
//   - Metadatos de badges/logros del módulo Kids (BADGE_META)
//   - Listas de categorías por tipo de transacción
//   - Tipos de cuenta y formas de pago
//   - Ícono por subtipo de cuenta
//   - Funciones de formato de fecha y número
// ─────────────────────────────────────────────────────────────────────────────

// ── COLORES POR CATEGORÍA FINANCIERA ─────────────────────────────────────────
// Usado en gráficas de torta y barras para identificar cada categoría
// visualmente. Los colores son consistentes en toda la app.
export const CAT_COLORS = {
    // Ingresos — tonos verdes
    salary: '#34d399',
    freelance: '#6ee7b7',
    investment: '#a7f3d0',
    other_income: '#d1fae5',

    // Gastos — tonos cálidos
    food: '#f87171', // rojo: alimentación
    housing: '#fb923c', // naranja: vivienda
    transport: '#fbbf24', // amarillo: transporte
    health: '#e879f9', // fucsia: salud
    entertainment: '#818cf8', // índigo: entretenimiento
    education: '#38bdf8', // celeste: educación
    clothing: '#f472b6', // rosa: ropa
    utilities: '#60a5fa', // azul claro: servicios
    insurance: '#a78bfa', // lavanda: seguros
    mortgage: '#f97316', // naranja oscuro: hipoteca
    car: '#facc15', // amarillo: auto
    other_expense: '#94a3b8', // gris: otros

    // Ahorros — tonos fríos / pasteles
    emergency: '#fcd34d',
    vacation: '#67e8f9',
    retirement: '#c084fc',
    goal: '#86efac',

    // Especiales
    transfer: '#94a3b8',
    opening_balance: '#6b7494',
}

// ── PALETA PARA CUENTAS ────────────────────────────────────────────────────
// El usuario elige uno de estos colores al crear una cuenta.
// Limitados a 8 para no abrumar.
export const ACC_COLORS = [
    '#4f7cff', // azul — color por defecto
    '#2dd4a0', // verde
    '#ff6b6b', // rojo
    '#fbbf24', // amarillo
    '#e879f9', // fucsia
    '#38bdf8', // celeste
    '#fb923c', // naranja
    '#a78bfa', // lavanda
]

// ── COLORES POR PLAN SAAS ─────────────────────────────────────────────────
// Usados en badges de plan y comparación de planes.
export const PLAN_COLORS = {
    free: '#5a6180', // gris — plan gratuito
    pro: '#4f7cff', // azul — plan pro
    family: '#2dd4a0', // verde — plan familiar
    admin: '#ff6b6b', // rojo — acceso admin
}

// ── METADATOS DE BADGES (módulo Kids) ─────────────────────────────────────
// Cada badge tiene un emoji, etiqueta visible y color.
// badge_key es la clave primaria que se guarda en la tabla kids_badges.
export const BADGE_META = {
    first_goal: { emoji: '🌱', label: 'Primera meta', color: '#2dd4a0' },
    halfway: { emoji: '⚡', label: '¡A la mitad!', color: '#fbbf24' },
    goal_completed: { emoji: '🏆', label: 'Meta cumplida', color: '#ff6b6b' },
    super_saver: { emoji: '🦸', label: 'Super ahorrador', color: '#818cf8' },
    big_saver: { emoji: '💎', label: 'Gran ahorrador', color: '#38bdf8' },
}

// ── CATEGORÍAS POR TIPO DE TRANSACCIÓN ────────────────────────────────────
// Usadas en el formulario de nueva transacción para poblar el select
// de categorías según el tipo seleccionado.
export const INCOME_CATS = [
    'salary',       // Salario
    'freelance',    // Trabajo independiente
    'investment',   // Retornos de inversión
    'other_income', // Cualquier otro ingreso
]

export const EXPENSE_CATS = [
    'food',          // Supermercado, restaurantes
    'housing',       // Renta, mantenimiento
    'transport',     // Gasolina, transporte público
    'health',        // Médico, farmacia
    'entertainment', // Streaming, salidas
    'education',     // Colegio, cursos
    'clothing',      // Ropa, calzado
    'utilities',     // Electricidad, internet, teléfono
    'insurance',     // Seguros de vida, auto, hogar
    'mortgage',      // Cuota hipoteca (interés + capital)
    'car',           // Cuota auto
    'other_expense', // Cualquier otro gasto
]

export const SAVING_CATS = [
    'emergency',  // Fondo de emergencias
    'vacation',   // Ahorro para vacaciones
    'retirement', // Retiro / jubilación
    'goal',       // Meta personalizada
]

// ── TIPOS DE CUENTA BANCARIA ──────────────────────────────────────────────
export const ACCOUNT_TYPES = [
    'savings',    // Cuenta de ahorros
    'checking',   // Cuenta corriente / chequing
    'investment', // TFSA, RRSP, portafolio
    'cash',       // Efectivo físico
]

// ── TIPOS DE FORMA DE PAGO ────────────────────────────────────────────────
export const PAYMENT_TYPES = [
    'credit_card', // Tarjeta de crédito
    'debit_card',  // Tarjeta de débito
    'credit_line', // Línea de crédito / marge de crédit
    'cash',        // Efectivo
    'transfer',    // Transferencia bancaria / Interac
]

// ── ÍCONOS POR SUBTIPO ────────────────────────────────────────────────────
// Emoji representativo para cada subtipo de cuenta o deuda.
// Usado en el Balance General y listas de cuentas.
export const SUBTYPE_ICON = {
    savings: '🏦',
    checking: '🏧',
    investment: '📈',
    cash: '💵',
    mortgage: '🏠',
    car_loan: '🚗',
    credit_card: '💳',
    debit_card: '💳',
    credit_line: '💳',
    transfer: '↔',
}

// ── FUNCIONES DE FORMATO ──────────────────────────────────────────────────

/**

- fmt — Formatea un número como moneda CAD (o la especificada).
- 
- Ejemplos:
- fmt(5200)     → “$5,200”
- fmt(0)        → “$0”
- fmt(-500)     → “-$500”
- fmt(5200, 'USD') → “$5,200”  (en formato USD)
- 
- Usa Intl.NumberFormat para respetar la localización canadiense.
- maximumFractionDigits:0 elimina los centavos para mayor legibilidad.
- 
- @param {number} n - Valor a formatear
- @param {string} currency - Código ISO de moneda (default: 'CAD')
- @returns {string} Número formateado con símbolo de moneda
  */
export const fmt = (n, currency = 'CAD') =>
    new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(n || 0)

/**

- fmtSign — Igual que fmt pero para estados financieros formales.
- Los negativos se muestran entre paréntesis (convención contable).
- 
- Ejemplos:
- fmtSign(-5000)  → “($5,000)”   — pérdida / pasivo
- fmtSign(3000)   → “+$3,000”    — ganancia / activo
- fmtSign(0)      → “$0”
- 
- @param {number} n - Valor a formatear
- @returns {string} Número formateado con signo contable
  */
export const fmtSign = (n) => {
    const f = fmt(Math.abs(n || 0))
    if (n < 0) return `(${f})`
    if (n > 0) return `+${f}`
    return f
}

/**

- pct — Calcula el porcentaje de a sobre b, limitado a 100.
- Devuelve 0 si b es 0 para evitar división por cero.
- 
- Ejemplo: pct(70, 200) → 35  (35%)
- 
- @param {number} a - Valor actual
- @param {number} b - Valor máximo / objetivo
- @returns {number} Porcentaje entre 0 y 100
  */
export const pct = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0)

/**

- toDay — Devuelve la fecha actual en formato YYYY-MM-DD.
- Usado como valor por defecto en formularios de nueva transacción.
- 
- @returns {string} Fecha de hoy en formato ISO (ej: “2025-05-15”)
  */
export const toDay = () => new Date().toISOString().slice(0, 10)

/**

- thisMo — Devuelve el mes actual en formato YYYY-MM.
- Usado como valor inicial del filtro de período.
- 
- @returns {string} Mes actual (ej: “2025-05”)
  */
export const thisMo = () => new Date().toISOString().slice(0, 7)

/**

- moLabel — Convierte YYYY-MM a una etiqueta corta para gráficas.
- Ejemplo: “2025-05” → “May'25”
- 
- @param {string} m - Mes en formato YYYY-MM
- @returns {string} Etiqueta compacta para eje X de gráficas
  */
export const moLabel = (m) => {
    if (!m) return ''
    const [y, mo] = m.split('-')
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${MONTHS[+mo - 1]}'${y.slice(2)}`
}