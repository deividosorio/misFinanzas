// src/components/ui/AutoTransactionBadge.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Badge visual que indica que una transacción fue generada
// automáticamente por el sistema (no registrada manualmente).
//
// ORÍGENES AUTOMÁTICOS:
//   debt_payment     → Pago abonado a una deuda
//   recurring        → Pago recurrente marcado como pagado
//   savings_deposit  → Depósito en meta de ahorro adulto
//   savings_goal_deposit → Depósito en meta Kids
//   null/undefined   → Transacción manual (no muestra badge)
//
// USO:
//   <AutoTransactionBadge source={tx.auto_source} />
//
// VENTAJA PARA EL USUARIO:
//   Permite identificar de un vistazo qué transacciones fueron automáticas
//   (no las puede editar o borrar por error) vs. las que registró manualmente.
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_META = {
    debt_payment: {
        label: 'Auto · Pago deuda',
        color: '#fb923c',
        icon: '▣',
    },
    recurring: {
        label: 'Auto · Recurrente',
        color: '#a78bfa',
        icon: '↺',
    },
    savings_deposit: {
        label: 'Auto · Ahorro',
        color: '#2dd4a0',
        icon: '◎',
    },
    savings_goal_deposit: {
        label: 'Auto · Meta Kids',
        color: '#fbbf24',
        icon: '⭐',
    },
}

/**
 * AutoTransactionBadge — Muestra el origen automático de una transacción.
 * Si no hay origen (transacción manual), no renderiza nada.
 *
 * @param {string|null} source - Valor del campo auto_source de la transacción
 * @param {'sm'|'xs'}   size   - Tamaño del badge (default: 'xs')
 */
export default function AutoTransactionBadge({ source, size = 'xs' }) {
    if (!source) return null

    const meta = SOURCE_META[source]
    if (!meta) return null

    return (
        <span style={{
            fontSize: size === 'xs' ? 10 : 11,
            fontWeight: 600,
            color: meta.color,
            background: meta.color + '18',
            borderRadius: 20,
            padding: size === 'xs' ? '1px 6px' : '2px 8px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
        }}>
            <span style={{ fontSize: 9 }}>{meta.icon}</span>
            {meta.label}
        </span>
    )
}