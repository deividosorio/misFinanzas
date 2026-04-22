// src/pages/Dashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Página de resumen financiero principal.
//
// CONTIENE:
//   Dashboard     → Componente principal de la página
//   TxList        → Lista de transacciones (exportada para usar en Transactions.jsx)
//
// SECCIONES DEL DASHBOARD:
//   1. Grid de 4 KPIs: Ingresos / Gastos / Ahorros / Balance del período
//   2. Banner de Patrimonio Neto (activos - pasivos)
//   3. Gráfica de torta (gastos por categoría)
//   4. Gráfica de área (tendencia 8 meses)
//   5. Consolidado de cuentas bancarias (clickeables para filtrar)
//   6. Utilización de tarjetas de crédito
//   7. Resumen de deudas (mini, con link a la página completa)
//   8. Movimientos recientes (últimas 6 transacciones del período)
//
// INTERACTIVIDAD:
//   - Clic en cuenta → filtra todo el dashboard por esa cuenta
//   - Clic en tarjeta → filtra por esa tarjeta
//   - Botón “+” → abre modal de nueva transacción
//   - “Ver todo →” → navega a la página de Deudas
// ─────────────────────────────────────────────────────────────────────────────
import { useApp } from '../context/AppContext'
import { Card, KPICard, ProgressBar, Btn, Empty } from '../components/ui/index'
import {
    PieChart, Pie, Cell,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { fmt, pct, moLabel, CAT_COLORS } from '../lib/constants'

// Estilo compartido para todos los tooltips de Recharts
const TOOLTIP_STYLE = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
}

// ── DASHBOARD (componente principal) ─────────────────────────────────────────
export default function Dashboard() {
    const {
        t,
        summary, accounts, cards, netWorth, debts,
        selAcc, setSelAcc,
        selPm, setSelPm,
        setTab, openModal,
        filteredTxns,
    } = useApp()

    const s = summary

    // Preparar datos de tendencia: convertir YYYY-MM → etiqueta corta para eje X
    const trendData = s?.monthly_trend?.map(d => ({
        ...d,
        label: moLabel(d.month),
    })) || []

    return (
        <div className="flex-col gap-14">


            {/* ── 1. GRID DE KPIS ─── */}
            {/* Muestra los 4 números clave del período seleccionado */}
            <div className="g4">
                <KPICard
                    label={t.totalIncome}
                    value={fmt(s?.income)}
                    color="var(--green)"
                    icon="↑"
                />
                <KPICard
                    label={t.totalExpenses}
                    value={fmt(s?.expense)}
                    color="var(--red)"
                    icon="↓"
                />
                <KPICard
                    label={t.savings}
                    value={fmt(s?.saving)}
                    color="var(--purple)"
                    icon="◎"
                />
                <KPICard
                    label={t.balance}
                    value={fmt(s?.balance)}
                    color={(s?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)'}
                    icon="≡"
                    // Tasa de ahorro como subtexto: saving / income * 100
                    sub={s?.income > 0
                        ? `${((s.saving / s.income) * 100).toFixed(1)}% ${t.savingsRate}`
                        : null
                    }
                />
            </div>

            {/* ── 2. BANNER DE PATRIMONIO NETO ─── */}
            {/* Activos (cuentas) - Pasivos (deudas) = Patrimonio */}
            {netWorth && (
                <Card style={{
                    background: 'linear-gradient(135deg,#0c1020,#111828)',
                    border: '1px solid #1e2a44',
                    padding: '18px 22px',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        <div>
                            <div className="lbl">{t.netWorth}</div>
                            <div
                                className="mono"
                                style={{
                                    fontSize: 30,
                                    marginTop: 4,
                                    color: netWorth.net >= 0 ? 'var(--green)' : 'var(--red)',
                                }}
                            >
                                {/* Patrimonio negativo se muestra entre paréntesis (convención contable) */}
                                {netWorth.net < 0
                                    ? `(${fmt(Math.abs(netWorth.net))})`
                                    : fmt(netWorth.net)
                                }
                            </div>
                        </div>
                        {/* Desglose activos / pasivos */}
                        <div style={{ display: 'flex', gap: 20 }}>
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.assets}</div>
                                <div className="mono" style={{ color: 'var(--green)', fontSize: 16 }}>
                                    {fmt(netWorth.assets)}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.liabilities}</div>
                                <div className="mono" style={{ color: 'var(--red)', fontSize: 16 }}>
                                    {fmt(netWorth.liabilities)}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* ── 3 + 4. GRÁFICAS: TORTA + TENDENCIA ─── */}
            <div className="g2">
                {/* Gráfica de torta: distribución de gastos por categoría */}
                <Card>
                    <div className="lbl" style={{ marginBottom: 10 }}>{t.byCategory}</div>
                    {(s?.by_category?.length > 0) ? (
                        <>
                            <ResponsiveContainer width="100%" height={170}>
                                <PieChart>
                                    <Pie
                                        data={s.by_category}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={42}   // Donut chart (con agujero central)
                                        outerRadius={70}
                                        paddingAngle={2}
                                    >
                                        {s.by_category.map(entry => (
                                            <Cell
                                                key={entry.category}
                                                fill={CAT_COLORS[entry.category] || '#4f7cff'}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={v => fmt(v)}
                                        contentStyle={TOOLTIP_STYLE}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Leyenda manual (las primeras 6 categorías) */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {s.by_category.slice(0, 6).map(d => (
                                    <span
                                        key={d.category}
                                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted)' }}
                                    >
                                        <span style={{
                                            display: 'inline-block',
                                            width: 6, height: 6,
                                            borderRadius: 2,
                                            background: CAT_COLORS[d.category] || '#4f7cff',
                                        }} />
                                        {t.cats[d.category] || d.category}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Empty icon="📊" message={t.noData} />
                    )}
                </Card>

                {/* Gráfica de área: ingresos vs gastos por mes */}
                <Card>
                    <div className="lbl" style={{ marginBottom: 10 }}>Tendencia mensual</div>
                    <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={trendData}>
                            {/* Gradientes para el relleno de las áreas */}
                            <defs>
                                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2dd4a0" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#2dd4a0" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.20} />
                                    <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
                            <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 9 }} />
                            <YAxis tick={{ fill: 'var(--muted)', fontSize: 9 }} />
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                formatter={(v, name) => [
                                    fmt(v),
                                    name === 'income' ? t.income :
                                        name === 'expense' ? t.expense : t.saving,
                                ]}
                            />
                            <Area type="monotone" dataKey="income" stroke="#2dd4a0" fill="url(#gradIncome)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" stroke="#ff6b6b" fill="url(#gradExpense)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* ── 5 + 6 + 7. CONSOLIDADO DE CUENTAS Y TARJETAS ─── */}
            <Card>
                {/* ── Cuentas bancarias ── */}
                <div style={{ marginBottom: 16 }}>
                    <div className="lbl" style={{ marginBottom: 10 }}>Cuentas bancarias</div>
                    {accounts.map(a => (
                        // Clic en una cuenta la selecciona como filtro activo
                        <div
                            key={a.id}
                            onClick={() => setSelAcc(selAcc === a.id ? null : a.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 6,
                                border: `1px solid ${selAcc === a.id ? a.color + '44' : 'var(--border)'}`,
                                background: selAcc === a.id ? a.color + '10' : 'var(--bg)',
                                cursor: 'pointer',
                                transition: 'all .15s',
                            }}
                        >
                            {/* Indicador de color de la cuenta */}
                            <div style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: a.color,
                                flexShrink: 0,
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: a.color }}>
                                    {a.name}
                                    <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}>
                                        {' '}({a.owner_name})
                                    </span>
                                </div>
                                {/* Mini resumen de movimientos en esta cuenta */}
                                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                    <span style={{ fontSize: 10, color: 'var(--green)' }}>↑ {fmt(a.total_income)}</span>
                                    <span style={{ fontSize: 10, color: 'var(--red)' }}>↓ {fmt(a.total_expense)}</span>
                                </div>
                            </div>
                            {/* Saldo actual de la cuenta */}
                            <div
                                className="mono"
                                style={{ fontSize: 15, color: (a.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}
                            >
                                {fmt(a.balance)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tarjetas de crédito (solo las que tienen límite) ── */}
                {cards.filter(c => c.credit_limit).length > 0 && (
                    <>
                        <div className="sep" />
                        <div className="lbl" style={{ marginBottom: 10 }}>Tarjetas de crédito</div>
                        <div className="g2">
                            {cards.filter(c => c.credit_limit).map(c => {
                                const utilization = pct(c.month_spent, c.credit_limit)
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelPm(selPm === c.id ? null : c.id)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            border: `1px solid ${selPm === c.id ? c.color + '44' : 'var(--border)'}`,
                                            background: selPm === c.id ? c.color + '10' : 'var(--bg)',
                                            transition: 'all .15s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: c.color, fontSize: 12 }}>
                                                    💳 {c.name}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>···{c.last_four}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="mono" style={{ color: 'var(--red)', fontSize: 13 }}>
                                                    {fmt(c.month_spent)}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                                    de {fmt(c.credit_limit)}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Barra de utilización — rojo cuando supera 80% */}
                                        <ProgressBar value={c.month_spent} max={c.credit_limit} height={5} />
                                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
                                            {utilization}% utilizado este mes
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}

                {/* ── Resumen mini de deudas ── */}
                {debts.length > 0 && (
                    <>
                        <div className="sep" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div className="lbl">{t.debts}</div>
                            <Btn size="xs" variant="ghost" onClick={() => setTab('debts')}>
                                Ver todo →
                            </Btn>
                        </div>
                        {debts.slice(0, 2).map(d => {
                            const paid = d.paid_amount ?? d.paid ?? 0
                            const total = d.total_amount ?? d.totalDebt ?? 0
                            return (
                                <div key={d.id} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</span>
                                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                            {pct(paid, total)}% · {fmt(total - paid)} rest.
                                        </span>
                                    </div>
                                    <ProgressBar value={paid} max={total} />
                                </div>
                            )
                        })}
                    </>
                )}
            </Card>

            {/* ── 8. MOVIMIENTOS RECIENTES ─── */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div className="h3">Movimientos recientes</div>
                    <Btn size="sm" variant="primary" onClick={() => openModal('tx')}>
                        + {t.addTransaction}
                    </Btn>
                </div>
                {/* Mostrar las últimas 6 transacciones del período activo */}
                <TxList txns={filteredTxns.slice(0, 6)} />
            </Card>
        </div>

    )
}

// ── TxList — Lista de transacciones ───────────────────────────────────────────
/**

- Componente reutilizable que muestra una lista de transacciones.
- Exportado para ser usado también en Transactions.jsx.
- 
- Muestra para cada transacción:
- - Ícono de tipo (↑ ingreso / ↓ gasto / ◎ ahorro)
- - Descripción + categoría + cuenta + tarjeta + fecha
- - Monto con color semántico
- - Botón de eliminar (✕)
- 
- @param {Array} txns - Array de transacciones a mostrar
  */
export function TxList({ txns }) {
    const { t, getAccount, getCard, deleteTxn } = useApp()

    if (!txns?.length) {
        return <Empty icon="📭" message={t.noData} />
    }

    return (
        <div>
            {txns.map((tx, i) => {
                // Buscar la cuenta y tarjeta asociadas para mostrar sus nombres/colores
                const account = getAccount(tx.account_id)
                const card = tx.payment_id ? getCard(tx.payment_id) : null

                // Color del monto según tipo de transacción
                const amountColor = {
                    income: 'var(--green)',
                    expense: 'var(--red)',
                    saving: 'var(--purple)',
                }[tx.type] || 'var(--text)'

                return (
                    <div
                        key={tx.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 11,
                            padding: '11px 0',
                            borderBottom: i < txns.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                    >
                        {/* Ícono de tipo */}
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 'var(--radius-sm)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            background: tx.type === 'income' ? '#2dd4a012' :
                                tx.type === 'expense' ? '#ff6b6b12' : '#a78bfa12',
                        }}>
                            {tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '◎'}
                        </div>

                        {/* Descripción y metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: 13,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {tx.description}
                            </div>
                            <div style={{ display: 'flex', gap: 5, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* Badge de tipo */}
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: amountColor,
                                    background: amountColor + '14',
                                    borderRadius: 4,
                                    padding: '1px 6px',
                                }}>
                                    {t[tx.type]}
                                </span>
                                {/* Categoría */}
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    {t.cats[tx.category] || tx.category}
                                </span>
                                {/* Cuenta */}
                                {account && (
                                    <span style={{ fontSize: 10, color: account.color }}>
                                        ⬤ {account.name}
                                    </span>
                                )}
                                {/* Tarjeta */}
                                {card && (
                                    <span style={{ fontSize: 10, color: card.color }}>
                                        💳 {card.name}
                                    </span>
                                )}
                                {/* Fecha */}
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>{tx.date}</span>
                            </div>
                        </div>

                        {/* Monto */}
                        <div
                            className="mono"
                            style={{ color: amountColor, fontSize: 13, marginRight: 6 }}
                        >
                            {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                        </div>

                        {/* Botón eliminar */}
                        <button
                            onClick={() => deleteTxn(tx.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--muted)',
                                fontSize: 14,
                                padding: 4,
                                borderRadius: 4,
                                transition: 'color .15s',
                            }}
                            onMouseEnter={e => e.target.style.color = 'var(--red)'}
                            onMouseLeave={e => e.target.style.color = 'var(--muted)'}
                            title="Eliminar transacción"
                        >
                            ✕
                        </button>
                    </div>
                )
            })}
        </div>

    )
}