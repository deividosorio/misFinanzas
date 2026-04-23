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
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/ui/Modal'
import Btn from '../components/ui/Btn'
import { Field, Input, Select, ModalFooter, ColorPicker } from '../components/ui/Form'
import { INCOME_CATS, SAVING_CATS, ACC_COLORS, toDay } from '../lib/constants'

// ── Helper: llamar RPC y recargar datos ──────────────────────────────────────
async function callRPC(fnName, params, reload, isDemoMode) {
    if (!isDemoMode && supabase) {
        const { error } = await supabase.rpc(fnName, params)
        if (error) throw error
    }
    await reload()
}

// ── EditTxModal — Editar transacción ─────────────────────────────────────────
/**
 * Pre-llena todos los campos con los valores de la transacción existente.
 * Llama a rpc_update_transaction con los cambios.
 *
 * @param {object}   txn     - Transacción a editar
 * @param {function} onClose - Cerrar el modal
 */
export function EditTxModal({ txn, onClose }) {
    const { t, accounts, cards, reload, isDemoMode, setTxns } = useApp()

    const CATS = { income: INCOME_CATS, expense: EXPENSE_CATS, saving: SAVING_CATS }

    const [f, setF] = useState({
        type: txn.type,
        category: txn.category,
        description: txn.description || '',
        amount: String(txn.amount),
        date: txn.date,
        account_id: txn.account_id || '',
        payment_account_id: txn.payment_account_id || txn.payment_id || '',
        notes: txn.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (k, v) => setF(p => ({
        ...p, [k]: v,
        ...(k === 'type' ? { category: CATS[v][0] } : {}),
    }))

    const handleSave = async () => {
        if (!f.description || !f.amount) { setError('Completa descripción y monto'); return }
        setSaving(true); setError('')
        try {
            if (!isDemoMode && supabase) {
                await callRPC('rpc_update_transaction', {
                    p_txn_id: txn.id,
                    p_type: f.type,
                    p_category: f.category,
                    p_description: f.description,
                    p_amount: parseFloat(f.amount),
                    p_date: f.date,
                    p_account_id: f.account_id || null,
                    p_payment_account_id: f.payment_account_id || null,
                    p_notes: f.notes || null,
                }, reload, isDemoMode)
            } else {
                // Demo mode: actualizar estado local
                setTxns(prev => prev.map(tx => tx.id === txn.id
                    ? { ...tx, ...f, amount: parseFloat(f.amount) }
                    : tx
                ))
            }
            onClose()
        } catch (e) { setError(e.message) }
        setSaving(false)
    }

    return (
        <Modal title="✏️ Editar movimiento" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}

                <Field label={t.type}>
                    <div style={{ display: 'flex', gap: 5 }}>
                        {['income', 'expense', 'saving'].map(tp => (
                            <Btn key={tp} size="sm" variant={f.type === tp ? 'primary' : 'ghost'} style={{ flex: 1 }} onClick={() => set('type', tp)}>
                                {t[tp]}
                            </Btn>
                        ))}
                    </div>
                </Field>

                <Field label={t.category}>
                    <Select value={f.category} onChange={e => set('category', e.target.value)}>
                        {(CATS[f.type] || []).map(c => <option key={c} value={c}>{t.cats[c]}</option>)}
                    </Select>
                </Field>

                <Field label={t.account}>
                    <Select value={f.account_id} onChange={e => set('account_id', e.target.value)}>
                        <option value="">— Sin cuenta —</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.owner_name})</option>)}
                    </Select>
                </Field>

                {f.type === 'expense' && (
                    <Field label={t.paymentMethod}>
                        <Select value={f.payment_account_id} onChange={e => set('payment_account_id', e.target.value)}>
                            <option value="">— Sin forma de pago —</option>
                            {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.last_four ? ` ···${c.last_four}` : ''}</option>)}
                        </Select>
                    </Field>
                )}

                <Field label={t.description}>
                    <Input value={f.description} onChange={e => set('description', e.target.value)} />
                </Field>

                <div className="g2">
                    <Field label={`${t.amount} (CAD)`}>
                        <Input type="number" value={f.amount} onChange={e => set('amount', e.target.value)} min="0" step="0.01" />
                    </Field>
                    <Field label={t.date}>
                        <Input type="date" value={f.date} onChange={e => set('date', e.target.value)} />
                    </Field>
                </div>

                <Field label="Notas (opcional)">
                    <Input value={f.notes} onChange={e => set('notes', e.target.value)} />
                </Field>

                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'}
                    cancelLabel={t.cancel} disabled={saving || !f.description || !f.amount} />
            </div>
        </Modal>
    )
}

// ── EditDebtModal — Editar deuda ──────────────────────────────────────────────
export function EditDebtModal({ debt, onClose }) {
    const { t, reload, isDemoMode, setDebts } = useApp()
    const [f, setF] = useState({
        name: debt.name,
        total_amount: String(debt.total_amount ?? debt.totalDebt ?? ''),
        monthly_payment: String(debt.monthly_payment ?? debt.monthlyPayment ?? ''),
        interest_rate: String(debt.interest_rate ?? debt.interestRate ?? ''),
        start_date: debt.start_date ?? debt.startDate ?? toDay(),
        notes: debt.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.name) { setError('El nombre es requerido'); return }
        setSaving(true); setError('')
        try {
            if (!isDemoMode && supabase) {
                await callRPC('rpc_update_debt', {
                    p_debt_id: debt.id,
                    p_name: f.name,
                    p_total_amount: parseFloat(f.total_amount),
                    p_monthly_payment: parseFloat(f.monthly_payment),
                    p_interest_rate: parseFloat(f.interest_rate),
                    p_start_date: f.start_date || null,
                    p_notes: f.notes || null,
                }, reload, isDemoMode)
            } else {
                setDebts(prev => prev.map(d => d.id === debt.id
                    ? {
                        ...d, ...f,
                        total_amount: parseFloat(f.total_amount),
                        monthly_payment: parseFloat(f.monthly_payment),
                        interest_rate: parseFloat(f.interest_rate)
                    }
                    : d
                ))
            }
            onClose()
        } catch (e) { setError(e.message) }
        setSaving(false)
    }

    return (
        <Modal title="✏️ Editar deuda" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}
                <Field label="Nombre"><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></Field>
                <div className="g2">
                    <Field label="Monto total"><Input type="number" value={f.total_amount} onChange={e => setF(p => ({ ...p, total_amount: e.target.value }))} min="0" /></Field>
                    <Field label="Cuota mensual"><Input type="number" value={f.monthly_payment} onChange={e => setF(p => ({ ...p, monthly_payment: e.target.value }))} min="0" /></Field>
                    <Field label="Tasa de interés %"><Input type="number" value={f.interest_rate} onChange={e => setF(p => ({ ...p, interest_rate: e.target.value }))} min="0" step="0.01" /></Field>
                    <Field label="Fecha de inicio"><Input type="date" value={f.start_date} onChange={e => setF(p => ({ ...p, start_date: e.target.value }))} /></Field>
                </div>
                <Field label="Notas"><Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'} cancelLabel={t.cancel} disabled={saving || !f.name} />
            </div>
        </Modal>
    )
}

// ── EditRecurringModal — Editar pago recurrente ───────────────────────────────
export function EditRecurringModal({ rec, onClose }) {
    const { t, accounts, cards, reload, isDemoMode, setRecurring } = useApp()
    const allPM = [
        ...accounts.map(a => ({ ...a, label: `${a.name} (${a.owner_name})` })),
        ...cards.map(c => ({ ...c, label: `${c.name}${c.last_four ? ` ···${c.last_four}` : ''}` })),
    ]
    const [f, setF] = useState({
        name: rec.name,
        amount: String(rec.amount),
        frequency: rec.frequency,
        category: rec.category,
        account_id: rec.account_id || rec.pmId || '',
        next_due: rec.next_due ?? rec.nextDue ?? toDay(),
        notes: rec.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.name || !f.amount) { setError('Nombre y monto son requeridos'); return }
        setSaving(true); setError('')
        try {
            if (!isDemoMode && supabase) {
                await callRPC('rpc_update_recurring', {
                    p_rec_id: rec.id,
                    p_name: f.name,
                    p_amount: parseFloat(f.amount),
                    p_frequency: f.frequency,
                    p_category: f.category,
                    p_next_due: f.next_due || null,
                    p_notes: f.notes || null,
                }, reload, isDemoMode)
            } else {
                setRecurring(prev => prev.map(r => r.id === rec.id
                    ? { ...r, ...f, amount: parseFloat(f.amount), next_due: f.next_due }
                    : r
                ))
            }
            onClose()
        } catch (e) { setError(e.message) }
        setSaving(false)
    }

    return (
        <Modal title="✏️ Editar pago recurrente" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}
                <Field label="Nombre"><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></Field>
                <div className="g2">
                    <Field label="Monto (CAD)"><Input type="number" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} min="0" /></Field>
                    <Field label="Frecuencia">
                        <Select value={f.frequency} onChange={e => setF(p => ({ ...p, frequency: e.target.value }))}>
                            {['monthly', 'biweekly', 'weekly', 'yearly'].map(fr => <option key={fr} value={fr}>{t[fr]}</option>)}
                        </Select>
                    </Field>
                </div>
                <Field label="Categoría">
                    <Select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                        {EXPENSE_CATS.map(c => <option key={c} value={c}>{t.cats[c]}</option>)}
                    </Select>
                </Field>
                <Field label="Cuenta / Forma de pago">
                    <Select value={f.account_id} onChange={e => setF(p => ({ ...p, account_id: e.target.value }))}>
                        <option value="">—</option>
                        {allPM.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </Select>
                </Field>
                <Field label="Próximo pago"><Input type="date" value={f.next_due} onChange={e => setF(p => ({ ...p, next_due: e.target.value }))} /></Field>
                <Field label="Notas"><Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'} cancelLabel={t.cancel} disabled={saving || !f.name || !f.amount} />
            </div>
        </Modal>
    )
}

// ── EditSavingsGoalModal — Editar meta de ahorro ──────────────────────────────
export function EditSavingsGoalModal({ goal, onClose }) {
    const { t, reload, isDemoMode, setGoals } = useApp()
    const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🏖', '🎓', '🛡️', '💍', '🎸', '⚽', '🌟']
    const [f, setF] = useState({
        name: goal.name,
        target_amount: String(goal.target ?? goal.target_amount ?? ''),
        emoji: goal.emoji || '🎯',
        color: goal.color || '#4f7cff',
        deadline: goal.deadline || '',
        notes: goal.notes || '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.name || !f.target_amount) { setError('Nombre y meta son requeridos'); return }
        setSaving(true); setError('')
        try {
            if (!isDemoMode && supabase) {
                await callRPC('rpc_update_savings_goal', {
                    p_goal_id: goal.id,
                    p_name: f.name,
                    p_target_amount: parseFloat(f.target_amount),
                    p_emoji: f.emoji,
                    p_color: f.color,
                    p_deadline: f.deadline || null,
                    p_notes: f.notes || null,
                }, reload, isDemoMode)
            } else {
                setGoals(prev => prev.map(g => g.id === goal.id
                    ? { ...g, ...f, target: parseFloat(f.target_amount), target_amount: parseFloat(f.target_amount) }
                    : g
                ))
            }
            onClose()
        } catch (e) { setError(e.message) }
        setSaving(false)
    }

    return (
        <Modal title="✏️ Editar meta de ahorro" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}
                <Field label="Emoji">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => setF(p => ({ ...p, emoji: e }))} style={{
                                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                                border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                background: f.emoji === e ? 'var(--blue)18' : 'transparent', cursor: 'pointer',
                            }}>{e}</button>
                        ))}
                    </div>
                </Field>
                <Field label="Nombre de la meta"><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></Field>
                <div className="g2">
                    <Field label="Monto objetivo (CAD)"><Input type="number" value={f.target_amount} onChange={e => setF(p => ({ ...p, target_amount: e.target.value }))} min="0" /></Field>
                    <Field label="Fecha límite (opcional)"><Input type="date" value={f.deadline} onChange={e => setF(p => ({ ...p, deadline: e.target.value }))} /></Field>
                </div>
                <Field label="Color">
                    <ColorPicker colors={ACC_COLORS} selected={f.color} onChange={c => setF(p => ({ ...p, color: c }))} />
                </Field>
                <Field label="Notas"><Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} /></Field>
                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'} cancelLabel={t.cancel} disabled={saving || !f.name || !f.target_amount} />
            </div>
        </Modal>
    )
}

// ── EditAccountModal — Editar cuenta/tarjeta (solo admin) ────────────────────
export function EditAccountModal({ account, onClose }) {
    const { t, reload, isDemoMode, setAccounts, isFamilyAdmin } = useApp()

    if (!isFamilyAdmin) {
        return (
            <Modal title="Sin permiso" onClose={onClose}>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Solo el administrador puede editar cuentas.</p>
            </Modal>
        )
    }

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
        if (!f.name) { setError('El nombre es requerido'); return }
        setSaving(true); setError('')
        try {
            if (!isDemoMode && supabase) {
                await callRPC('rpc_update_account', {
                    p_account_id: account.id,
                    p_name: f.name,
                    p_color: f.color,
                    p_institution: f.institution || null,
                    p_credit_limit: f.credit_limit ? parseFloat(f.credit_limit) : null,
                    p_notes: f.notes || null,
                    p_is_active: f.is_active,
                }, reload, isDemoMode)
            } else {
                setAccounts(prev => prev.map(a => a.id === account.id
                    ? { ...a, ...f, credit_limit: f.credit_limit ? parseFloat(f.credit_limit) : null }
                    : a
                ))
            }
            onClose()
        } catch (e) { setError(e.message) }
        setSaving(false)
    }

    return (
        <Modal title="✏️ Editar cuenta" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {error && <ErrMsg msg={error} />}
                <Field label="Nombre"><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></Field>
                {account.credit_limit !== undefined && (
                    <Field label="Límite de crédito (CAD)">
                        <Input type="number" value={f.credit_limit} onChange={e => setF(p => ({ ...p, credit_limit: e.target.value }))} min="0" />
                    </Field>
                )}
                <Field label="Institución">
                    <Input value={f.institution} onChange={e => setF(p => ({ ...p, institution: e.target.value }))} placeholder="TD Bank, RBC..." />
                </Field>
                <Field label="Color">
                    <ColorPicker colors={ACC_COLORS} selected={f.color} onChange={c => setF(p => ({ ...p, color: c }))} />
                </Field>
                <Field label="Notas">
                    <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="is_active" checked={f.is_active}
                        onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} />
                    <label htmlFor="is_active" style={{ fontSize: 13, cursor: 'pointer' }}>
                        Cuenta activa (visible en la app)
                    </label>
                </div>
                <ModalFooter onClose={onClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Guardar cambios'} cancelLabel={t.cancel} disabled={saving || !f.name} />
            </div>
        </Modal>
    )
}

// ── ErrMsg — Mensaje de error inline ─────────────────────────────────────────
function ErrMsg({ msg }) {
    return (
        <div style={{
            background: 'var(--red)14', border: '1px solid var(--red)33',
            borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
        }}>
            ⚠️ {msg}
        </div>
    )
}

// Export para EXPENSE_CATS (needed by EditRecurringModal)
const { EXPENSE_CATS } = await import('../lib/constants').catch(() => ({
    EXPENSE_CATS: ['food', 'housing', 'transport', 'health', 'entertainment', 'education',
        'clothing', 'utilities', 'insurance', 'mortgage', 'car', 'other_expense']
}))