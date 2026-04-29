// src/pages/Statements.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Estados financieros formales basados en el modelo de doble entrada.
//
// ESTADOS QUE GENERA:
//
//   1. Balance General (Balance Sheet)
//      Ecuación fundamental: ACTIVOS = PASIVOS + PATRIMONIO
//      Muestra todos los activos (cuentas bancarias, TFSA, etc.)
//      y todos los pasivos (hipoteca, autos, tarjetas) con sus saldos actuales.
//
//   2. Estado de Resultados (Income Statement / P&L)
//      RESULTADO NETO = INGRESOS - GASTOS
//      Muestra cada categoría de ingreso y gasto con su total del período,
//      más la tasa de ahorro (saving / income × 100).
//
//   3. Flujo de Caja (Cash Flow Statement)
//      Variación de efectivo en el período:
//        Operativo  = ingresos - gastos del día a día
//        Financiero = pagos de deuda (hipoteca, auto)
//        Cambio neto = operativo + financiero
//
//   4. Tendencia de 8 meses (gráfica de área)
//      Visualmente muestra si la familia está mejorando o empeorando.
//
//   5. Exportación CRA (Canada Revenue Agency)
//      Líneas relevantes para la declaración T1 General canadiense.
//      Disclaimer: es referencia, no reemplaza a un CPA.
//
// NOTA TÉCNICA:
//   En producción, los datos vienen de las RPCs:
//     rpc_balance_sheet(date)
//     rpc_income_statement(from, to)
//     rpc_cash_flow(from, to)
//   En modo demo, se calculan aproximaciones desde los datos de demoData.js.
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Statements.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v4:
//   - netWorth ahora tiene: assets, credit_debt, long_debt, liabilities, net
//   - Balance General distingue activos vs pasivos de crédito vs pasivos largo
//   - Saldo de cada cuenta usa account_balances view (balance / month_debt / available)
//   - Sin referencias a bankAccounts / cards — usa assetAccounts / creditAccounts
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import TrendAreaChart from '../components/charts/AreaChart'
import CategoryPieChart from '../components/charts/PieChart'
import { MonthlyBarChart, HorizontalBarChart } from '../components/charts/BarChart'
import SavingsRateBar from '../components/charts/TrendMiniBar'
import { fmt, fmtSign, pct, moLabel, ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../lib/constants'

const TABS = [
    { id: 'balance', label: '⚖️ Balance General' },
    { id: 'income', label: '📊 Estado de Resultados' },
    { id: 'cashflow', label: '💧 Flujo de Caja' },
    { id: 'trend', label: '📈 Tendencia' },
]

export default function Statements() {
    const {
        t, summary, netWorth,
        assetAccounts, creditAccounts,
        debts, txns, filteredTxns,
    } = useApp()

    const [activeTab, setActiveTab] = useState('balance')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionHeader title="Estados Financieros" />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        background: activeTab === tab.id ? 'var(--border)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                        border: 'none', borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                        padding: '8px 14px', cursor: 'pointer',
                        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, transition: 'all .15s',
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'balance' && <BalanceSheet netWorth={netWorth} assetAccounts={assetAccounts} creditAccounts={creditAccounts} debts={debts} t={t} />}
            {activeTab === 'income' && <IncomeStatement summary={summary} filteredTxns={filteredTxns} t={t} />}
            {activeTab === 'cashflow' && <CashFlow filteredTxns={filteredTxns} t={t} />}
            {activeTab === 'trend' && <TrendSection summary={summary} t={t} />}
        </div>
    )
}

// ── Balance General ───────────────────────────────────────────────────────────
// v4: separa activos / pasivos crédito / pasivos largo plazo
function BalanceSheet({ netWorth, assetAccounts, creditAccounts, debts, t }) {
    if (!netWorth) return <Empty icon="⚖️" message="Sin datos" />

    const totalAssets = netWorth.assets || 0
    const creditDebt = netWorth.credit_debt || 0
    const longDebt = netWorth.long_debt || 0
    const totalLiabs = netWorth.liabilities || 0
    const net = netWorth.net || 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Patrimonio neto destacado */}
            <Card style={{ background: 'linear-gradient(135deg,#0c1020,#111828)', border: '1px solid #1e2a44' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div className="lbl">{t.netWorth}</div>
                        <div className="mono" style={{ fontSize: 32, color: net >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
                            {fmtSign(net)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div className="lbl">{t.assets}</div>
                            <div className="mono" style={{ color: 'var(--green)', fontSize: 18 }}>{fmt(totalAssets)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="lbl">{t.liabilities}</div>
                            <div className="mono" style={{ color: 'var(--red)', fontSize: 18 }}>{fmt(totalLiabs)}</div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="g2">
                {/* ACTIVOS */}
                <Card>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                        color: 'var(--green)', marginBottom: 12
                    }}>
                        ACTIVOS
                    </div>
                    {assetAccounts.length === 0 ? (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sin cuentas de activo</div>
                    ) : (
                        assetAccounts.map(a => {
                            const cfg = ACCOUNT_SUBTYPES[a.subtype]
                            return (
                                <div key={a.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>{cfg?.icon}</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 500 }}>{a.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                                {cfg?.label}{a.owner_name && ` · ${a.owner_name}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mono" style={{
                                        fontSize: 13,
                                        color: (a.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                                    }}>
                                        {fmt(a.balance || 0)}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', marginTop: 10,
                        paddingTop: 10, borderTop: '2px solid var(--border)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Total activos</div>
                        <div className="mono" style={{ color: 'var(--green)', fontSize: 14 }}>{fmt(totalAssets)}</div>
                    </div>
                </Card>

                {/* PASIVOS */}
                <Card>
                    <div style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                        color: 'var(--red)', marginBottom: 12
                    }}>
                        PASIVOS
                    </div>

                    {/* Tarjetas de crédito */}
                    {creditAccounts.length > 0 && (
                        <>
                            <div style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6
                            }}>
                                Deuda tarjetas (mes actual)
                            </div>
                            {creditAccounts.map(a => (
                                <div key={a.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>💳</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 500 }}>
                                                {a.name}{a.last_four && ` ···${a.last_four}`}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                                Disponible: {fmt(a.available || 0)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mono" style={{ fontSize: 13, color: 'var(--orange)' }}>
                                        {fmt(a.month_debt || 0)}
                                    </div>
                                </div>
                            ))}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '6px 0', fontSize: 12, color: 'var(--muted)'
                            }}>
                                <span>Subtotal crédito</span>
                                <span className="mono" style={{ color: 'var(--orange)' }}>{fmt(creditDebt)}</span>
                            </div>
                        </>
                    )}

                    {/* Deudas de largo plazo */}
                    {debts.filter(d => d.is_active).length > 0 && (
                        <>
                            <div style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                                textTransform: 'uppercase', letterSpacing: 0.5, margin: '10px 0 6px'
                            }}>
                                Préstamos largo plazo
                            </div>
                            {debts.filter(d => d.is_active).map(d => {
                                const rem = d.total_amount - d.paid_amount
                                const p = pct(d.paid_amount, d.total_amount)
                                return (
                                    <div key={d.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px 0', borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</div>
                                            <div style={{ marginTop: 3 }}>
                                                <ProgressBar value={d.paid_amount} max={d.total_amount} height={3}
                                                    color={p > 70 ? 'var(--green)' : p > 40 ? 'var(--blue)' : 'var(--yellow)'} />
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{p}% pagado</div>
                                        </div>
                                        <div className="mono" style={{ fontSize: 13, color: 'var(--red)' }}>{fmt(rem)}</div>
                                    </div>
                                )
                            })}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '6px 0', fontSize: 12, color: 'var(--muted)'
                            }}>
                                <span>Subtotal préstamos</span>
                                <span className="mono" style={{ color: 'var(--red)' }}>{fmt(longDebt)}</span>
                            </div>
                        </>
                    )}

                    <div style={{
                        display: 'flex', justifyContent: 'space-between', marginTop: 10,
                        paddingTop: 10, borderTop: '2px solid var(--border)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Total pasivos</div>
                        <div className="mono" style={{ color: 'var(--red)', fontSize: 14 }}>{fmt(totalLiabs)}</div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

// ── Estado de Resultados ──────────────────────────────────────────────────────
function IncomeStatement({ summary, filteredTxns, t }) {
    const income = summary?.income || 0
    const expense = summary?.expense || 0
    const saving = summary?.saving || 0
    const net = income - expense - saving

    // Gastos por categoría
    const byCategory = useMemo(() => {
        const map = {}
        filteredTxns.filter(tx => tx.type === 'expense' && !tx.is_void).forEach(tx => {
            map[tx.category] = (map[tx.category] || 0) + tx.amount
        })
        return Object.entries(map)
            .map(([category, value]) => ({ category, value }))
            .sort((a, b) => b.value - a.value)
    }, [filteredTxns])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g4">
                {[
                    { label: t.totalIncome, value: fmt(income), color: 'var(--green)' },
                    { label: t.totalExpense, value: fmt(expense), color: 'var(--red)' },
                    { label: t.totalSaving, value: fmt(saving), color: 'var(--purple)' },
                    { label: t.netBalance, value: fmtSign(net), color: net >= 0 ? 'var(--green)' : 'var(--red)' },
                ].map(m => (
                    <div key={m.label} style={{
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', padding: '14px 16px',
                    }}>
                        <div className="lbl">{m.label}</div>
                        <div className="mono" style={{ fontSize: 18, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                ))}
            </div>

            {income > 0 && (
                <Card>
                    <div className="h3" style={{ marginBottom: 4 }}>Tasa de ahorro</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div className="mono" style={{ fontSize: 24, color: 'var(--purple)' }}>
                            {summary?.savings_rate || 0}%
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            del ingreso destinado a ahorro
                        </div>
                    </div>
                    <ProgressBar value={saving} max={income} height={8} color="var(--purple)" />
                </Card>
            )}

            {byCategory.length > 0 && (
                <div className="g2">
                    <Card>
                        <div className="h3" style={{ marginBottom: 12 }}>Gastos por categoría</div>
                        <CategoryPieChart
                            data={byCategory}
                            height={200}
                            formatter={v => [fmt(v), '']}
                            labelMap={t.cats}
                        />
                    </Card>
                    <Card>
                        <div className="h3" style={{ marginBottom: 12 }}>Distribución</div>
                        <HorizontalBarChart
                            data={byCategory}
                            formatter={v => [fmt(v), '']}
                            labelMap={t.cats}
                            height={220}
                        />
                    </Card>
                </div>
            )}
        </div>
    )
}

// ── Flujo de Caja ─────────────────────────────────────────────────────────────
function CashFlow({ filteredTxns, t }) {
    const cashFlowByDay = useMemo(() => {
        const map = {}
        filteredTxns.filter(tx => !tx.is_void).forEach(tx => {
            if (!map[tx.date]) map[tx.date] = { date: tx.date, income: 0, expense: 0, saving: 0, net: 0 }
            map[tx.date][tx.type] = (map[tx.date][tx.type] || 0) + tx.amount
            map[tx.date].net = map[tx.date].income - map[tx.date].expense - map[tx.date].saving
        })
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    }, [filteredTxns])

    const totalIn = filteredTxns.filter(tx => tx.type === 'income' && !tx.is_void).reduce((s, tx) => s + tx.amount, 0)
    const totalOut = filteredTxns.filter(tx => tx.type === 'expense' && !tx.is_void).reduce((s, tx) => s + tx.amount, 0)
    const totalSav = filteredTxns.filter(tx => tx.type === 'saving' && !tx.is_void).reduce((s, tx) => s + tx.amount, 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="g3">
                {[
                    { label: 'Entradas (ingresos)', value: fmt(totalIn), color: 'var(--green)' },
                    { label: 'Salidas (gastos)', value: fmt(totalOut), color: 'var(--red)' },
                    { label: 'Flujo neto', value: fmtSign(totalIn - totalOut - totalSav), color: (totalIn - totalOut - totalSav) >= 0 ? 'var(--green)' : 'var(--red)' },
                ].map(m => (
                    <div key={m.label} style={{
                        background: 'var(--card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)', padding: '14px 16px',
                    }}>
                        <div className="lbl">{m.label}</div>
                        <div className="mono" style={{ fontSize: 18, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                ))}
            </div>

            {cashFlowByDay.length > 0 ? (
                <Card>
                    <div className="h3" style={{ marginBottom: 12 }}>Flujo diario del período</div>
                    <TrendAreaChart
                        data={cashFlowByDay}
                        xKey="date"
                        height={200}
                        formatter={v => fmt(v)}
                        series={[
                            { key: 'income', color: '#2dd4a0', label: t.income, gradientId: 'gi-cf' },
                            { key: 'expense', color: '#ff6b6b', label: t.expense, gradientId: 'ge-cf' },
                        ]}
                    />
                </Card>
            ) : (
                <Empty icon="💧" message={t.noData} />
            )}
        </div>
    )
}

// ── Tendencia ─────────────────────────────────────────────────────────────────
function TrendSection({ summary, t }) {
    const trendData = (summary?.monthly_trend || []).map(m => ({
        ...m, label: moLabel(m.month),
    }))

    if (trendData.length === 0) return <Empty icon="📈" message={t.noData} />

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>
                <div className="h3" style={{ marginBottom: 12 }}>Ingresos vs Gastos — últimos 8 meses</div>
                <TrendAreaChart
                    data={trendData}
                    xKey="label"
                    height={220}
                    formatter={v => fmt(v)}
                    series={[
                        { key: 'income', color: '#2dd4a0', label: t.income, gradientId: 'gi-tr' },
                        { key: 'expense', color: '#ff6b6b', label: t.expense, gradientId: 'ge-tr' },
                        { key: 'saving', color: '#a78bfa', label: t.saving, gradientId: 'gs-tr' },
                    ]}
                />
            </Card>

            <Card>
                <div className="h3" style={{ marginBottom: 12 }}>Tasa de ahorro mensual</div>
                <SavingsRateBar months={trendData} maxHeight={50} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, lineHeight: 1.7 }}>
                    📌 Referencia canadiense: tasa de ahorro promedio ~6-8%.
                    Sobre 20% es excelente. Bajo 5% indica poco margen financiero.
                </div>
            </Card>

            <Card>
                <div className="h3" style={{ marginBottom: 12 }}>Comparación mensual (barras)</div>
                <MonthlyBarChart
                    data={trendData}
                    height={200}
                    formatter={v => fmt(v)}
                    bars={[
                        { key: 'income', color: '#2dd4a0', label: t.income },
                        { key: 'expense', color: '#ff6b6b', label: t.expense },
                        { key: 'saving', color: '#a78bfa', label: t.saving },
                    ]}
                />
            </Card>
        </div>
    )
}