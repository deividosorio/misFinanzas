// src/lib/demoData.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Datos de demostración realistas para modo sin Supabase.
//
// Estos datos se usan cuando la app corre en MODO DEMO (sin .env.local).
// Representan una familia típica de la comunidad latina en Québec:
//   - Dos adultos con ingresos
//   - Dos hijos con metas de ahorro
//   - Hipoteca, auto financiado
//   - Tarjetas TD Visa y RBC Mastercard
//   - Pagos recurrentes: Hydro-Québec, Bell, etc.
//
// Separar los datos demo en su propio archivo mantiene AppContext.jsx limpio
// y hace evidente qué es datos reales vs. datos de ejemplo.
// ─────────────────────────────────────────────────────────────────────────────

// Perfil del usuario principal (el propietario de la familia)
export const DEMO_PROFILE = {
    id: 'demo-user-1',
    display_name: 'Deivid',
    family_id: 'demo-fam-1',
    role: 'owner',       // owner | admin | member | kid
    is_kid: false,
    avatar_emoji: '👨',
    avatar_color: '#4f7cff',
    lang: 'es',
    onboarded: true,
}

// Familia demo
export const DEMO_FAMILY = {
    id: 'demo-fam-1',
    name: 'Familia García',
    plan: 'pro',           // free | pro | family
    invite_code: 'garcia2025',
    currency: 'CAD',
    locale: 'es',
}

// Miembros de la familia
export const DEMO_MEMBERS = [
    {
        id: 'demo-user-1',
        display_name: 'Deivid',
        role: 'owner',
        is_kid: false,
        avatar_emoji: '👨',
        avatar_color: '#4f7cff',
    },
    {
        id: 'demo-user-2',
        display_name: 'Martha',
        role: 'member',
        is_kid: false,
        avatar_emoji: '👩',
        avatar_color: '#e879f9',
    },
    {
        id: 'demo-user-3',
        display_name: 'Mateo',
        role: 'member',
        is_kid: true,          // Es niño → verá la vista Kids
        avatar_emoji: '👦',
        avatar_color: '#2dd4a0',
    },
    {
        id: 'demo-user-4',
        display_name: 'Valeria',
        role: 'member',
        is_kid: true,
        avatar_emoji: '👧',
        avatar_color: '#fbbf24',
    },
]

// Cuentas bancarias de la familia
// balance = opening_balance + ingresos - gastos - ahorros calculados en RPC
// En modo demo, se muestran los saldos directamente.
export const DEMO_ACCOUNTS = [
    {
        id: 'acc-1',
        name: 'TD Savings',
        type: 'savings',
        color: '#4f7cff',
        owner_name: 'Deivid',
        institution: 'TD Bank',
        balance: 14200,         // Saldo actual
        total_income: 32400,         // Total ingresos históricos en esta cuenta
        total_expense: 18200,         // Total egresos históricos en esta cuenta
    },
    {
        id: 'acc-2',
        name: 'RBC Savings',
        type: 'savings',
        color: '#e879f9',
        owner_name: 'Martha',
        institution: 'RBC',
        balance: 8750,
        total_income: 21000,
        total_expense: 12250,
    },
    {
        id: 'acc-3',
        name: 'TD Chequing',
        type: 'checking',
        color: '#2dd4a0',
        owner_name: 'Familia',
        institution: 'TD Bank',
        balance: 3820,
        total_income: 9000,
        total_expense: 5180,
    },
]

// Tarjetas de crédito y formas de pago
// month_spent: gasto acumulado en el mes actual (calculado en RPC real)
export const DEMO_CARDS = [
    {
        id: 'pm-1',
        name: 'TD Visa',
        type: 'credit_card',
        last_four: '4521',
        color: '#ff6b6b',
        credit_limit: 8000,          // Límite de la tarjeta
        month_spent: 2340,          // Gastado en el mes actual
    },
    {
        id: 'pm-2',
        name: 'RBC Mastercard',
        type: 'credit_card',
        last_four: '8833',
        color: '#fbbf24',
        credit_limit: 5000,
        month_spent: 890,
    },
]

// Deudas activas de la familia
export const DEMO_DEBTS = [
    {
        id: 'd-1',
        name: 'Hipoteca TD',
        total_amount: 320000,      // Precio original de la hipoteca
        paid_amount: 52000,       // Capital pagado hasta hoy
        monthly_payment: 1850,        // Cuota mensual (capital + interés)
        interest_rate: 4.5,         // Tasa de interés anual (%)
        start_date: '2020-01-01',
    },
    {
        id: 'd-2',
        name: 'Auto Honda CR-V',
        total_amount: 28000,
        paid_amount: 14000,
        monthly_payment: 520,
        interest_rate: 5.9,
        start_date: '2022-06-01',
    },
]

// Pagos recurrentes configurados
// next_due: fecha del próximo pago
export const DEMO_RECURRING = [
    { id: 'r-1', name: 'Hipoteca TD', amount: 1850, frequency: 'monthly', category: 'mortgage', next_due: '2025-06-01' },
    { id: 'r-2', name: 'Auto Honda CR-V', amount: 520, frequency: 'monthly', category: 'car', next_due: '2025-06-05' },
    { id: 'r-3', name: 'Hydro-Québec', amount: 110, frequency: 'monthly', category: 'utilities', next_due: '2025-06-10' },
    { id: 'r-4', name: 'Bell Internet', amount: 85, frequency: 'monthly', category: 'utilities', next_due: '2025-06-15' },
    { id: 'r-5', name: 'Seguro auto', amount: 180, frequency: 'monthly', category: 'insurance', next_due: '2025-06-20' },
]

// Historial de transacciones (los más recientes primero)
export const DEMO_TXNS = [
    { id: 't-1', type: 'income', category: 'salary', description: 'Salario Mayo — Deivid', amount: 5200, date: '2025-05-01', account_id: 'acc-1', owner_name: 'Deivid' },
    { id: 't-2', type: 'income', category: 'salary', description: 'Salario Mayo — Martha', amount: 4200, date: '2025-05-01', account_id: 'acc-2', owner_name: 'Martha' },
    { id: 't-3', type: 'expense', category: 'food', description: 'IGA Supermercado', amount: 320, date: '2025-05-03', payment_id: 'pm-1', account_id: 'acc-3', owner_name: 'Martha' },
    { id: 't-4', type: 'expense', category: 'utilities', description: 'Hydro-Québec', amount: 110, date: '2025-05-05', payment_id: 'pm-2', account_id: 'acc-3', owner_name: 'Deivid' },
    { id: 't-5', type: 'expense', category: 'transport', description: 'Gasolina Shell', amount: 95, date: '2025-05-07', payment_id: 'pm-1', account_id: 'acc-1', owner_name: 'Deivid' },
    { id: 't-6', type: 'saving', category: 'vacation', description: 'Fondo vacaciones verano', amount: 400, date: '2025-05-08', account_id: 'acc-2', owner_name: 'Martha' },
    { id: 't-7', type: 'income', category: 'freelance', description: 'Proyecto web cliente', amount: 1200, date: '2025-05-10', account_id: 'acc-1', owner_name: 'Deivid' },
    { id: 't-8', type: 'expense', category: 'entertainment', description: 'Netflix + Spotify', amount: 35, date: '2025-05-12', payment_id: 'pm-1', account_id: 'acc-1', owner_name: 'Deivid' },
    { id: 't-9', type: 'expense', category: 'food', description: 'Costco', amount: 380, date: '2025-04-20', payment_id: 'pm-1', account_id: 'acc-3', owner_name: 'Familia' },
    { id: 't-10', type: 'income', category: 'salary', description: 'Salario Abril — Deivid', amount: 5200, date: '2025-04-01', account_id: 'acc-1', owner_name: 'Deivid' },
]

// Metas de ahorro de adultos
export const DEMO_GOALS = [
    { id: 'g-1', name: 'Vacaciones 2025', target: 3000, current: 700, emoji: '✈️', color: '#4f7cff' },
    { id: 'g-2', name: 'Fondo emergencias', target: 5000, current: 1800, emoji: '🛡️', color: '#2dd4a0' },
    { id: 'g-3', name: 'Laptop nueva', target: 1500, current: 450, emoji: '💻', color: '#a78bfa' },
]

// Metas de ahorro de los niños (módulo Kids)
export const DEMO_KIDS_GOALS = [
    {
        id: 'kg-1',
        kid_profile: 'demo-user-3', // Mateo
        kid_name: 'Mateo',
        name: 'Nintendo Switch',
        emoji: '🎮',
        color: '#818cf8',
        target_amount: 350,
        current_amount: 210,
        status: 'active',
        reward_text: '¡Vamos campeón! Ya vas por el 60% 💪',
    },
    {
        id: 'kg-2',
        kid_profile: 'demo-user-3', // Mateo
        kid_name: 'Mateo',
        name: 'Colección Pokémon',
        emoji: '⭐',
        color: '#fbbf24',
        target_amount: 120,
        current_amount: 45,
        status: 'active',
        reward_text: '¡Sigue ahorrando!',
    },
    {
        id: 'kg-3',
        kid_profile: 'demo-user-4', // Valeria
        kid_name: 'Valeria',
        name: 'Bicicleta nueva',
        emoji: '🚲',
        color: '#2dd4a0',
        target_amount: 280,
        current_amount: 280,
        status: 'completed', // ¡Ya la alcanzó!
        reward_text: '¡Lo lograste! 🎉',
    },
]

// Resumen del dashboard (normalmente calculado por rpc_dashboard_summary)
export const DEMO_SUMMARY = {
    income: 12400,  // Total ingresos del período
    expense: 7820,  // Total gastos del período
    saving: 1200,  // Total ahorros del período
    balance: 3380,  // income - expense - saving

    // Gastos desglosados por categoría (para la gráfica de torta)
    by_category: [
        { category: 'housing', value: 1800 },
        { category: 'food', value: 1240 },
        { category: 'mortgage', value: 1850 },
        { category: 'car', value: 520 },
        { category: 'utilities', value: 310 },
        { category: 'entertainment', value: 290 },
        { category: 'transport', value: 280 },
        { category: 'health', value: 120 },
        { category: 'insurance', value: 180 },
    ],

    // Tendencia mensual (últimos 8 meses) para gráficas de área y barras
    monthly_trend: [
        { month: '2024-10', income: 9800, expense: 5200, saving: 900 },
        { month: '2024-11', income: 10200, expense: 5800, saving: 1000 },
        { month: '2024-12', income: 14200, expense: 8200, saving: 1400 }, // diciembre más alto
        { month: '2025-01', income: 9600, expense: 4900, saving: 1100 },
        { month: '2025-02', income: 10400, expense: 5100, saving: 1200 },
        { month: '2025-03', income: 10780, expense: 4745, saving: 1100 },
        { month: '2025-04', income: 11600, expense: 7300, saving: 1050 },
        { month: '2025-05', income: 12400, expense: 7820, saving: 1200 },
    ],
}

// Patrimonio neto (calculado por rpc_net_worth en producción)
export const DEMO_NET_WORTH = {
    assets: 26770,   // Suma de todos los saldos positivos de cuentas
    liabilities: 282000,  // Suma de todas las deudas restantes
    net: -255230, // assets - liabilities (negativo es normal con hipoteca reciente)
}