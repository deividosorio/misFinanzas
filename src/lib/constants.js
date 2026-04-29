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

// src/lib/constants.js
// ─────────────────────────────────────────────────────────────────────────────
// MODELO UNIFICADO DE CUENTAS v4
//
// Todo instrumento financiero es una "cuenta" con un subtipo.
// El subtipo determina si es activo o pasivo y cómo afecta el saldo.
//
// ACTIVOS (el dinero que TIENES):
//   checking    → Cuenta corriente/chequing. Saldo = apertura + ingresos - gastos
//   savings     → Cuenta de ahorros. Igual que checking
//   investment  → TFSA, RRSP, portafolio. Solo crece con rendimientos
//   cash        → Efectivo físico
//
// PASIVOS (crédito que USAS):
//   credit_card → Tarjeta de crédito. Disponible = límite - deuda_mes
//   credit_line → Línea de crédito / marge de crédit. Igual que credit_card
//
// DIFERENCIA CLAVE:
//   Activos:  al gastar, el SALDO BAJA
//   Pasivos:  al gastar, la DEUDA SUBE (el disponible baja)
// ─────────────────────────────────────────────────────────────────────────────

// ── Configuración de subtipos de cuenta ──────────────────────────────────────
export const ACCOUNT_SUBTYPES = {
  // ACTIVOS — dinero disponible en la cuenta
  checking: {
    label:    'Cuenta corriente',
    labelEn:  'Checking account',
    labelFr:  'Compte courant',
    icon:     '🏧',
    nature:   'asset',
    isCredit: false,
    color:    '#4f7cff',
    examples: 'TD Chequing, RBC Everyday Chequing',
  },
  savings: {
    label:    'Cuenta de ahorros',
    labelEn:  'Savings account',
    labelFr:  'Compte épargne',
    icon:     '🏦',
    nature:   'asset',
    isCredit: false,
    color:    '#2dd4a0',
    examples: 'TD Savings, RBC High Interest Savings',
  },
  investment: {
    label:    'Inversión / TFSA / RRSP',
    labelEn:  'Investment / TFSA / RRSP',
    labelFr:  'Investissement / CELI / REER',
    icon:     '📈',
    nature:   'asset',
    isCredit: false,
    color:    '#a78bfa',
    examples: 'TFSA, RRSP, portafolio Wealthsimple',
  },
  cash: {
    label:    'Efectivo',
    labelEn:  'Cash',
    labelFr:  'Espèces',
    icon:     '💵',
    nature:   'asset',
    isCredit: false,
    color:    '#fbbf24',
    examples: 'Billetera, caja menor',
  },
  // PASIVOS — crédito disponible (se convierte en deuda al usar)
  credit_card: {
    label:    'Tarjeta de crédito',
    labelEn:  'Credit card',
    labelFr:  'Carte de crédit',
    icon:     '💳',
    nature:   'liability',
    isCredit: true,
    color:    '#ff6b6b',
    examples: 'TD Visa, RBC Mastercard, Scotiabank Visa',
  },
  credit_line: {
    label:    'Línea de crédito',
    labelEn:  'Line of credit',
    labelFr:  'Marge de crédit',
    icon:     '🏦',
    nature:   'liability',
    isCredit: true,
    color:    '#fb923c',
    examples: 'TD Line of Credit, RBC Homeline',
  },
}

// Lista de subtipos de ACTIVOS (para filtros y UI)
export const ASSET_SUBTYPES = ['checking','savings','investment','cash']

// Lista de subtipos de CRÉDITO/PASIVO (para filtros y UI)
export const CREDIT_SUBTYPES = ['credit_card','credit_line']

// Todos los subtipos en orden para el selector
export const ALL_SUBTYPES = [...ASSET_SUBTYPES, ...CREDIT_SUBTYPES]

/**
 * isCredit — Determina si un subtipo de cuenta es de crédito (pasivo).
 * Usado para aplicar la lógica correcta de saldo en transacciones.
 */
export const isCredit = (subtype) => CREDIT_SUBTYPES.includes(subtype)

/**
 * getSubtypeConfig — Obtiene la configuración de un subtipo.
 */
export const getSubtypeConfig = (subtype) =>
  ACCOUNT_SUBTYPES[subtype] || ACCOUNT_SUBTYPES.checking

// ── Colores disponibles para cuentas ─────────────────────────────────────────
export const ACC_COLORS = [
  '#4f7cff', '#2dd4a0', '#ff6b6b', '#fbbf24',
  '#e879f9', '#38bdf8', '#fb923c', '#a78bfa',
]

// ── Categorías de transacciones ───────────────────────────────────────────────
export const INCOME_CATS  = ['salary','freelance','investment','other_income']
export const EXPENSE_CATS = [
  'food','housing','transport','health','entertainment',
  'education','clothing','utilities','insurance','mortgage','car','other_expense',
]
export const SAVING_CATS  = ['emergency','vacation','retirement','goal']

// ── Colores por categoría ─────────────────────────────────────────────────────
export const CAT_COLORS = {
  salary:'#34d399', freelance:'#6ee7b7', investment:'#a7f3d0', other_income:'#d1fae5',
  food:'#f87171', housing:'#fb923c', transport:'#fbbf24', health:'#e879f9',
  entertainment:'#818cf8', education:'#38bdf8', clothing:'#f472b6',
  utilities:'#60a5fa', insurance:'#a78bfa', mortgage:'#f97316',
  car:'#facc15', other_expense:'#94a3b8',
  emergency:'#fcd34d', vacation:'#67e8f9', retirement:'#c084fc', goal:'#86efac',
  transfer:'#94a3b8',
}

export const PLAN_COLORS = {
  free:'#5a6180', pro:'#4f7cff', family:'#2dd4a0', admin:'#ff6b6b',
}

export const BADGE_META = {
  first_goal:     { emoji:'🌱', label:'Primera meta',    color:'#2dd4a0' },
  halfway:        { emoji:'⚡', label:'¡A la mitad!',    color:'#fbbf24' },
  goal_completed: { emoji:'🏆', label:'Meta cumplida',   color:'#ff6b6b' },
  super_saver:    { emoji:'🦸', label:'Super ahorrador', color:'#818cf8' },
  big_saver:      { emoji:'💎', label:'Gran ahorrador',  color:'#38bdf8' },
}

// ── Helpers de formato ────────────────────────────────────────────────────────
export const fmt = (n, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency', currency,
    maximumFractionDigits: 0,
  }).format(n || 0)

export const fmtSign = (n) => {
  const f = fmt(Math.abs(n || 0))
  return n < 0 ? `(${f})` : n > 0 ? `+${f}` : f
}

export const pct  = (a, b) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0)
export const toDay  = () => new Date().toISOString().slice(0, 10)
export const thisMo = () => new Date().toISOString().slice(0, 7)
export const moLabel = (m) => {
  if (!m) return ''
  const [y, mo] = m.split('-')
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${MONTHS[+mo - 1]}'${y.slice(2)}`
}