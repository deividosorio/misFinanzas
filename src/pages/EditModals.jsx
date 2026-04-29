// src/pages/EditModals.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Modales de edición para todos los registros financieros.
//
// PRINCIPIO DE DISEÑO: Reutilizar los mismos campos de los formularios de
// creación. La única diferencia es que se pre-llenan con los datos existentes
// y la acción llama a la función RPC de actualización.
//
// MODALES EXPORTADOS:
//   EditTxModal       → Editar transacción existente (rpc_update_transaction)
//   EditDebtModal     → Editar datos de una deuda (rpc_update_debt)
//   EditRecurringModal→ Editar pago recurrente (rpc_update_recurring)
//   EditSavingsGoal   → Editar meta de ahorro (rpc_update_savings_goal)
//   EditAccountModal  → Editar cuenta bancaria/tarjeta (rpc_update_account)
//
// PATRÓN COMÚN:
//   1. Recibe el objeto a editar como prop
//   2. Inicializa el estado con los valores actuales
//   3. Al guardar: llama al RPC correspondiente con solo los campos modificados
//   4. Llama a reload() para actualizar el estado global
//
// VALIDACIÓN:
//   - Montos no negativos
//   - Descripción no vacía para transacciones
//   - Nombre no vacío para deudas/recurrentes/metas
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/EditModals.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIONES v4:
//
//  EditTxModal:
//    - Eliminado payment_account_id del estado y del submit
//    - Selector de cuenta unificado con optgroups (débito/crédito)
//    - La cuenta puede ser activo (débito/ahorro) o pasivo (crédito)
//    - Indicador visual del tipo de cuenta seleccionada
//
//  EditDebtModal:
//    - linked_account_id solo muestra cuentas de activo
//      (los pagos de deuda salen de débito, no de tarjeta de crédito)
//
//  EditRecurringModal:
//    - Selector de cuenta unificado (débito Y crédito)
//    - Selector de deuda vinculada
//    - Botón para desvincular deuda (p_clear_debt=true)
//
//  EditSavingsGoalModal:
//    - Sin cambios funcionales, solo actualiza imports
//
//  EditAccountModal:
//    - Un solo modal para activos y crédito
//    - Solo muestra credit_limit si es cuenta de crédito
//    - Solo muestra opening_balance si es cuenta de activo
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import Btn from '../components/ui/Btn'
import { Field, Input, Select, ModalFooter, ColorPicker } from '../components/ui/Form'
import {
    ACCOUNT_SUBTYPES, CREDIT_SUBTYPES,
    INCOME_CATS, EXPENSE_CATS, SAVING_CATS,
    ACC_COLORS, toDay,
} from '../lib/constants'

// Helper local
const isCred = (subtype) => CREDIT_SUBTYPES.includes(subtype)

// ── EditTxModal ───────────────────────────────────────────────────────────────
/**
 * Edita una transacción existente.
 * v4: selector de cuenta unificado. Sin payment_account_id.
 */
export function EditTxModal({ txn, onClose }) {
    const { t, accounts, editTxn, isDemoMode } = useApp()

    const CATS = {
        income: INCOME_CATS,
        expense: EXPENSE_CATS,
        saving: SAVING_CATS,
    }

    const [f, setF] = useState({
        type: txn.type,
        category: txn.category,
        description: txn.description || '',
        amount: String(txn.amount),
        date: txn.date,
        account_id: txn.account_id || '',
        notes: txn.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (k, v) => {
        setError('')
        setF(prev => ({
            ...prev, [k]: v,
            ...(k === 'type' ? { category: CATS[v][0], account_id: '' } : {}),
        }))
    }

    // Cuentas disponibles según el tipo de transacción
    const assetAccounts = accounts.filter(a => a.is_active && !isCred(a.subtype))
    const creditAccounts = accounts.filter(a => a.is_active && isCred(a.subtype))

    const selectedAccount = accounts.find(a => a.id === f.account_id)
    const selectedIsCredit = selectedAccount ? isCred(selectedAccount.subtype) : false

    const handleSave = async () => {
        if (!f.description.trim()) { setError('La descripción es requerida'); return }
        if (!f.amount || parseFloat(f.amount) <= 0) { setError('Monto inválido'); return }

        setSaving(true)
        const { error } = await editTxn(txn.id, {
            type: f.type,
            category: f.category,
            description: f.description.trim(),
            amount: parseFloat(f.amount),
            date: f.date,
            account_id: f.account_id || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        onClose()
    }

    return (
        <Modal title="✏️ Editar movimiento" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {error && <ErrMsg msg={error} />}

                {/* Tipo */}
                <Field label={t.type}>
                    <div style={{ display: 'flex', gap: 5 }}>
                        {[
                            { id: 'income', label: t.income, color: 'var(--green)' },
                            { id: 'expense', label: t.expense, color: 'var(--red)' },
                            { id: 'saving', label: t.saving, color: 'var(--purple)' },
                        ].map(tp => (
                            <button key={tp.id} onClick={() => set('type', tp.id)} style={{
                                flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${f.type === tp.id ? tp.color + '66' : 'var(--border)'}`,
                                background: f.type === tp.id ? tp.color + '12' : 'transparent',
                                color: f.type === tp.id ? tp.color : 'var(--muted)',
                                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', transition: 'all .15s',
                            }}>
                                {tp.label}
                            </button>
                        ))}
                    </div>
                </Field>

                {/* Categoría */}
                <Field label={t.category}>
                    <Select value={f.category} onChange={e => set('category', e.target.value)}>
                        {(CATS[f.type] || []).map(c => (
                            <option key={c} value={c}>{t.cats?.[c] || c}</option>
                        ))}
                    </Select>
                </Field>

                {/* Cuenta unificada */}
                <Field label={f.type === 'expense' ? 'Cuenta o tarjeta utilizada' : f.type === 'income' ? 'Cuenta donde entró el dinero' : 'Cuenta de ahorro'}>
                    <Select value={f.account_id} onChange={e => set('account_id', e.target.value)}>
                        <option value="">— Sin cuenta —</option>
                        {assetAccounts.length > 0 && (
                            <optgroup label="🏦 Débito / Ahorro / Efectivo">
                                {assetAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {creditAccounts.length > 0 && f.type === 'expense' && (
                            <optgroup label="💳 Tarjeta de crédito">
                                {creditAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        💳 {a.name}{a.last_four ? ` ···${a.last_four}` : ''}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </Select>
                    {selectedAccount && (
                        <div style={{
                            fontSize: 10, marginTop: 3,
                            color: selectedIsCredit ? 'var(--red)' : 'var(--green)'
                        }}>
                            {selectedIsCredit
                                ? '💳 Crédito — el gasto aumenta la deuda de la tarjeta'
                                : '🏦 Débito — el gasto se descuenta del saldo de la cuenta'}
                        </div>
                    )}
                </Field>

                {/* Descripción */}
                <Field label={t.description}>
                    <Input value={f.description}
                        onChange={e => set('description', e.target.value)} />
                </Field>

                {/* Monto y fecha */}
                <div className="g2">
                    <Field label={`${t.amount} (CAD)`}>
                        <Input type="number" value={f.amount}
                            onChange={e => set('amount', e.target.value)} min="0" step="0.01" />
                    </Field>
                    <Field label={t.date}>
                        <Input type="date" value={f.date}
                            onChange={e => set('date', e.target.value)} />
                    </Field>
                </div>

                {/* Notas */}
                <Field label="Notas (opcional)">
                    <Input value={f.notes} onChange={e => set('notes', e.target.value)} />
                </Field>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.description || !f.amount} />
            </div>
        </Modal>
    )
}

// ── EditDebtModal ─────────────────────────────────────────────────────────────
/**
 * Edita datos de una deuda de largo plazo.
 * linked_account_id: solo cuentas de activo (el pago sale de débito, no crédito).
 */
export function EditDebtModal({ debt, onClose }) {
    const { t, accounts, editDebt } = useApp()

    // Solo cuentas de activo para pagos de deuda
    const debitAccounts = accounts.filter(a => a.is_active && !isCred(a.subtype))

    const [f, setF] = useState({
        name: debt.name,
        category: debt.category || 'mortgage',
        total_amount: String(debt.total_amount),
        monthly_payment: String(debt.monthly_payment || ''),
        interest_rate: String(debt.interest_rate || ''),
        start_date: debt.start_date || toDay(),
        linked_account_id: debt.linked_account_id || '',
        notes: debt.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const DEBT_CATS = [
        { id: 'mortgage', label: '🏠 Hipoteca' },
        { id: 'car', label: '🚗 Auto' },
        { id: 'personal_loan', label: '💼 Préstamo personal' },
        { id: 'student_loan', label: '🎓 Préstamo estudiantil' },
        { id: 'other_expense', label: '📋 Otro' },
    ]

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.total_amount || parseFloat(f.total_amount) <= 0) {
            setError('El monto total debe ser mayor que cero'); return
        }
        setSaving(true)
        const { error } = await editDebt(debt.id, {
            name: f.name.trim(),
            category: f.category,
            total_amount: parseFloat(f.total_amount),
            monthly_payment: f.monthly_payment ? parseFloat(f.monthly_payment) : null,
            interest_rate: f.interest_rate ? parseFloat(f.interest_rate) : 0,
            start_date: f.start_date || null,
            linked_account_id: f.linked_account_id || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        onClose()
    }

    return (
        <Modal title="✏️ Editar deuda" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}

                <Field label="Nombre *">
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
                </Field>

                <Field label="Categoría">
                    <Select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                        {DEBT_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </Select>
                </Field>

                <div className="g2">
                    <Field label="Monto total (CAD) *">
                        <Input type="number" value={f.total_amount}
                            onChange={e => setF(p => ({ ...p, total_amount: e.target.value }))} min="0" />
                    </Field>
                    <Field label="Cuota mensual (CAD)">
                        <Input type="number" value={f.monthly_payment}
                            onChange={e => setF(p => ({ ...p, monthly_payment: e.target.value }))} min="0" />
                    </Field>
                    <Field label="Tasa anual (%)">
                        <Input type="number" value={f.interest_rate}
                            onChange={e => setF(p => ({ ...p, interest_rate: e.target.value }))} min="0" step="0.01" />
                    </Field>
                    <Field label="Fecha inicio">
                        <Input type="date" value={f.start_date}
                            onChange={e => setF(p => ({ ...p, start_date: e.target.value }))} />
                    </Field>
                </div>

                {/* Cuenta de activo para pagos */}
                <Field label="Cuenta de débito para pagos">
                    <Select value={f.linked_account_id}
                        onChange={e => setF(p => ({ ...p, linked_account_id: e.target.value }))}>
                        <option value="">— Sin cuenta vinculada —</option>
                        {debitAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                {a.owner_name ? ` (${a.owner_name})` : ''}
                            </option>
                        ))}
                    </Select>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                        Solo cuentas de débito/ahorro — los pagos no salen de tarjetas de crédito
                    </div>
                </Field>

                <Field label="Notas">
                    <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.total_amount} />
            </div>
        </Modal>
    )
}

// ── EditRecurringModal ────────────────────────────────────────────────────────
/**
 * Edita un pago recurrente con selector de cuenta unificado y deuda vinculada.
 */
export function EditRecurringModal({ rec, onClose }) {
    const { t, accounts, debts, editRecurring } = useApp()

    const assetAccounts = accounts.filter(a => a.is_active && !isCred(a.subtype))
    const creditAccounts = accounts.filter(a => a.is_active && isCred(a.subtype))
    const activeDebts = debts.filter(d => d.is_active)

    const [f, setF] = useState({
        name: rec.name,
        amount: String(rec.amount),
        frequency: rec.frequency,
        category: rec.category,
        account_id: rec.account_id || '',
        linked_debt_id: rec.linked_debt_id || '',
        next_due: rec.next_due || toDay(),
        notes: rec.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [clearDebt, setClearDebt] = useState(false)

    const selectedAccount = accounts.find(a => a.id === f.account_id)
    const selectedIsCredit = selectedAccount ? isCred(selectedAccount.subtype) : false
    const selectedDebt = debts.find(d => d.id === f.linked_debt_id)

    const FREQ = [
        { id: 'monthly', label: 'Mensual' },
        { id: 'biweekly', label: 'Quincenal' },
        { id: 'weekly', label: 'Semanal' },
        { id: 'yearly', label: 'Anual' },
    ]

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.amount || parseFloat(f.amount) <= 0) { setError('Monto inválido'); return }
        if (!f.account_id) { setError('Selecciona la cuenta'); return }

        setSaving(true)
        const { error } = await editRecurring(rec.id, {
            name: f.name.trim(),
            amount: parseFloat(f.amount),
            frequency: f.frequency,
            category: f.category,
            account_id: f.account_id || null,
            linked_debt_id: clearDebt ? null : (f.linked_debt_id || null),
            next_due: f.next_due || null,
            notes: f.notes.trim() || null,
            clear_debt: clearDebt,
        })
        if (error) { setError(error.message); setSaving(false); return }
        onClose()
    }

    return (
        <Modal title="✏️ Editar pago recurrente" onClose={onClose} width={460}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}

                <Field label="Nombre *">
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
                </Field>

                <div className="g2">
                    <Field label="Monto (CAD) *">
                        <Input type="number" value={f.amount}
                            onChange={e => setF(p => ({ ...p, amount: e.target.value }))} min="0" step="0.01" />
                    </Field>
                    <Field label="Frecuencia">
                        <Select value={f.frequency} onChange={e => setF(p => ({ ...p, frequency: e.target.value }))}>
                            {FREQ.map(fr => <option key={fr.id} value={fr.id}>{fr.label}</option>)}
                        </Select>
                    </Field>
                </div>

                <Field label="Categoría">
                    <Select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                        {EXPENSE_CATS.map(c => <option key={c} value={c}>{t.cats?.[c] || c}</option>)}
                    </Select>
                </Field>

                {/* Cuenta unificada */}
                <Field label="Cuenta o tarjeta *">
                    <Select value={f.account_id} onChange={e => setF(p => ({ ...p, account_id: e.target.value }))}>
                        <option value="">— Seleccionar cuenta —</option>
                        {assetAccounts.length > 0 && (
                            <optgroup label="🏦 Débito / Ahorro">
                                {assetAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {creditAccounts.length > 0 && (
                            <optgroup label="💳 Tarjeta de crédito">
                                {creditAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        💳 {a.name}{a.last_four ? ` ···${a.last_four}` : ''}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </Select>
                    {selectedAccount && (
                        <div style={{
                            fontSize: 10, marginTop: 3,
                            color: selectedIsCredit ? 'var(--red)' : 'var(--green)'
                        }}>
                            {selectedIsCredit
                                ? '💳 Crédito — el pago aumenta la deuda de la tarjeta'
                                : '🏦 Débito — el pago se descuenta del saldo'}
                        </div>
                    )}
                </Field>

                {/* Deuda vinculada */}
                <Field label="Deuda vinculada (opcional)">
                    {rec.linked_debt_id && !clearDebt ? (
                        <div style={{
                            background: 'var(--orange)0a', border: '1px solid var(--orange)33',
                            borderRadius: 'var(--radius-sm)', padding: '9px 12px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>
                                    ↺ Vinculado: {rec.linked_debt_name || debts.find(d => d.id === rec.linked_debt_id)?.name || 'Deuda'}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                    Al marcar pagado, abona automáticamente a esta deuda
                                </div>
                            </div>
                            <Btn size="xs" variant="danger" onClick={() => setClearDebt(true)}>
                                Desvincular
                            </Btn>
                        </div>
                    ) : clearDebt ? (
                        <div style={{
                            background: 'var(--red)0a', border: '1px solid var(--red)33',
                            borderRadius: 'var(--radius-sm)', padding: '9px 12px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: 12,
                        }}>
                            <span style={{ color: 'var(--red)' }}>
                                ⚠️ La deuda se desvinculará al guardar
                            </span>
                            <Btn size="xs" variant="ghost" onClick={() => setClearDebt(false)}>
                                Cancelar
                            </Btn>
                        </div>
                    ) : (
                        <Select value={f.linked_debt_id}
                            onChange={e => setF(p => ({ ...p, linked_debt_id: e.target.value }))}>
                            <option value="">— Sin deuda vinculada —</option>
                            {activeDebts.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} · {
                                        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
                                            .format(d.total_amount - d.paid_amount)
                                    } restante
                                </option>
                            ))}
                        </Select>
                    )}
                    {selectedDebt && !clearDebt && !rec.linked_debt_id && (
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                            Al marcar pagado, abonará {f.amount ? `$${parseFloat(f.amount).toFixed(0)}` : 'el monto'}
                            a la deuda {selectedDebt.name}
                        </div>
                    )}
                </Field>

                <Field label="Próximo pago">
                    <Input type="date" value={f.next_due}
                        onChange={e => setF(p => ({ ...p, next_due: e.target.value }))} />
                </Field>

                <Field label="Notas">
                    <Input value={f.notes}
                        onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.amount || !f.account_id} />
            </div>
        </Modal>
    )
}

// ── EditSavingsGoalModal ──────────────────────────────────────────────────────
export function EditSavingsGoalModal({ goal, onClose }) {
    const { t, accounts, editGoal } = useApp()

    const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🏖', '🎓', '🛡️', '💍', '🎸', '⚽', '🌟']

    // Solo cuentas de activo para metas de ahorro
    const savingsAccounts = accounts.filter(a => a.is_active && !isCred(a.subtype))

    const [f, setF] = useState({
        name: goal.name,
        target_amount: String(goal.target_amount),
        emoji: goal.emoji || '🎯',
        color: goal.color || '#4f7cff',
        deadline: goal.deadline || '',
        account_id: goal.account_id || '',
        notes: goal.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.target_amount || parseFloat(f.target_amount) <= 0) {
            setError('El monto objetivo debe ser mayor que cero'); return
        }
        setSaving(true)
        const { error } = await editGoal(goal.id, {
            name: f.name.trim(),
            target_amount: parseFloat(f.target_amount),
            emoji: f.emoji,
            color: f.color,
            deadline: f.deadline || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        onClose()
    }

    return (
        <Modal title="✏️ Editar meta de ahorro" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}

                <Field label="Emoji">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => setF(p => ({ ...p, emoji: e }))} style={{
                                width: 36, height: 36, borderRadius: 8, fontSize: 20,
                                border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                background: f.emoji === e ? 'var(--blue)12' : 'transparent', cursor: 'pointer',
                            }}>{e}</button>
                        ))}
                    </div>
                </Field>

                <Field label="Nombre *">
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
                </Field>

                <div className="g2">
                    <Field label="Monto objetivo (CAD) *">
                        <Input type="number" value={f.target_amount}
                            onChange={e => setF(p => ({ ...p, target_amount: e.target.value }))} min="0" />
                    </Field>
                    <Field label="Fecha límite">
                        <Input type="date" value={f.deadline}
                            onChange={e => setF(p => ({ ...p, deadline: e.target.value }))} />
                    </Field>
                </div>

                <Field label="Cuenta asociada (opcional)">
                    <Select value={f.account_id} onChange={e => setF(p => ({ ...p, account_id: e.target.value }))}>
                        <option value="">— Sin cuenta —</option>
                        {savingsAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                {a.owner_name ? ` (${a.owner_name})` : ''}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Color">
                    <ColorPicker colors={ACC_COLORS} selected={f.color}
                        onChange={c => setF(p => ({ ...p, color: c }))} />
                </Field>

                <Field label="Notas">
                    <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.target_amount} />
            </div>
        </Modal>
    )
}

// ── EditAccountModal ──────────────────────────────────────────────────────────
/**
 * Edita una cuenta existente (activo o crédito).
 * Solo muestra campos relevantes según el subtype actual de la cuenta.
 */
export function EditAccountModal({ account, onClose }) {
    const { t, editAccount, isFamilyAdmin } = useApp()

    if (!isFamilyAdmin) {
        return (
            <Modal title="Sin permiso" onClose={onClose}>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Solo el administrador puede editar cuentas.
                </p>
                <Btn variant="ghost" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
                    Cerrar
                </Btn>
            </Modal>
        )
    }

    const isCredit = isCred(account.subtype)
    const subtypeConfig = ACCOUNT_SUBTYPES[account.subtype]

    const [f, setF] = useState({
        name: account.name,
        color: account.color || '#4f7cff',
        institution: account.institution || '',
        credit_limit: String(account.credit_limit || ''),
        notes: account.notes || '',
        is_active: account.is_active !== false,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (isCredit && (!f.credit_limit || parseFloat(f.credit_limit) <= 0)) {
            setError('El límite de crédito es requerido'); return
        }
        setSaving(true)
        const { error } = await editAccount(account.id, {
            name: f.name.trim(),
            color: f.color,
            institution: f.institution.trim() || null,
            credit_limit: isCredit ? parseFloat(f.credit_limit) : undefined,
            notes: f.notes.trim() || null,
            is_active: f.is_active,
        })
        if (error) { setError(error.message); setSaving(false); return }
        onClose()
    }

    return (
        <Modal title={`✏️ Editar ${subtypeConfig?.label || 'cuenta'}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}

                {/* Badge del tipo */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isCredit ? 'var(--red)0a' : 'var(--blue)0a',
                    border: `1px solid ${isCredit ? 'var(--red)33' : 'var(--blue)33'}`,
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                }}>
                    <span style={{ fontSize: 20 }}>{subtypeConfig?.icon}</span>
                    <div>
                        <div style={{
                            fontSize: 12, fontWeight: 600,
                            color: isCredit ? 'var(--red)' : 'var(--blue)'
                        }}>
                            {subtypeConfig?.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {isCredit
                                ? 'Cuenta de crédito — los gastos aumentan la deuda'
                                : 'Cuenta de activo — los gastos reducen el saldo'}
                        </div>
                    </div>
                </div>

                <Field label="Nombre *">
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
                </Field>

                {/* Límite de crédito — solo para crédito */}
                {isCredit && (
                    <Field label="Límite de crédito (CAD) *">
                        <Input type="number" value={f.credit_limit}
                            onChange={e => setF(p => ({ ...p, credit_limit: e.target.value }))}
                            min="0" step="100" />
                    </Field>
                )}

                <Field label="Institución">
                    <Input value={f.institution}
                        onChange={e => setF(p => ({ ...p, institution: e.target.value }))}
                        placeholder="TD Bank, RBC, Scotiabank..." />
                </Field>

                <Field label="Color identificador">
                    <ColorPicker colors={ACC_COLORS} selected={f.color}
                        onChange={c => setF(p => ({ ...p, color: c }))} />
                </Field>

                <Field label="Notas">
                    <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>

                {/* Toggle activa/inactiva */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={f.is_active}
                        onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} />
                    Cuenta activa (visible en la app)
                </label>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim()} />
            </div>
        </Modal>
    )
}

// ── ErrMsg ─────────────────────────────────────────────────────────────────────
function ErrMsg({ msg }) {
    return (
        <div style={{
            background: 'var(--red)10', border: '1px solid var(--red)33',
            borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
        }}>
            ⚠️ {msg}
        </div>
    )
}