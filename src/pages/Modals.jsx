// src/pages/Modals.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Todos los formularios modales de la aplicación.
//
// Los modales se definen aquí (centralizados) y se renderizan desde App.jsx
// según el valor de `modal` en el contexto. Esto evita problemas de z-index
// y permite abrir cualquier modal desde cualquier parte del árbol de componentes.
//
// MODALES EXPORTADOS:
//   TxModal       → Nueva transacción (ingreso / gasto / ahorro)
//   AccModal      → Nueva cuenta bancaria
//   PmModal       → Nueva forma de pago (tarjeta, efectivo, etc.)
//   DebtModal     → Nueva deuda (hipoteca, auto, etc.)
//   RecurringModal→ Nuevo pago recurrente
//   GoalModal     → Nueva meta de ahorro (adultos)
//   KidGoalModal  → Nueva meta de ahorro (niños, con emoji y color)
//   ImportCSVModal→ Importar transacciones desde CSV bancario
//
// PATRÓN DE CADA MODAL:
//   1. Estado local con los campos del formulario (useState)
//   2. Función set() para actualizar campos (spread pattern)
//   3. Función handleSave() que valida y llama a la mutación del contexto
//   4. Renderiza <Modal> con <Field>/<Input>/<Select> y <ModalFooter>
//
// VALIDACIÓN:
//   Simple (campos requeridos no vacíos). En producción se puede agregar
//   react-hook-form o zod para validación más robusta.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import {
    Modal, Field, Input, Select, ModalFooter,
    Btn, ColorPicker,
} from '../components/ui/index'
import {
    INCOME_CATS, EXPENSE_CATS, SAVING_CATS,
    ACC_COLORS, ACCOUNT_TYPES, PAYMENT_TYPES,
    toDay,
} from '../lib/constants'

// ── TxModal — Nueva transacción ───────────────────────────────────────────────
/**

- Formulario para registrar un ingreso, gasto o ahorro.
- 
- Campos:
- - Tipo (income/expense/saving) → determina las categorías disponibles
- - Categoría → lista según el tipo
- - Cuenta → de cuál cuenta bancaria
- - Forma de pago → solo visible para gastos (qué tarjeta/efectivo)
- - Descripción → texto libre
- - Monto (CAD)
- - Fecha → default: hoy
- - Notas → opcional
    */
export function TxModal() {
    const { t, accounts, cards, addTxn, closeModal } = useApp()

    // Estado inicial del formulario
    const [f, setF] = useState({
        type: 'expense',
        category: 'food',
        account_id: accounts[0]?.id || '',
        payment_id: '',
        description: '',
        amount: '',
        date: toDay(),
        notes: '',
    })

    // Categorías disponibles según el tipo seleccionado
    const CATS_BY_TYPE = {
        income: INCOME_CATS,
        expense: EXPENSE_CATS,
        saving: SAVING_CATS,
    }

    // Actualizador de campo con reset de categoría al cambiar tipo
    const set = (key, value) => {
        setF(prev => ({
            ...prev,
            [key]: value,
            // Al cambiar tipo, resetear categoría al primero disponible
            ...(key === 'type' ? { category: CATS_BY_TYPE[value][0] } : {}),
        }))
    }

    const handleSave = async () => {
        if (!f.description || !f.amount) return
        await addTxn({ ...f, amount: parseFloat(f.amount) })
        closeModal()
    }

    return (
        <Modal title={`+ ${t.addTransaction}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>


                {/* Selector de tipo: 3 botones toggle */}
                <Field label={t.type}>
                    <div style={{ display: 'flex', gap: 5 }}>
                        {['income', 'expense', 'saving'].map(tp => (
                            <Btn
                                key={tp}
                                size="sm"
                                variant={f.type === tp ? 'primary' : 'ghost'}
                                style={{ flex: 1 }}
                                onClick={() => set('type', tp)}
                            >
                                {t[tp]}
                            </Btn>
                        ))}
                    </div>
                </Field>

                {/* Categoría (depende del tipo) */}
                <Field label={t.category}>
                    <Select value={f.category} onChange={e => set('category', e.target.value)}>
                        {CATS_BY_TYPE[f.type].map(c => (
                            <option key={c} value={c}>{t.cats[c]}</option>
                        ))}
                    </Select>
                </Field>

                {/* Cuenta bancaria */}
                <Field label={t.account}>
                    <Select value={f.account_id} onChange={e => set('account_id', e.target.value)}>
                        <option value="">— Seleccionar cuenta —</option>
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.name} ({a.owner_name})
                            </option>
                        ))}
                    </Select>
                </Field>

                {/* Forma de pago (solo para gastos) */}
                {f.type === 'expense' && (
                    <Field label={t.paymentMethod}>
                        <Select value={f.payment_id} onChange={e => set('payment_id', e.target.value)}>
                            <option value="">— Seleccionar forma de pago —</option>
                            {cards.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}{c.last_four ? ` ···${c.last_four}` : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}

                {/* Descripción */}
                <Field label={t.description}>
                    <Input
                        value={f.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder="Ej: IGA Supermercado, Salario Mayo..."
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                    />
                </Field>

                {/* Monto y Fecha en grid de 2 columnas */}
                <div className="g2">
                    <Field label={`${t.amount} (CAD)`}>
                        <Input
                            type="number"
                            value={f.amount}
                            onChange={e => set('amount', e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                        />
                    </Field>
                    <Field label={t.date}>
                        <Input
                            type="date"
                            value={f.date}
                            onChange={e => set('date', e.target.value)}
                        />
                    </Field>
                </div>

                {/* Notas opcionales */}
                <Field label={`${t.notes} (opcional)`}>
                    <Input
                        value={f.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Notas adicionales..."
                    />
                </Field>

                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.description || !f.amount}
                />
            </div>
        </Modal>


    )
}

// ── AccModal — Nueva cuenta bancaria ──────────────────────────────────────────
/**

- Crea una nueva cuenta bancaria (activo en el Balance General).
- En producción llama a rpc_add_asset_account que también crea el
- asiento de saldo inicial si opening_balance > 0.
  */
export function AccModal() {
    const { t, closeModal, setAccounts } = useApp()
    const [f, setF] = useState({
        name: '',
        owner_name: '',
        type: 'savings',
        color: '#4f7cff',
        institution: '',
        opening_balance: 0,
    })
    const set = (k, v) => setF(p => ({ ...p, [k]: v }))

    const handleSave = () => {
        if (!f.name || !f.owner_name) return
        // En producción: await supabase.rpc('rpc_add_asset_account', {...})
        setAccounts(prev => [...prev, { ...f, id: 'acc-' + Date.now(), balance: f.opening_balance, total_income: 0, total_expense: 0 }])
        closeModal()
    }

    return (
        <Modal title={`+ ${t.addAccount}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div className="g2">
                    <Field label={t.accountName}>
                        <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="TD Savings" />
                    </Field>
                    <Field label={t.accountOwner}>
                        <Input value={f.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Deivid" />
                    </Field>
                </div>


                <Field label={t.type}>
                    <Select value={f.type} onChange={e => set('type', e.target.value)}>
                        {ACCOUNT_TYPES.map(tp => (
                            <option key={tp} value={tp}>{t.types?.[tp] || tp}</option>
                        ))}
                    </Select>
                </Field>

                <Field label={t.institution}>
                    <Input value={f.institution} onChange={e => set('institution', e.target.value)} placeholder="TD Bank" />
                </Field>

                <Field label={t.openingBalance}>
                    <Input
                        type="number"
                        value={f.opening_balance}
                        onChange={e => set('opening_balance', parseFloat(e.target.value) || 0)}
                        min="0"
                        placeholder="Saldo actual de la cuenta"
                    />
                </Field>

                <Field label={t.color}>
                    <ColorPicker colors={ACC_COLORS} selected={f.color} onChange={c => set('color', c)} />
                </Field>

                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.name || !f.owner_name}
                />
            </div>
        </Modal>


    )
}

// ── PmModal — Nueva forma de pago ─────────────────────────────────────────────
/**

- Crea una tarjeta de crédito, débito, línea de crédito u otra forma de pago.
- Los campos de últimos 4 dígitos y límite solo aparecen para tarjetas/líneas.
  */
export function PmModal() {
    const { t, closeModal, setCards } = useApp()
    const [f, setF] = useState({
        name: '',
        type: 'credit_card',
        last_four: '',
        credit_limit: '',
        color: '#ff6b6b',
    })
    const set = (k, v) => setF(p => ({ ...p, [k]: v }))
    const showCardFields = ['credit_card', 'debit_card', 'credit_line'].includes(f.type)

    const handleSave = () => {
        if (!f.name) return
        setCards(prev => [...prev, {
            ...f,
            id: 'pm-' + Date.now(),
            credit_limit: parseFloat(f.credit_limit) || undefined,
            month_spent: 0,
        }])
        closeModal()
    }

    return (
        <Modal title={`+ ${t.addPaymentMethod}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div className="g2">
                    <Field label={t.accountName}>
                        <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="TD Visa" />
                    </Field>
                    <Field label={t.type}>
                        <Select value={f.type} onChange={e => set('type', e.target.value)}>
                            {PAYMENT_TYPES.map(tp => (
                                <option key={tp} value={tp}>{t[tp] || tp}</option>
                            ))}
                        </Select>
                    </Field>
                </div>


                {/* Campos adicionales solo para tarjetas */}
                {showCardFields && (
                    <div className="g2">
                        <Field label={t.lastFour}>
                            <Input
                                value={f.last_four}
                                onChange={e => set('last_four', e.target.value)}
                                maxLength={4}
                                placeholder="4521"
                            />
                        </Field>
                        <Field label={t.creditLimit}>
                            <Input
                                type="number"
                                value={f.credit_limit}
                                onChange={e => set('credit_limit', e.target.value)}
                                placeholder="8000"
                                min="0"
                            />
                        </Field>
                    </div>
                )}

                <Field label={t.color}>
                    <ColorPicker colors={ACC_COLORS} selected={f.color} onChange={c => set('color', c)} />
                </Field>

                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.name}
                />
            </div>
        </Modal>


    )
}

// ── DebtModal — Nueva deuda ───────────────────────────────────────────────────
/**

- Registra una nueva deuda (hipoteca, auto, préstamo personal, etc.).
- En producción, rpc_add_liability_account crea el asiento contable
- inicial en el modelo de doble entrada.
  */
export function DebtModal() {
    const { t, closeModal, setDebts } = useApp()
    const [f, setF] = useState({
        name: '',
        total_amount: '',
        paid_amount: '0',
        monthly_payment: '',
        interest_rate: '',
        start_date: toDay(),
    })
    const set = (k, v) => setF(p => ({ ...p, [k]: v }))

    const handleSave = () => {
        if (!f.name || !f.total_amount) return
        setDebts(prev => [...prev, {
            ...f,
            id: 'd-' + Date.now(),
            total_amount: parseFloat(f.total_amount),
            paid_amount: parseFloat(f.paid_amount || '0'),
            monthly_payment: parseFloat(f.monthly_payment || '0'),
            interest_rate: parseFloat(f.interest_rate || '0'),
        }])
        closeModal()
    }

    return (
        <Modal title={`+ ${t.addDebt}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Field label={t.debtName}>
                    <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Hipoteca TD" />
                </Field>
                <div className="g2">
                    <Field label={t.totalDebt}>
                        <Input type="number" value={f.total_amount} onChange={e => set('total_amount', e.target.value)} placeholder="320000" min="0" />
                    </Field>
                    <Field label={t.paidAmount}>
                        <Input type="number" value={f.paid_amount} onChange={e => set('paid_amount', e.target.value)} placeholder="0" min="0" />
                    </Field>
                    <Field label={t.monthlyPayment}>
                        <Input type="number" value={f.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} placeholder="1850" min="0" />
                    </Field>
                    <Field label={t.interestRate}>
                        <Input type="number" value={f.interest_rate} onChange={e => set('interest_rate', e.target.value)} placeholder="4.5" min="0" step="0.01" />
                    </Field>
                </div>
                <Field label={t.startDate}>
                    <Input type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} />
                </Field>
                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.name || !f.total_amount}
                />
            </div>
        </Modal>
    )
}

// ── RecurringModal — Nuevo pago recurrente ────────────────────────────────────
/**

- Configura un pago que se repite periódicamente.
- Permite seleccionar cuenta O tarjeta como forma de pago.
  */
export function RecurringModal() {
    const { t, accounts, cards, closeModal, setRecurring } = useApp()

    // Combinar cuentas y tarjetas en una sola lista para el selector
    const allPaymentMethods = [
        ...accounts.map(a => ({ ...a, kind: 'acc', label: `${a.name} (${a.owner_name})` })),
        ...cards.map(c => ({ ...c, kind: 'pm', label: `${c.name}${c.last_four ? ` ···${c.last_four}` : ''}` })),
    ]

    const [f, setF] = useState({
        name: '',
        amount: '',
        frequency: 'monthly',
        category: 'utilities',
        pm_id: allPaymentMethods[0]?.id || '',
        next_due: toDay(),
    })
    const set = (k, v) => setF(p => ({ ...p, [k]: v }))

    const handleSave = () => {
        if (!f.name || !f.amount) return
        setRecurring(prev => [...prev, { ...f, id: 'r-' + Date.now(), amount: parseFloat(f.amount) }])
        closeModal()
    }

    return (
        <Modal title={`+ ${t.addRecurring}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Field label={t.recurringName}>
                    <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Hydro-Québec" />
                </Field>
                <div className="g2">
                    <Field label={`${t.amount} (CAD)`}>
                        <Input type="number" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="110" min="0" />
                    </Field>
                    <Field label={t.frequency}>
                        <Select value={f.frequency} onChange={e => set('frequency', e.target.value)}>
                            {['monthly', 'biweekly', 'weekly', 'yearly'].map(fr => (
                                <option key={fr} value={fr}>{t[fr]}</option>
                            ))}
                        </Select>
                    </Field>
                </div>
                <Field label={t.category}>
                    <Select value={f.category} onChange={e => set('category', e.target.value)}>
                        {EXPENSE_CATS.map(c => (
                            <option key={c} value={c}>{t.cats[c]}</option>
                        ))}
                    </Select>
                </Field>
                <Field label={`${t.account} / ${t.paymentMethod}`}>
                    <Select value={f.pm_id} onChange={e => set('pm_id', e.target.value)}>
                        {allPaymentMethods.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                    </Select>
                </Field>
                <Field label={t.nextDue}>
                    <Input type="date" value={f.next_due} onChange={e => set('next_due', e.target.value)} />
                </Field>
                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.name || !f.amount}
                />
            </div>
        </Modal>
    )
}

// ── GoalModal — Nueva meta de ahorro (adultos) ────────────────────────────────
export function GoalModal() {
    const { t, closeModal, setGoals } = useApp()
    const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🏖', '🎓', '🛡️', '💍', '🎸', '⚽', '🌟', '🎭', '🍕', '🏕']
    const [f, setF] = useState({ name: '', target: 0, current: 0, emoji: '🎯', color: '#4f7cff' })

    return (
        <Modal title={`+ ${t.addGoal}`} onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {/* Selector de emoji */}
                <Field label="Emoji">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button
                                key={e}
                                onClick={() => setF(p => ({ ...p, emoji: e }))}
                                style={{
                                    width: 36, height: 36, borderRadius: 8, fontSize: 18,
                                    border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                    background: f.emoji === e ? 'var(--blue)18' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label={t.goalName}>
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} placeholder="Vacaciones 2025" />
                </Field>
                <div className="g2">
                    <Field label={t.targetAmount}>
                        <Input type="number" value={f.target} onChange={e => setF(p => ({ ...p, target: parseFloat(e.target.value) || 0 }))} min="0" />
                    </Field>
                    <Field label={t.currentAmount}>
                        <Input type="number" value={f.current} onChange={e => setF(p => ({ ...p, current: parseFloat(e.target.value) || 0 }))} min="0" />
                    </Field>
                </div>
                <ModalFooter
                    onClose={closeModal}
                    onSave={() => {
                        if (!f.name || !f.target) return
                        setGoals(prev => [...prev, { ...f, id: 'g-' + Date.now() }])
                        closeModal()
                    }}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.name || !f.target}
                />
            </div >
        </Modal >
    )
}

// ── KidGoalModal — Nueva meta de ahorro (niños) ───────────────────────────────
/**

- Crea una meta gamificada para un niño específico de la familia.
- Incluye selector de niño, emoji, color y mensaje de ánimo.
  */
export function KidGoalModal() {
    const { t, kids, closeModal, setKidsGoals } = useApp()
    const EMOJIS = ['⭐', '🎮', '🚲', '🎯', '🏀', '🎸', '📚', '🦋', '🌈', '🎪', '🚀', '💎', '🐉', '🎠']
    const COLORS = ['#fbbf24', '#818cf8', '#2dd4a0', '#ff6b6b', '#38bdf8', '#f472b6', '#a78bfa']

    const [f, setF] = useState({
        kid_profile: kids[0]?.id || '',
        name: '',
        target_amount: '',
        emoji: '⭐',
        color: '#fbbf24',
        reward_text: '',
    })
    const set = (k, v) => setF(p => ({ ...p, [k]: v }))

    const handleSave = () => {
        if (!f.kid_profile || !f.name || !f.target_amount) return
        const kid = kids.find(k => k.id === f.kid_profile)
        setKidsGoals(prev => [...prev, {
            ...f,
            id: 'kg-' + Date.now(),
            kid_name: kid?.display_name || '',
            target_amount: parseFloat(f.target_amount),
            current_amount: 0,
            status: 'active',
        }])
        closeModal()
    }

    return (
        <Modal title="⭐ Nueva meta para un niño" onClose={closeModal}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {/* Selector de niño */}
                <Field label="Niño/a">
                    <Select value={f.kid_profile} onChange={e => set('kid_profile', e.target.value)}>
                        <option value="">— Seleccionar niño/a —</option>
                        {kids.map(k => (
                            <option key={k.id} value={k.id}>{k.avatar_emoji} {k.display_name}</option>
                        ))}
                    </Select>
                </Field>


                {/* Selector de emoji para la meta */}
                <Field label="Emoji de la meta">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button
                                key={e}
                                onClick={() => set('emoji', e)}
                                style={{
                                    width: 36, height: 36, borderRadius: 8, fontSize: 18,
                                    border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                    background: f.emoji === e ? 'var(--blue)18' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </Field>

                {/* Selector de color */}
                <Field label={t.color}>
                    <ColorPicker colors={COLORS} selected={f.color} onChange={c => set('color', c)} />
                </Field>

                <Field label="Nombre de la meta">
                    <Input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nintendo Switch" />
                </Field>

                <Field label="Monto objetivo (CAD)">
                    <Input type="number" value={f.target_amount} onChange={e => set('target_amount', e.target.value)} placeholder="350" min="0" />
                </Field>

                <Field label="Mensaje de ánimo">
                    <Input value={f.reward_text} onChange={e => set('reward_text', e.target.value)} placeholder="¡Tú puedes lograrlo! 💪" />
                </Field>

                <ModalFooter
                    onClose={closeModal}
                    onSave={handleSave}
                    saveLabel={t.save}
                    cancelLabel={t.cancel}
                    disabled={!f.kid_profile || !f.name || !f.target_amount}
                />
            </div>
        </Modal>


    )
}

// ── ImportCSVModal — Importar transacciones desde CSV ─────────────────────────
/**

- Permite importar transacciones desde un archivo CSV exportado del banco.
- 
- Bancos canadienses que exportan en CSV compatible:
- - TD Bank: Activity > Download > CSV
- - RBC: Transaction History > Download
- - Scotiabank: Account Activity > Export
- 
- Formato esperado: fecha,descripción,monto
- (la primera fila de encabezados se ignora automáticamente)
- 
- Las transacciones se importan como 'expense' por defecto.
- El usuario puede editar individualmente después si es ingreso.
  */
export function ImportCSVModal() {
    const { t, closeModal, setTxns } = useApp()
    const [preview, setPreview] = useState([])
    const [fileName, setFileName] = useState('')
    const [parseError, setParseError] = useState('')

    const handleFile = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setParseError('')


        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const lines = (ev.target.result || '').split('\n').filter(Boolean)

                // Detectar y saltar la fila de encabezados
                const dataLines = lines[0]?.toLowerCase().includes('date') || lines[0]?.toLowerCase().includes('fecha')
                    ? lines.slice(1)
                    : lines

                const parsed = dataLines
                    .map((line, i) => {
                        // Manejar campos entre comillas (ej: "IGA, Montréal")
                        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
                        return {
                            id: 'csv-' + i + '-' + Date.now(),
                            date: cols[0] || toDay(),
                            description: cols[1] || 'Transacción importada',
                            amount: parseFloat(cols[2]) || 0,
                            type: 'expense',
                            category: 'other_expense',
                        }
                    })
                    .filter(r => r.date && r.description && r.amount !== 0)

                if (parsed.length === 0) {
                    setParseError('No se encontraron transacciones válidas. Verifica el formato del archivo.')
                    return
                }

                setPreview(parsed.slice(0, 5)) // Mostrar primeras 5 como preview
            } catch {
                setParseError('Error al leer el archivo. Asegúrate de que sea un CSV válido.')
            }
        }
        reader.readAsText(file, 'UTF-8')


    }

    const handleImport = () => {
        if (!preview.length) return
        setTxns(prev => [...preview, ...prev])
        closeModal()
    }

    return (
        <Modal title={`📂 ${t.importCSV}`} onClose={closeModal} width={480}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>


                {/* Instrucciones de formato */}
                <div style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 12,
                    lineHeight: 1.8,
                }}>
                    <strong>Formato esperado:</strong><br />
                    <code>fecha,descripción,monto</code><br />
                    <code>2025-05-01,IGA Supermercado,320.50</code><br />
                    <br />
                    <strong>Bancos compatibles:</strong> TD, RBC, Scotiabank, Desjardins<br />
                    Usa "Download / Télécharger" en tu banco en línea → selecciona CSV
                </div>

                {/* Input de archivo */}
                <Field label="Archivo CSV">
                    <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFile}
                        style={{ color: 'var(--text)', fontSize: 13 }}
                    />
                    {fileName && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                            ✓ {fileName}
                        </div>
                    )}
                </Field>

                {/* Error de parse */}
                {parseError && (
                    <div style={{
                        color: 'var(--red)',
                        fontSize: 12,
                        background: 'var(--red)10',
                        borderRadius: 8,
                        padding: '8px 12px',
                    }}>
                        {parseError}
                    </div>
                )}

                {/* Vista previa de las primeras filas */}
                {preview.length > 0 && (
                    <div>
                        <div className="lbl">Vista previa ({preview.length} de las primeras filas)</div>
                        {preview.map((row, i) => (
                            <div key={i} style={{
                                fontSize: 11,
                                color: 'var(--muted)',
                                padding: '5px 0',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                gap: 8,
                            }}>
                                <span style={{ flexShrink: 0 }}>{row.date}</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.description}
                                </span>
                                <span style={{ color: 'var(--red)', flexShrink: 0 }}>${row.amount}</span>
                            </div>
                        ))}
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                            Las transacciones se importarán como "Gasto / Otro gasto". Puedes editar el tipo y categoría después.
                        </div>
                    </div>
                )}

                <ModalFooter
                    onClose={closeModal}
                    onSave={handleImport}
                    saveLabel={`${t.csvImport} (${preview.length} transacciones)`}
                    cancelLabel={t.cancel}
                    disabled={preview.length === 0}
                />
            </div>
        </Modal>


    )
}