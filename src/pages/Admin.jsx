// src/pages/Admin.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Panel de administración SaaS (solo visible para el owner).
//
// En producción, este panel se conectaría a la función rpc_admin_families_overview()
// que solo es accesible con la service_role key de Supabase (nunca en el frontend).
// Los datos aquí son simulados para mostrar el concepto.
//
// SECCIONES:
//   1. Grid de KPIs: familias activas, usuarios, planes pagados
//   2. Gráfica MRR (Monthly Recurring Revenue) — tendencia de ingresos
//   3. Tabla de familias registradas con plan y actividad
//
// NOTA DE SEGURIDAD:
//   En producción, esta página requeriría autenticación adicional
//   (solo la cuenta de Supabase con service_role puede ver datos de todas las familias).
//   El RLS de Supabase impide que usuarios normales vean datos de otras familias.
// ─────────────────────────────────────────────────────────────────────────────
import { useApp } from '../context/AppContext'
import { Card, SectionHeader, PlanBadge, Empty } from '../components/ui/index'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// Datos simulados para el panel admin
// En producción vienen de: supabase.rpc('rpc_admin_families_overview') con service_role key
const DEMO_FAMILIES_LIST = [
    { name: 'Familia García', plan: 'pro', members: 4, txns: 142, joined: '2025-01-15' },
    { name: 'Famille Tremblay', plan: 'family', members: 6, txns: 289, joined: '2025-02-03' },
    { name: 'The Johnsons', plan: 'free', members: 2, txns: 38, joined: '2025-03-10' },
    { name: 'Famille Dubois', plan: 'pro', members: 3, txns: 95, joined: '2025-03-22' },
    { name: 'Familia Rodríguez', plan: 'family', members: 5, txns: 201, joined: '2025-04-01' },
]

// Datos de MRR mes a mes (en producción: calculado desde pagos de Stripe)
const DEMO_MRR = [
    { m: 'Ene', mrr: 420 },
    { m: 'Feb', mrr: 680 },
    { m: 'Mar', mrr: 890 },
    { m: 'Abr', mrr: 1240 },
    { m: 'May', mrr: 1680 },
]

export default function Admin() {
    const { isOwner } = useApp()

    // Solo el owner puede ver este panel
    if (!isOwner) {
        return (
            <Empty
                icon="🔒"
                message="Solo el propietario de la cuenta puede acceder al panel de administración"
            />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionHeader
                title="Panel de Administración SaaS"
                action={
                    <span style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        background: 'var(--border)',
                        borderRadius: 20,
                        padding: '3px 10px',
                    }}>
                        Solo propietario · Datos simulados
                    </span>
                }
            />


            {/* ── 1. GRID DE KPIs GLOBALES ── */}
            <div className="g4">
                {[
                    { label: 'Familias activas', value: 142, icon: '👨‍👩‍👧', color: 'var(--blue)' },
                    { label: 'Usuarios totales', value: 389, icon: '👤', color: 'var(--green)' },
                    { label: 'Planes Pro activos', value: 67, icon: '⭐', color: 'var(--purple)' },
                    { label: 'Planes Family activos', value: 23, icon: '🏆', color: 'var(--yellow)' },
                ].map(stat => (
                    <Card key={stat.label}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
                        <div
                            className="mono"
                            style={{ fontSize: 28, color: stat.color, fontFamily: 'var(--font-display)', fontWeight: 900 }}
                        >
                            {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
                    </Card>
                ))}
            </div>

            {/* ── 2. GRÁFICA MRR ── */}
            <Card>
                <div className="lbl" style={{ marginBottom: 12 }}>
                    MRR — Monthly Recurring Revenue (simulado)
                </div>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={DEMO_MRR}>
                        <defs>
                            <linearGradient id="gMRR" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f7cff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4f7cff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" />
                        <XAxis dataKey="m" tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                        <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                            formatter={v => [`$${v} CAD/mes`, 'MRR']}
                        />
                        <Area
                            type="monotone"
                            dataKey="mrr"
                            stroke="#4f7cff"
                            fill="url(#gMRR)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                    <span>MRR actual: <strong style={{ color: 'var(--blue)' }}>$1,680/mes</strong></span>
                    <span>ARR: <strong style={{ color: 'var(--blue)' }}>$20,160/año</strong></span>
                    <span>Crecimiento MoM: <strong style={{ color: 'var(--green)' }}>+35%</strong></span>
                </div>
            </Card>

            {/* ── 3. TABLA DE FAMILIAS ── */}
            <Card>
                <div className="lbl" style={{ marginBottom: 14 }}>Familias registradas</div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Familia', 'Plan', 'Miembros', 'Transacciones', 'Desde'].map(h => (
                                    <th
                                        key={h}
                                        style={{
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            color: 'var(--muted)',
                                            fontWeight: 600,
                                            fontSize: 10,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DEMO_FAMILIES_LIST.map((f, i) => (
                                <tr
                                    key={i}
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{f.name}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <PlanBadge plan={f.plan} />
                                    </td>
                                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{f.members}</td>
                                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{f.txns}</td>
                                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 11 }}>{f.joined}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── 4. NOTA DE ARQUITECTURA ── */}
            <Card style={{ background: '#0c1020', border: '1px solid #1e2a44' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--blue)' }}>
                    📐 Nota de arquitectura
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
                    En producción, este panel consume la función <code>rpc_admin_families_overview()</code>
                    que solo acepta requests con <code>service_role</code> key — nunca expuesta al frontend.
                    Los datos financieros de otras familias están completamente protegidos por RLS de Supabase.
                    El panel admin real se implementaría como un dashboard separado con autenticación adicional.
                </div>
            </Card>
        </div>


    )
}