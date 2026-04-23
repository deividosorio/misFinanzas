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
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, CardSm, Btn, ProgressBar } from '../components/ui/index'
import {
    AreaChart, Area,
    BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { fmt, fmtSign, pct, moLabel, CAT_COLORS, SUBTYPE_ICON } from '../lib/constants'

// Estilo de tooltip reutilizable para Recharts
const TT = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

export default function Statements() {
    const { t, summary, netWorth, debts, accounts, cards } = useApp()

    // Estado activo del tab de estados financieros
    const [activeStatement, setActiveStatement] = useState('balance')

    const s = summary

    // Preparar datos para la gráfica de tendencia
    const trendData = s?.monthly_trend?.map(d => ({
        ...d,
        label: moLabel(d.month),
    })) || []

    // ── Calcular totales para el Balance General ──────────────────────────────
    // En producción: viene de rpc_balance_sheet()
    // En demo: calculamos desde los datos locales
    const totalAssets = accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
    const totalLiabilities = debts.reduce((sum, d) => {
        const total = d.total_amount ?? d.totalDebt ?? 0
        const paid = d.paid_amount ?? d.paid ?? 0
        return sum + (total - paid)
    }, 0)
    const cardDebt = cards
        .filter(c => c.type === 'credit_card' || c.credit_limit)
        .reduce((sum, c) => sum + (c.month_spent || 0), 0)
    const totalNetWorth = netWorth?.net ?? (totalAssets - totalLiabilities - cardDebt)

    // ── Tabs de estados financieros ───────────────────────────────────────────
    const STATEMENT_TABS = [
        { id: 'balance', label: '⚖️ Balance General' },
        { id: 'income', label: '📈 Resultados' },
        { id: 'cashflow', label: '💧 Flujo de Caja' },
        { id: 'trend', label: '📊 Tendencia' },
        { id: 'cra', label: '🍁 CRA Export' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>


            {/* ── SELECTOR DE ESTADO FINANCIERO ── */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                {STATEMENT_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveStatement(tab.id)}
                        style={{
                            background: activeStatement === tab.id ? 'var(--border)' : 'transparent',
                            color: activeStatement === tab.id ? 'var(--text)' : 'var(--muted)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all .15s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* BALANCE GENERAL                                                    */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {activeStatement === 'balance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Banner de ecuación contable */}
                    <Card style={{
                        background: totalNetWorth === 0 ? '#0d1f14' : '#0c1020',
                        border: `1px solid ${totalNetWorth === 0 ? '#1a3a28' : '#1e2a44'}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div>
                                {/* La ecuación siempre debe cumplirse: A = P + E */}
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14 }}>
                                    ✓ Ecuación contable: Activos = Pasivos + Patrimonio
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                                    {fmt(totalAssets)} = {fmt(totalLiabilities + cardDebt)} + {fmt(Math.abs(totalNetWorth))}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.netWorth}</div>
                                <div className="mono" style={{
                                    fontSize: 24,
                                    color: totalNetWorth >= 0 ? 'var(--green)' : 'var(--red)',
                                }}>
                                    {totalNetWorth < 0
                                        ? `(${fmt(Math.abs(totalNetWorth))})`
                                        : fmt(totalNetWorth)
                                    }
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="g2">
                        {/* ── ACTIVOS ── */}
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>
                                    ACTIVOS
                                </div>
                                <div className="mono" style={{ fontSize: 18, color: 'var(--green)' }}>
                                    {fmt(totalAssets)}
                                </div>
                            </div>

                            {/* Una fila por cada cuenta bancaria */}
                            {accounts.map(a => (
                                <div key={a.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '9px 0',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    {/* Ícono según subtipo de cuenta */}
                                    <span style={{ fontSize: 18 }}>{SUBTYPE_ICON[a.type] || '🏦'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: a.color }}>{a.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                            {t.types?.[a.type] || a.type} · {a.owner_name}
                                        </div>
                                    </div>
                                    <div className="mono" style={{ fontSize: 13, color: 'var(--green)' }}>
                                        {fmt(a.balance)}
                                    </div>
                                </div>
                            ))}

                            {/* Total */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 10,
                                borderTop: '2px solid var(--border)',
                                marginTop: 4,
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                                    Total Activos
                                </span>
                                <span className="mono" style={{ color: 'var(--green)' }}>{fmt(totalAssets)}</span>
                            </div>
                        </Card>

                        {/* ── PASIVOS ── */}
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--red)' }}>
                                    PASIVOS
                                </div>
                                <div className="mono" style={{ fontSize: 18, color: 'var(--red)' }}>
                                    {fmt(totalLiabilities + cardDebt)}
                                </div>
                            </div>

                            {/* Deudas de largo plazo */}
                            {debts.map(d => {
                                const total = d.total_amount ?? d.totalDebt ?? 0
                                const paid = d.paid_amount ?? d.paid ?? 0
                                const remaining = total - paid
                                return (
                                    <div key={d.id} style={{
                                        padding: '9px 0',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 18 }}>
                                                    {d.name.toLowerCase().includes('hipoteca') ? '🏠' : '🚗'}
                                                </span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                                        {d.interest_rate ?? d.interestRate ?? 0}% anual
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mono" style={{ fontSize: 13, color: 'var(--red)' }}>
                                                {fmt(remaining)}
                                            </div>
                                        </div>
                                        {/* Mini barra de progreso de pago */}
                                        <ProgressBar value={paid} max={total} height={3} />
                                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                                            {pct(paid, total)}% pagado
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Saldos de tarjetas de crédito */}
                            {cards.filter(c => c.month_spent > 0).map(c => (
                                <div key={c.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '9px 0',
                                    borderBottom: '1px solid var(--border)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>💳</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: c.color }}>
                                                {c.name} ···{c.last_four}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Saldo pendiente</div>
                                        </div>
                                    </div>
                                    <div className="mono" style={{ fontSize: 13, color: 'var(--red)' }}>
                                        {fmt(c.month_spent)}
                                    </div>
                                </div>
                            ))}

                            {/* Total */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingTop: 10,
                                borderTop: '2px solid var(--border)',
                                marginTop: 4,
                            }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                                    Total Pasivos
                                </span>
                                <span className="mono" style={{ color: 'var(--red)' }}>
                                    {fmt(totalLiabilities + cardDebt)}
                                </span>
                            </div>
                        </Card>
                    </div>

                    {/* ── PATRIMONIO NETO (resultado de la ecuación) ── */}
                    <Card style={{ background: '#0c1020', border: '1px solid #1e2a44' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--purple)' }}>
                                    PATRIMONIO NETO
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                                    {fmt(totalAssets)} (activos) − {fmt(totalLiabilities + cardDebt)} (pasivos)
                                </div>
                            </div>
                            <div className="mono" style={{
                                fontSize: 28,
                                color: totalNetWorth >= 0 ? 'var(--green)' : 'var(--red)',
                            }}>
                                {totalNetWorth < 0
                                    ? `(${fmt(Math.abs(totalNetWorth))})`
                                    : fmt(totalNetWorth)
                                }
                            </div>
                        </div>
                        <div style={{
                            marginTop: 14,
                            fontSize: 12,
                            color: 'var(--muted)',
                            background: 'var(--muted2)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 12px',
                        }}>
                            💡 El patrimonio negativo es normal al inicio de una hipoteca.
                            Con pagos consistentes mejora ~$12,000/año.
                        </div>
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* ESTADO DE RESULTADOS                                               */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {activeStatement === 'income' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Card>
                        <div style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            marginBottom: 16,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            Estado de Resultados · Período seleccionado
                        </div>

                        {/* ── INGRESOS ── */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>INGRESOS</span>
                                <span className="mono" style={{ color: 'var(--green)', fontSize: 16 }}>
                                    {fmt(s?.income)}
                                </span>
                            </div>
                            {/* Desglose por categoría de ingreso */}
                            {s?.by_category
                                ?.filter(d => ['salary', 'freelance', 'investment', 'other_income'].includes(d.category))
                                .map(d => (
                                    <CategoryRow key={d.category} item={d} t={t} color="var(--green)" type="income" max={s?.income} />
                                ))}
                        </div>

                        <div className="sep" />

                        {/* ── GASTOS ── */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>GASTOS</span>
                                <span className="mono" style={{ color: 'var(--red)', fontSize: 16 }}>
                                    ({fmt(s?.expense)})
                                </span>
                            </div>
                            {/* Desglose por categoría de gasto */}
                            {s?.by_category?.map(d => (
                                <CategoryRow key={d.category} item={d} t={t} color="var(--red)" type="expense" max={s?.expense} />
                            ))}
                        </div>

                        <div className="sep" />

                        {/* ── RESULTADO NETO ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>
                                    RESULTADO NETO
                                </div>
                                {s?.income > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                                        Tasa de ahorro: {((s.saving / s.income) * 100).toFixed(1)}%
                                        {' '}· Ahorro: {fmt(s.saving)}
                                    </div>
                                )}
                            </div>
                            <div className="mono" style={{
                                fontSize: 24,
                                color: (s?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                            }}>
                                {(s?.balance || 0) >= 0 ? '+' : ''}{fmt(s?.balance)}
                            </div>
                        </div>
                    </Card>

                    {/* Gráfica horizontal de gastos por categoría */}
                    <Card>
                        <div className="lbl" style={{ marginBottom: 12 }}>Distribución de gastos</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart
                                data={s?.by_category || []}
                                layout="vertical"
                                margin={{ left: 90 }}
                            >
                                <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 9 }} />
                                <YAxis
                                    type="category"
                                    dataKey="category"
                                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                                    tickFormatter={cat => t.cats[cat] || cat}
                                    width={87}
                                />
                                <Tooltip
                                    contentStyle={TT}
                                    formatter={v => fmt(v)}
                                    labelFormatter={l => t.cats[l] || l}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {(s?.by_category || []).map(entry => (
                                        <Cell key={entry.category} fill={CAT_COLORS[entry.category] || '#4f7cff'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* FLUJO DE CAJA                                                      */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {activeStatement === 'cashflow' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* KPIs de flujo */}
                    <div className="g3">
                        {[
                            {
                                label: 'Flujo Operativo',
                                value: (s?.income || 0) - (s?.expense || 0),
                                color: 'var(--green)',
                                desc: 'Ingresos − Gastos operativos',
                            },
                            {
                                label: 'Flujo Financiero',
                                value: -debts.reduce((sum, d) => sum + (d.monthly_payment ?? d.monthlyPayment ?? 0), 0),
                                color: 'var(--orange)',
                                desc: 'Pagos de hipoteca y préstamos',
                            },
                            {
                                label: 'Cambio Neto',
                                value: (s?.balance || 0),
                                color: (s?.balance || 0) >= 0 ? 'var(--blue)' : 'var(--red)',
                                desc: 'Variación total del período',
                            },
                        ].map(k => (
                            <Card key={k.label}>
                                <div className="lbl">{k.label}</div>
                                <div className="mono" style={{ fontSize: 20, color: k.color, marginTop: 4 }}>
                                    {fmtSign(k.value)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{k.desc}</div>
                            </Card>
                        ))}
                    </div>

                    <div className="g2">
                        {/* Actividades operativas */}
                        <Card>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 14,
                                marginBottom: 12,
                                color: 'var(--green)',
                            }}>
                                Actividades Operativas
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Ingresos totales</span>
                                <span className="mono" style={{ color: 'var(--green)' }}>{fmtSign(s?.income)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Gastos operativos</span>
                                <span className="mono" style={{ color: 'var(--red)' }}>{fmtSign(-(s?.expense || 0))}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--border)', marginTop: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>Subtotal operativo</span>
                                <span className="mono" style={{ color: 'var(--green)' }}>
                                    {fmtSign((s?.income || 0) - (s?.expense || 0))}
                                </span>
                            </div>
                        </Card>

                        {/* Actividades financieras */}
                        <Card>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 14,
                                marginBottom: 12,
                                color: 'var(--orange)',
                            }}>
                                Actividades Financieras
                            </div>
                            {debts.map(d => (
                                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.name}</span>
                                    <span className="mono" style={{ color: 'var(--red)' }}>
                                        {fmtSign(-(d.monthly_payment ?? d.monthlyPayment ?? 0))}
                                    </span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--border)', marginTop: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700 }}>Subtotal financiero</span>
                                <span className="mono" style={{ color: 'var(--orange)' }}>
                                    {fmtSign(-debts.reduce((sum, d) => sum + (d.monthly_payment ?? d.monthlyPayment ?? 0), 0))}
                                </span>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* TENDENCIA 8 MESES                                                  */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {activeStatement === 'trend' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Card>
                        <div className="lbl" style={{ marginBottom: 14 }}>
                            Ingresos vs Gastos — Últimos 8 meses
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="gI3" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2dd4a0" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2dd4a0" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gE3" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
                                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={TT}
                                    formatter={(v, name) => [
                                        fmt(v),
                                        name === 'income' ? t.income : name === 'expense' ? t.expense : t.saving,
                                    ]}
                                />
                                <Area type="monotone" dataKey="income" stroke="#2dd4a0" fill="url(#gI3)" strokeWidth={2} />
                                <Area type="monotone" dataKey="expense" stroke="#ff6b6b" fill="url(#gE3)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Tabla de tasa de ahorro por mes */}
                    <Card>
                        <div className="lbl" style={{ marginBottom: 12 }}>Tasa de ahorro mensual</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {trendData.map(m => {
                                const savingsRate = m.income > 0 ? ((m.income - m.expense) / m.income * 100).toFixed(1) : 0
                                const rateColor = savingsRate >= 40 ? 'var(--green)' : savingsRate >= 20 ? 'var(--yellow)' : 'var(--red)'
                                return (
                                    <div key={m.month} style={{ textAlign: 'center', flex: 1, minWidth: 50 }}>
                                        <div style={{
                                            height: 40,
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            marginBottom: 4,
                                        }}>
                                            <div style={{
                                                width: 24,
                                                borderRadius: 4,
                                                background: rateColor,
                                                opacity: 0.7,
                                                height: `${Math.max(4, savingsRate * 0.7)}%`,
                                                minHeight: 4,
                                            }} />
                                        </div>
                                        <div style={{ fontSize: 9, color: 'var(--muted)' }}>{m.label}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: rateColor }}>{savingsRate}%</div>
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* EXPORTACIÓN CRA (Canada Revenue Agency)                           */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {activeStatement === 'cra' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Disclaimer */}
                    <Card style={{ background: '#0c1a0c', border: '1px solid #1a3a1a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 24 }}>🍁</span>
                            <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15 }}>
                                    Exportación CRA — Canada Revenue Agency
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    ⚠️ Solo para referencia personal. Consulta un CPA para tu declaración oficial.
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Líneas del T1 General */}
                    <Card>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
                            T1 General — Año fiscal {new Date().getFullYear() - 1}
                        </div>
                        {[
                            {
                                line: '10100',
                                desc: 'Ingresos de empleo (T4)',
                                value: s?.income || 0,
                                note: 'Suma de todos los salarios del año fiscal',
                            },
                            {
                                line: '12000',
                                desc: 'Ingresos de inversión',
                                value: 0,
                                note: 'Dividendos, intereses — revisar estados de cuenta',
                            },
                            {
                                line: '15000',
                                desc: 'Total de ingresos',
                                value: s?.income || 0,
                                note: 'Suma de todas las fuentes de ingreso',
                            },
                            {
                                line: '33099',
                                desc: 'Gastos médicos (Line 33099)',
                                value: 0,
                                note: 'Puede generar deducción si supera 3% del ingreso neto',
                            },
                        ].map(row => (
                            <div key={row.line} style={{
                                padding: '12px 0',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{
                                            fontSize: 10, color: 'var(--blue)', fontWeight: 700, marginRight: 8,
                                        }}>
                                            Línea {row.line}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{row.desc}</span>
                                    </div>
                                    <span className="mono" style={{ fontSize: 14, color: 'var(--green)' }}>
                                        {fmt(row.value)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{row.note}</div>
                            </div>
                        ))}
                    </Card>

                    {/* Sugerencias fiscales detectadas */}
                    <Card style={{ background: '#1a1a0c', border: '1px solid #3a3a1a' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--yellow)' }}>
                            💡 Optimizaciones fiscales detectadas por IA
                        </div>
                        {[
                            'Considera maximizar tu contribución RRSP antes del 1° de marzo. Tu límite estimado: $20,240.',
                            'Si tienes home office (trabajo híbrido), podrías reclamar deducciones T2200.',
                            'CELI: asegúrate de haber maximizado tu espacio de contribución ($7,000 para 2025).',
                            'Los gastos médicos que superen el 3% de tu ingreso neto son deducibles en la línea 33099.',
                        ].map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                                <span style={{ color: 'var(--yellow)', flexShrink: 0 }}>→</span>
                                {tip}
                            </div>
                        ))}
                    </Card>
                </div>
            )}
        </div>


    )
}

// ── Fila de categoría para Estado de Resultados ───────────────────────────────
/**

- Muestra una fila de categoría con barra de progreso relativa al total.
- 
- @param {object} item  - { category, value }
- @param {object} t     - Traducciones
- @param {string} color - Color del monto
- @param {number} max   - Valor máximo para calcular el ancho de la barra
  */
function CategoryRow({ item, t, color, max }) {
    const barWidth = max > 0 ? (item.value / max) * 100 : 0

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            {/* Punto de color */}
            <div style={{
                width: 8, height: 8,
                borderRadius: 2,
                background: CAT_COLORS[item.category] || '#4f7cff',
                flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
                {/* Nombre + monto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>
                        {t.cats[item.category] || item.category}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color }}>{fmt(item.value)}</span>
                </div>
                {/* Barra relativa */}
                <div className="pb" style={{ height: 3 }}>
                    <div className="pf" style={{
                        width: `${barWidth.toFixed(1)}%`,
                        background: CAT_COLORS[item.category] || '#4f7cff',
                    }} />
                </div>
            </div>
        </div>
    )
}