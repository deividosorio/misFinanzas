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
// src/pages/Dashboard.jsx
// v4: separa correctamente activos (saldo) vs crédito (deuda/disponible)
import { useApp } from '../context/AppContext'
import { Card, KPICard, SectionHeader, ProgressBar, Empty } from '../components/ui/index'
import TrendAreaChart from '../components/charts/AreaChart'
import CategoryPieChart from '../components/charts/PieChart'
import Btn from '../components/ui/Btn'
import AutoTransactionBadge from '../components/ui/AutoTransactionBadge'
import { fmt, fmtSign, pct, moLabel, ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../lib/constants'

export default function Dashboard() {
    const {
        t, summary, netWorth, txns,
        accounts, assetAccounts, creditAccounts,
        debts, openModal, setTab, setSelAcc,
    } = useApp()

    const recentTxns = txns.filter(tx => !tx.is_void).slice(0, 8)

    // Tendencia mensual con etiquetas legibles
    const trendData = (summary?.monthly_trend || []).map(m => ({
        ...m, label: moLabel(m.month),
    }))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── FILA 1: KPIs del período ── */}
            <div className="g4">
                <KPICard
                    label={t.totalIncome}
                    value={fmt(summary?.income || 0)}
                    color="var(--green)"
                    icon="↑"
                    sub={`${summary?.savings_rate || 0}% ${t.savingsRate}`}
                />
                <KPICard
                    label={t.totalExpense}
                    value={fmt(summary?.expense || 0)}
                    color="var(--red)"
                    icon="↓"
                />
                <KPICard
                    label={t.totalSaving}
                    value={fmt(summary?.saving || 0)}
                    color="var(--purple)"
                    icon="◎"
                />
                <KPICard
                    label={t.netBalance}
                    value={fmtSign(summary?.balance || 0)}
                    color={(summary?.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)'}
                    icon="≡"
                />
            </div>

            {/* ── FILA 2: Patrimonio neto ── */}
            {netWorth && (
                <Card style={{
                    background: 'linear-gradient(135deg, #0c1020, #111828)',
                    border: '1px solid #1e2a44',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div className="lbl">{t.netWorth}</div>
                            <div className="mono" style={{
                                fontSize: 28,
                                color: netWorth.net >= 0 ? 'var(--green)' : 'var(--red)',
                                marginTop: 4,
                            }}>
                                {fmtSign(netWorth.net)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {/* Activos */}
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.assets}</div>
                                <div className="mono" style={{ color: 'var(--green)', fontSize: 16 }}>
                                    {fmt(netWorth.assets)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    saldo cuentas débito/ahorro
                                </div>
                            </div>
                            {/* Deuda tarjetas */}
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.creditDebt}</div>
                                <div className="mono" style={{ color: 'var(--orange)', fontSize: 16 }}>
                                    {fmt(netWorth.credit_debt)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    deuda acumulada tarjetas
                                </div>
                            </div>
                            {/* Deuda largo plazo */}
                            <div style={{ textAlign: 'right' }}>
                                <div className="lbl">{t.longDebt}</div>
                                <div className="mono" style={{ color: 'var(--red)', fontSize: 16 }}>
                                    {fmt(netWorth.long_debt)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    hipoteca, auto, préstamos
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* ── FILA 3: Gráficas ── */}
            <div className="g2">
                <Card>
                    <div className="h3" style={{ marginBottom: 12 }}>Tendencia mensual</div>
                    {trendData.length > 0 ? (
                        <TrendAreaChart
                            data={trendData}
                            xKey="label"
                            height={200}
                            formatter={v => fmt(v)}
                            series={[
                                { key: 'income', color: '#2dd4a0', label: t.income, gradientId: 'gi-dash' },
                                { key: 'expense', color: '#ff6b6b', label: t.expense, gradientId: 'ge-dash' },
                                { key: 'saving', color: '#a78bfa', label: t.saving, gradientId: 'gs-dash' },
                            ]}
                        />
                    ) : (
                        <Empty icon="📊" message={t.noData} />
                    )}
                </Card>

                <Card>
                    <div className="h3" style={{ marginBottom: 12 }}>Gastos por categoría</div>
                    {(summary?.by_category || []).length > 0 ? (
                        <CategoryPieChart
                            data={summary.by_category}
                            height={200}
                            formatter={v => [fmt(v), '']}
                            labelMap={t.cats}
                        />
                    ) : (
                        <Empty icon="🥧" message={t.noData} />
                    )}
                </Card>
            </div>

            {/* ── FILA 4: Cuentas de activo (saldo) ── */}
            {assetAccounts.length > 0 && (
                <Card>
                    <SectionHeader
                        title={t.assetAccounts}
                        action={
                            <Btn size="xs" variant="ghost" onClick={() => setTab('family')}>
                                Gestionar →
                            </Btn>
                        }
                    />
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 8,
                    }}>
                        {assetAccounts.map(a => (
                            <AssetAccountCard
                                key={a.id}
                                account={a}
                                onClick={() => { setSelAcc(a.id); setTab('transactions') }}
                            />
                        ))}
                    </div>
                </Card>
            )}

            {/* ── FILA 5: Tarjetas de crédito (deuda/disponible) ── */}
            {creditAccounts.length > 0 && (
                <Card>
                    <SectionHeader
                        title={t.creditAccounts}
                        action={
                            <Btn size="xs" variant="ghost" onClick={() => setTab('family')}>
                                Gestionar →
                            </Btn>
                        }
                    />
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 8,
                    }}>
                        {creditAccounts.map(a => (
                            <CreditAccountCard
                                key={a.id}
                                account={a}
                                onClick={() => { setSelAcc(a.id); setTab('transactions') }}
                            />
                        ))}
                    </div>
                </Card>
            )}

            {/* ── FILA 6: Deudas de largo plazo (resumen) ── */}
            {debts.length > 0 && (
                <Card>
                    <SectionHeader
                        title="Deudas de largo plazo"
                        action={
                            <Btn size="xs" variant="ghost" onClick={() => setTab('debts')}>
                                Ver detalle →
                            </Btn>
                        }
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {debts.slice(0, 3).map(d => {
                            const remaining = d.total_amount - d.paid_amount
                            const paidPct = pct(d.paid_amount, d.total_amount)
                            return (
                                <div key={d.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600 }}>{d.name}</span>
                                        <span className="mono" style={{ color: 'var(--red)' }}>{fmt(remaining)}</span>
                                    </div>
                                    <ProgressBar value={d.paid_amount} max={d.total_amount} height={6}
                                        color={paidPct > 70 ? 'var(--green)' : paidPct > 40 ? 'var(--blue)' : 'var(--yellow)'}
                                    />
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                        {paidPct}% pagado · {fmt(d.monthly_payment)}/mes
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* ── FILA 7: Últimos movimientos ── */}
            <Card>
                <SectionHeader
                    title="Últimos movimientos"
                    action={
                        <Btn size="xs" variant="primary" onClick={() => openModal('tx')}>
                            + {t.addTransaction}
                        </Btn>
                    }
                />
                {recentTxns.length === 0 ? (
                    <Empty icon="📭" message={t.noData} />
                ) : (
                    <div>
                        {recentTxns.map((tx, i) => (
                            <MiniTxRow key={tx.id} tx={tx} isLast={i === recentTxns.length - 1} />
                        ))}
                        {txns.filter(t => !t.is_void).length > 8 && (
                            <div style={{ textAlign: 'center', paddingTop: 10 }}>
                                <Btn size="xs" variant="ghost" onClick={() => setTab('transactions')}>
                                    Ver todos los movimientos →
                                </Btn>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    )
}

// ── AssetAccountCard ──────────────────────────────────────────────────────────
function AssetAccountCard({ account: a, onClick }) {
    const cfg = ACCOUNT_SUBTYPES[a.subtype]
    return (
        <div onClick={onClick} style={{
            background: a.color + '10',
            border: `1px solid ${a.color}44`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all .15s',
        }}
            onMouseEnter={e => e.currentTarget.style.background = a.color + '18'}
            onMouseLeave={e => e.currentTarget.style.background = a.color + '10'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{cfg?.icon}</span>
                <div style={{
                    fontSize: 12, fontWeight: 600, color: a.color, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                    {a.name}
                </div>
            </div>
            <div className="mono" style={{ fontSize: 18, marginBottom: 2 }}>
                {fmt(a.balance || 0)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                {a.owner_name && `${a.owner_name} · `}{cfg?.label}
            </div>
        </div>
    )
}

// ── CreditAccountCard ─────────────────────────────────────────────────────────
// Muestra la deuda acumulada del mes y el disponible restante
function CreditAccountCard({ account: a, onClick }) {
    const cfg = ACCOUNT_SUBTYPES[a.subtype]
    const debt = a.month_debt || 0
    const avail = a.available ?? (a.credit_limit - debt)
    const usedPct = pct(debt, a.credit_limit)
    const barColor = usedPct > 80 ? 'var(--red)' : usedPct > 50 ? 'var(--yellow)' : 'var(--green)'

    return (
        <div onClick={onClick} style={{
            background: a.color + '10',
            border: `1px solid ${a.color}44`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all .15s',
        }}
            onMouseEnter={e => e.currentTarget.style.background = a.color + '18'}
            onMouseLeave={e => e.currentTarget.style.background = a.color + '10'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>💳</span>
                <div style={{
                    fontSize: 12, fontWeight: 600, color: a.color,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                    {a.name}{a.last_four ? ` ···${a.last_four}` : ''}
                </div>
            </div>
            {/* Deuda del mes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                    <div style={{
                        fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: 0.5
                    }}>Deuda mes</div>
                    <div className="mono" style={{ fontSize: 16, color: 'var(--red)' }}>
                        {fmt(debt)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: 0.5
                    }}>Disponible</div>
                    <div className="mono" style={{ fontSize: 16, color: 'var(--green)' }}>
                        {fmt(avail)}
                    </div>
                </div>
            </div>
            {/* Barra de utilización */}
            <ProgressBar value={debt} max={a.credit_limit} height={5} color={barColor} />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                {usedPct}% utilizado · Límite: {fmt(a.credit_limit)}
            </div>
        </div>
    )
}

// ── MiniTxRow ─────────────────────────────────────────────────────────────────
function MiniTxRow({ tx, isLast }) {
    const { getAccount, t } = useApp()
    const acc = getAccount(tx.account_id)
    const isCredit = acc ? CREDIT_SUBTYPES.includes(acc.subtype) : false

    const amtColor = {
        income: 'var(--green)',
        expense: 'var(--red)',
        saving: 'var(--purple)',
    }[tx.type] || 'var(--text)'

    const sign = tx.type === 'income' ? '+' : '-'

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0',
            borderBottom: isLast ? 'none' : '1px solid var(--border)',
        }}>
            {/* Tipo badge */}
            <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: amtColor + '14', fontSize: 13,
            }}>
                {tx.type === 'income' ? '↑' : tx.type === 'saving' ? '◎' : '↓'}
            </div>

            {/* Descripción */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                    {tx.description}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{tx.date}</span>
                    {acc && (
                        <span style={{ fontSize: 10, color: isCredit ? 'var(--red)' : acc.color }}>
                            {isCredit ? '💳' : ACCOUNT_SUBTYPES[acc.subtype]?.icon} {acc.name}
                        </span>
                    )}
                    <AutoTransactionBadge source={tx.auto_source} size="xs" />
                </div>
            </div>

            {/* Monto */}
            <div className="mono" style={{ color: amtColor, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {sign}{fmt(tx.amount)}
            </div>
        </div>
    )
}