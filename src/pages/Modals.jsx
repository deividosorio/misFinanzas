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
// src/pages/Modals.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Todos los modales de creación de registros.
//
// CAMBIOS v4 — MODELO UNIFICADO DE CUENTAS:
//
//   ANTES (v3):
//     - AccModal    → creaba "cuentas bancarias" (solo activos)
//     - PmModal     → creaba "formas de pago" (tarjetas separadas)
//     - TxModal     → tenía account_id Y payment_account_id (confuso)
//     - RecurringModal → tenía selector de "forma de pago" separado
//
//   AHORA (v4):
//     - AccountModal → UN SOLO modal para CUALQUIER tipo de cuenta
//       El formulario cambia dinámicamente según el subtipo elegido:
//       * Activos (checking/savings/investment/cash): muestra saldo inicial
//       * Pasivos (credit_card/credit_line): muestra límite de crédito + últimos 4 dígitos
//     - TxModal → UN SOLO selector de cuenta (lista unificada débito + crédito)
//       La lógica contable la maneja el backend según el subtype de la cuenta
//     - RecurringModal → mismo selector unificado de cuenta
//
// LÓGICA DE CUENTA EN TRANSACCIONES:
//   Débito (checking/savings/cash/investment):
//     → gasto: saldo BAJA en la cuenta de activo
//     → ingreso: saldo SUBE
//   Crédito (credit_card/credit_line):
//     → gasto: deuda SUBE, disponible BAJA
//     → el pago del crédito se gestiona vía Recurrentes
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import Btn from '../components/ui/Btn'
import { Field, Input, Select, ModalFooter, ColorPicker } from '../components/ui/Form'
import {
    INCOME_CATS, EXPENSE_CATS, SAVING_CATS,
    ACC_COLORS, ACCOUNT_SUBTYPES, ALL_SUBTYPES,
    ASSET_SUBTYPES, CREDIT_SUBTYPES,
    isCredit as isCreditSubtype,
    toDay,
} from '../lib/constants'

// ═════════════════════════════════════════════════════════════════════════════
// AccountModal — MODAL UNIFICADO DE CUENTA
// Reemplaza AccModal + PmModal de versiones anteriores.
// ═════════════════════════════════════════════════════════════════════════════
/**
 * AccountModal — Crea cualquier tipo de cuenta: débito, ahorro o crédito.
 *
 * El formulario se adapta dinámicamente:
 *   Activos (checking/savings/investment/cash):
 *     ✓ Saldo inicial (opening_balance)
 *     ✗ Límite de crédito (no aplica)
 *     ✗ Últimos 4 dígitos (no aplica)
 *
 *   Pasivos (credit_card/credit_line):
 *     ✗ Saldo inicial (siempre 0 para crédito)
 *     ✓ Límite de crédito (requerido)
 *     ✓ Últimos 4 dígitos (opcional, para identificar la tarjeta)
 *
 * Solo owner y admin pueden abrir este modal.
 * La verificación de permisos también está en el RPC rpc_add_account().
 */
export function AccountModal({ onClose }) {
    const { t, members, addAccount, closeModal } = useApp()

    // Cerrar el modal (usa la función pasada o la del contexto)
    const handleClose = onClose || closeModal

    const [f, setF] = useState({
        name: '',
        subtype: 'checking',     // tipo por defecto: cuenta corriente
        owner_profile: '',             // quién es el titular
        color: '#4f7cff',
        institution: '',
        last_four: '',             // solo para tarjetas
        credit_limit: '',             // solo para crédito
        opening_balance: '0',            // solo para activos
        notes: '',
    })

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Configuración del subtipo seleccionado actualmente
    const subtypeConfig = ACCOUNT_SUBTYPES[f.subtype]
    const isCredit = subtypeConfig?.isCredit || false

    const set = (k, v) => {
        setError('')
        setF(prev => ({
            ...prev,
            [k]: v,
            // Al cambiar a crédito: limpiar saldo inicial
            // Al cambiar a activo: limpiar límite y últimos 4
            ...(k === 'subtype' && isCreditSubtype(v)
                ? { opening_balance: '0', color: ACCOUNT_SUBTYPES[v]?.color || '#ff6b6b' }
                : {}),
            ...(k === 'subtype' && !isCreditSubtype(v)
                ? { credit_limit: '', last_four: '', color: ACCOUNT_SUBTYPES[v]?.color || '#4f7cff' }
                : {}),
        }))
    }

    const handleSave = async () => {
        // Validaciones
        if (!f.name.trim()) { setError('El nombre de la cuenta es requerido'); return }
        if (isCredit && (!f.credit_limit || parseFloat(f.credit_limit) <= 0)) {
            setError('El límite de crédito es requerido y debe ser mayor que cero'); return
        }
        if (!isCredit && parseFloat(f.opening_balance || '0') < 0) {
            setError('El saldo inicial no puede ser negativo'); return
        }

        setSaving(true)
        const { error } = await addAccount({
            name: f.name.trim(),
            subtype: f.subtype,
            owner_profile: f.owner_profile || null,
            color: f.color,
            institution: f.institution.trim() || null,
            last_four: f.last_four.trim() || null,
            credit_limit: isCredit ? parseFloat(f.credit_limit) : null,
            opening_balance: isCredit ? 0 : parseFloat(f.opening_balance || '0'),
            notes: f.notes.trim() || null,
        })

        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    // Miembros adultos disponibles como titulares
    const adultMembers = members.filter(m => !m.is_kid && m.status === 'active')

    return (
        <Modal title="＋ Nueva cuenta" onClose={handleClose} width={460}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── SELECTOR DE TIPO DE CUENTA ── */}
                {/* Dividido en dos grupos: Activos y Crédito */}
                <Field label="Tipo de cuenta">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* Grupo: Activos */}
                        <div style={{
                            fontSize: 10, color: 'var(--muted)', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2
                        }}>
                            Cuentas de activo (dinero que tienes)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {ASSET_SUBTYPES.map(st => {
                                const cfg = ACCOUNT_SUBTYPES[st]
                                const active = f.subtype === st
                                return (
                                    <button key={st} onClick={() => set('subtype', st)} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${active ? cfg.color + '66' : 'var(--border)'}`,
                                        background: active ? cfg.color + '12' : 'var(--bg)',
                                        cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                                    }}>
                                        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                                        <div>
                                            <div style={{
                                                fontSize: 12, fontWeight: 600,
                                                color: active ? cfg.color : 'var(--text)'
                                            }}>
                                                {cfg.label}
                                            </div>
                                            {active && (
                                                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                                                    {cfg.examples}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Separador */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                            <span style={{
                                fontSize: 10, color: 'var(--muted)', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: 0.5
                            }}>
                                Crédito (dinero prestado)
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>

                        {/* Grupo: Crédito */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {CREDIT_SUBTYPES.map(st => {
                                const cfg = ACCOUNT_SUBTYPES[st]
                                const active = f.subtype === st
                                return (
                                    <button key={st} onClick={() => set('subtype', st)} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${active ? cfg.color + '66' : 'var(--border)'}`,
                                        background: active ? cfg.color + '12' : 'var(--bg)',
                                        cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
                                    }}>
                                        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                                        <div>
                                            <div style={{
                                                fontSize: 12, fontWeight: 600,
                                                color: active ? cfg.color : 'var(--text)'
                                            }}>
                                                {cfg.label}
                                            </div>
                                            {active && (
                                                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                                                    {cfg.examples}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </Field>

                {/* ── BANNER EXPLICATIVO según el tipo ── */}
                <div style={{
                    background: isCredit ? '#ff6b6b0a' : '#4f7cff0a',
                    border: `1px solid ${isCredit ? '#ff6b6b33' : '#4f7cff33'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                }}>
                    {isCredit ? (
                        <>
                            <strong style={{ color: 'var(--red)' }}>Cuenta de crédito:</strong>{' '}
                            Al registrar un gasto con esta cuenta, aumenta tu deuda.
                            El pago mensual se configura en <strong>Recurrentes</strong>.
                            El saldo disponible = límite - deuda del mes.
                        </>
                    ) : (
                        <>
                            <strong style={{ color: 'var(--blue)' }}>Cuenta de activo:</strong>{' '}
                            Los gastos reducen el saldo. Los ingresos lo aumentan.
                            El saldo inicial es el dinero actual en la cuenta.
                        </>
                    )}
                </div>

                {/* ── NOMBRE ── */}
                <Field label="Nombre de la cuenta *">
                    <Input
                        value={f.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder={isCredit ? 'TD Visa, RBC Mastercard...' : 'TD Savings, RBC Chequing...'}
                    />
                </Field>

                {/* ── CAMPOS SEGÚN TIPO ── */}
                {isCredit ? (
                    /* Campos para cuentas de crédito */
                    <div className="g2">
                        <Field label="Límite de crédito (CAD) *">
                            <Input
                                type="number"
                                value={f.credit_limit}
                                onChange={e => set('credit_limit', e.target.value)}
                                placeholder="8000"
                                min="0"
                                step="100"
                            />
                        </Field>
                        <Field label="Últimos 4 dígitos (opcional)">
                            <Input
                                value={f.last_four}
                                onChange={e => set('last_four', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="4521"
                                maxLength={4}
                            />
                        </Field>
                    </div>
                ) : (
                    /* Campo para cuentas de activo */
                    <Field label="Saldo inicial (CAD)">
                        <Input
                            type="number"
                            value={f.opening_balance}
                            onChange={e => set('opening_balance', e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                            El saldo actual de tu cuenta hoy. Los movimientos futuros se calculan sobre esto.
                        </div>
                    </Field>
                )}

                {/* ── INSTITUCIÓN ── */}
                <Field label="Institución bancaria">
                    <Input
                        value={f.institution}
                        onChange={e => set('institution', e.target.value)}
                        placeholder="TD Bank, RBC, Scotiabank, Desjardins..."
                    />
                </Field>

                {/* ── TITULAR ── */}
                <Field label="Titular de la cuenta">
                    <Select
                        value={f.owner_profile}
                        onChange={e => set('owner_profile', e.target.value)}
                    >
                        <option value="">— Seleccionar titular —</option>
                        {adultMembers.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.avatar_emoji} {m.display_name}
                            </option>
                        ))}
                    </Select>
                </Field>

                {/* ── COLOR ── */}
                <Field label="Color identificador">
                    <ColorPicker
                        colors={ACC_COLORS}
                        selected={f.color}
                        onChange={c => set('color', c)}
                    />
                </Field>

                {/* ── NOTAS ── */}
                <Field label="Notas (opcional)">
                    <Input
                        value={f.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Información adicional..."
                    />
                </Field>

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <ModalFooter
                    onClose={handleClose}
                    onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : `Crear ${subtypeConfig?.label || 'cuenta'}`}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim()}
                />
            </div>
        </Modal>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// TxModal — NUEVA TRANSACCIÓN (con selector de cuenta unificado)
// ═════════════════════════════════════════════════════════════════════════════
/**
 * TxModal — Registra un ingreso, gasto o ahorro.
 *
 * CAMBIO v4: Un solo selector de cuenta (lista unificada).
 * El usuario elige la cuenta con la que realizó la transacción,
 * sin importar si es débito o crédito.
 *
 * La lógica contable la maneja el backend automáticamente:
 *   - Cuenta de débito → saldo baja al gastar
 *   - Cuenta de crédito → deuda sube al gastar
 *
 * Para INGRESOS: solo se muestran cuentas de activo
 *   (los ingresos no se depositan en tarjetas de crédito)
 * Para GASTOS: se muestran TODAS las cuentas (débito + crédito)
 * Para AHORROS: solo cuentas de activo
 */
export function TxModal({ onClose }) {
    const { t, accounts, addTxn, closeModal } = useApp()

    const handleClose = onClose || closeModal

    const CATS_BY_TYPE = {
        income: INCOME_CATS,
        expense: EXPENSE_CATS,
        saving: SAVING_CATS,
    }

    const [f, setF] = useState({
        type: 'expense',
        category: 'food',
        account_id: '',
        description: '',
        amount: '',
        date: toDay(),
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (k, v) => {
        setError('')
        setF(prev => ({
            ...prev,
            [k]: v,
            // Al cambiar tipo: reset categoría y cuenta
            ...(k === 'type' ? {
                category: CATS_BY_TYPE[v][0],
                account_id: '', // reset porque la lista de cuentas disponibles cambia
            } : {}),
        }))
    }

    // Cuentas disponibles según el tipo de transacción
    const availableAccounts = accounts.filter(a => {
        if (!a.is_active) return false
        if (f.type === 'income' || f.type === 'saving') {
            // Ingresos y ahorros solo van a cuentas de activo
            return !isCreditSubtype(a.subtype)
        }
        // Gastos: todas las cuentas (débito y crédito)
        return true
    })

    // Separar para mostrar grupos en el selector
    const assetAccounts = availableAccounts.filter(a => !isCreditSubtype(a.subtype))
    const creditAccounts = availableAccounts.filter(a => isCreditSubtype(a.subtype))

    // Cuenta seleccionada (para mostrar info)
    const selectedAccount = accounts.find(a => a.id === f.account_id)
    const selectedIsCredit = selectedAccount ? isCreditSubtype(selectedAccount.subtype) : false

    const handleSave = async () => {
        if (!f.description.trim()) { setError('La descripción es requerida'); return }
        if (!f.amount || parseFloat(f.amount) <= 0) { setError('El monto debe ser mayor que cero'); return }
        if (!f.account_id) { setError('Selecciona la cuenta o tarjeta'); return }

        setSaving(true)
        const { error } = await addTxn({
            type: f.type,
            category: f.category,
            description: f.description.trim(),
            amount: parseFloat(f.amount),
            date: f.date,
            account_id: f.account_id || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    return (
        <Modal title={`＋ ${t.addTransaction}`} onClose={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                {/* Tipo de transacción */}
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
                        {(CATS_BY_TYPE[f.type] || []).map(c => (
                            <option key={c} value={c}>{t.cats?.[c] || c}</option>
                        ))}
                    </Select>
                </Field>

                {/* ── SELECTOR DE CUENTA UNIFICADO ── */}
                <Field label={
                    f.type === 'expense'
                        ? 'Cuenta o tarjeta utilizada'
                        : f.type === 'income'
                            ? 'Cuenta donde entra el dinero'
                            : 'Cuenta de ahorro'
                }>
                    <Select value={f.account_id} onChange={e => set('account_id', e.target.value)}>
                        <option value="">— Seleccionar cuenta —</option>

                        {/* Grupo: Cuentas de activo (débito/ahorro/inversión/efectivo) */}
                        {assetAccounts.length > 0 && (
                            <optgroup label="💳 Débito / Ahorro / Efectivo">
                                {assetAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {/* Grupo: Tarjetas de crédito (solo para gastos) */}
                        {creditAccounts.length > 0 && f.type === 'expense' && (
                            <optgroup label="💳 Tarjeta de crédito / Línea de crédito">
                                {creditAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        💳 {a.name}
                                        {a.last_four ? ` ···${a.last_four}` : ''}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </Select>

                    {/* Indicador de tipo de cuenta seleccionada */}
                    {selectedAccount && (
                        <div style={{
                            marginTop: 4, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
                            color: selectedIsCredit ? 'var(--red)' : 'var(--green)',
                        }}>
                            <span>{selectedIsCredit ? '💳 Crédito' : '🏦 Débito'}</span>
                            {selectedIsCredit && (
                                <span style={{ color: 'var(--muted)' }}>
                                    · el gasto aumentará tu deuda con {selectedAccount.institution || 'el banco'}
                                </span>
                            )}
                            {!selectedIsCredit && (
                                <span style={{ color: 'var(--muted)' }}>
                                    · el gasto se descontará del saldo de la cuenta
                                </span>
                            )}
                        </div>
                    )}
                </Field>

                {/* Descripción */}
                <Field label={t.description}>
                    <Input
                        value={f.description}
                        onChange={e => set('description', e.target.value)}
                        placeholder={
                            f.type === 'income' ? 'Ej: Salario Mayo, Freelance proyecto web...' :
                                f.type === 'expense' ? 'Ej: IGA Supermercado, Gasolina Shell...' :
                                    'Ej: Ahorro vacaciones, Fondo emergencias...'
                        }
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                    />
                </Field>

                {/* Monto y fecha */}
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

                {/* Notas */}
                <Field label="Notas (opcional)">
                    <Input
                        value={f.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Información adicional..."
                    />
                </Field>

                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <ModalFooter
                    onClose={handleClose}
                    onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : t.save}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.description || !f.amount || !f.account_id}
                />
            </div>
        </Modal>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// DebtModal — Nueva deuda de largo plazo
// ═════════════════════════════════════════════════════════════════════════════
/**
 * DebtModal — Registra una deuda de largo plazo (hipoteca, auto, préstamo).
 *
 * NOTA: Las deudas son DIFERENTES de las tarjetas de crédito:
 *   - Deudas: préstamos a largo plazo con cuotas fijas (hipoteca, auto)
 *   - Crédito: saldo revolving mensual (credit_card, credit_line)
 *
 * El pago de la deuda se gestiona vía Recurrentes (linked_debt_id).
 * La cuenta vinculada es la cuenta de débito desde donde se descuenta el pago.
 */
export function DebtModal({ onClose }) {
    const { t, accounts, addDebt, closeModal } = useApp()
    const handleClose = onClose || closeModal

    // Solo cuentas de activo para vincular el pago de la deuda
    const debitAccounts = accounts.filter(a =>
        a.is_active && !isCreditSubtype(a.subtype)
    )

    const [f, setF] = useState({
        name: '',
        category: 'mortgage',
        total_amount: '',
        paid_amount: '0',
        monthly_payment: '',
        interest_rate: '',
        start_date: toDay(),
        linked_account_id: '',
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const DEBT_CATEGORIES = [
        { id: 'mortgage', label: '🏠 Hipoteca / Mortgage' },
        { id: 'car', label: '🚗 Préstamo auto' },
        { id: 'personal_loan', label: '💼 Préstamo personal' },
        { id: 'student_loan', label: '🎓 Préstamo estudiantil' },
        { id: 'other_expense', label: '📋 Otro tipo de deuda' },
    ]

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.total_amount || parseFloat(f.total_amount) <= 0) {
            setError('El monto total debe ser mayor que cero'); return
        }
        if (parseFloat(f.paid_amount || '0') > parseFloat(f.total_amount)) {
            setError('Lo pagado no puede superar el total'); return
        }

        setSaving(true)
        const { error } = await addDebt({
            name: f.name.trim(),
            category: f.category,
            total_amount: parseFloat(f.total_amount),
            paid_amount: parseFloat(f.paid_amount || '0'),
            monthly_payment: f.monthly_payment ? parseFloat(f.monthly_payment) : null,
            interest_rate: f.interest_rate ? parseFloat(f.interest_rate) : 0,
            start_date: f.start_date || null,
            linked_account_id: f.linked_account_id || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    return (
        <Modal title="＋ Nueva deuda" onClose={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                {/* Info explicativa */}
                <div style={{
                    background: 'var(--orange)0a', border: '1px solid var(--orange)33',
                    borderRadius: 'var(--radius-sm)', padding: '9px 12px',
                    fontSize: 11, color: 'var(--muted)', lineHeight: 1.6,
                }}>
                    💡 Las <strong style={{ color: 'var(--text)' }}>deudas</strong> son préstamos
                    a largo plazo (hipoteca, auto, préstamo personal).
                    Para tarjetas de crédito, usa <strong style={{ color: 'var(--text)' }}>Nueva cuenta → Tarjeta de crédito</strong>.
                </div>

                <Field label="Nombre de la deuda *">
                    <Input
                        value={f.name}
                        onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                        placeholder="Hipoteca TD, Auto Honda CR-V..."
                    />
                </Field>

                <Field label="Categoría">
                    <Select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                        {DEBT_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </Select>
                </Field>

                <div className="g2">
                    <Field label="Monto total de la deuda (CAD) *">
                        <Input
                            type="number"
                            value={f.total_amount}
                            onChange={e => setF(p => ({ ...p, total_amount: e.target.value }))}
                            placeholder="320000"
                            min="0"
                        />
                    </Field>
                    <Field label="Ya pagado hasta hoy (CAD)">
                        <Input
                            type="number"
                            value={f.paid_amount}
                            onChange={e => setF(p => ({ ...p, paid_amount: e.target.value }))}
                            placeholder="0"
                            min="0"
                        />
                    </Field>
                    <Field label="Cuota mensual estimada (CAD)">
                        <Input
                            type="number"
                            value={f.monthly_payment}
                            onChange={e => setF(p => ({ ...p, monthly_payment: e.target.value }))}
                            placeholder="1850"
                            min="0"
                        />
                    </Field>
                    <Field label="Tasa de interés anual (%)">
                        <Input
                            type="number"
                            value={f.interest_rate}
                            onChange={e => setF(p => ({ ...p, interest_rate: e.target.value }))}
                            placeholder="4.5"
                            min="0"
                            step="0.01"
                        />
                    </Field>
                </div>

                <Field label="Fecha de inicio">
                    <Input
                        type="date"
                        value={f.start_date}
                        onChange={e => setF(p => ({ ...p, start_date: e.target.value }))}
                    />
                </Field>

                <Field label="Cuenta desde donde se paga (débito/ahorro)">
                    <Select
                        value={f.linked_account_id}
                        onChange={e => setF(p => ({ ...p, linked_account_id: e.target.value }))}
                    >
                        <option value="">— Seleccionar cuenta (opcional) —</option>
                        {debitAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                {a.owner_name ? ` (${a.owner_name})` : ''}
                            </option>
                        ))}
                    </Select>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                        La cuenta desde donde se descuentan los pagos mensuales
                    </div>
                </Field>

                <Field label="Notas (opcional)">
                    <Input
                        value={f.notes}
                        onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Banco, condiciones, notas..."
                    />
                </Field>

                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <ModalFooter
                    onClose={handleClose}
                    onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Crear deuda'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.total_amount}
                />
            </div>
        </Modal>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// RecurringModal — Nuevo pago recurrente (con selector de cuenta unificado)
// ═════════════════════════════════════════════════════════════════════════════
/**
 * RecurringModal — Configura un pago que se repite periódicamente.
 *
 * CAMBIO v4: Selector de cuenta unificado.
 * La cuenta puede ser:
 *   - Cuenta de débito/ahorro → el pago descuenta del saldo
 *   - Tarjeta de crédito → el pago aumenta la deuda de la tarjeta
 *
 * VINCULACIÓN CON DEUDA (linked_debt_id):
 *   Opcional. Si se vincula a una deuda (hipoteca, auto):
 *   Al marcar el pago como pagado → automáticamente abona a la deuda.
 *   Ejemplo: "Hipoteca TD" vinculado a deuda "Hipoteca TD".
 *   Al marcar pagado: descuenta de TD Chequing Y abona a la deuda hipoteca.
 */
export function RecurringModal({ onClose }) {
    const { t, accounts, debts, addRecurring, closeModal } = useApp()
    const handleClose = onClose || closeModal

    const [f, setF] = useState({
        name: '',
        amount: '',
        frequency: 'monthly',
        category: 'utilities',
        account_id: '',
        linked_debt_id: '',
        next_due: toDay(),
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Separar cuentas para el selector
    const debitAccounts = accounts.filter(a => a.is_active && !isCreditSubtype(a.subtype))
    const creditAccounts = accounts.filter(a => a.is_active && isCreditSubtype(a.subtype))

    // Deudas activas disponibles para vincular
    const activeDebts = debts.filter(d => d.is_active)

    // Cuenta seleccionada
    const selectedAccount = accounts.find(a => a.id === f.account_id)
    const selectedIsCredit = selectedAccount ? isCreditSubtype(selectedAccount.subtype) : false

    // Deuda seleccionada (para mostrar info)
    const selectedDebt = debts.find(d => d.id === f.linked_debt_id)

    const FREQ_OPTIONS = [
        { id: 'monthly', label: 'Mensual (12 veces/año)' },
        { id: 'biweekly', label: 'Quincenal (26 veces/año)' },
        { id: 'weekly', label: 'Semanal (52 veces/año)' },
        { id: 'yearly', label: 'Anual (1 vez/año)' },
    ]

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.amount || parseFloat(f.amount) <= 0) { setError('El monto debe ser mayor que cero'); return }
        if (!f.account_id) { setError('Selecciona la cuenta o tarjeta'); return }

        setSaving(true)
        const { error } = await addRecurring({
            name: f.name.trim(),
            amount: parseFloat(f.amount),
            frequency: f.frequency,
            category: f.category,
            account_id: f.account_id || null,
            linked_debt_id: f.linked_debt_id || null,
            next_due: f.next_due || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    return (
        <Modal title="＋ Nuevo pago recurrente" onClose={handleClose} width={460}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                <Field label="Nombre del pago *">
                    <Input
                        value={f.name}
                        onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                        placeholder="Hydro-Québec, Bell Internet, Seguro auto..."
                    />
                </Field>

                <div className="g2">
                    <Field label="Monto (CAD) *">
                        <Input
                            type="number"
                            value={f.amount}
                            onChange={e => setF(p => ({ ...p, amount: e.target.value }))}
                            placeholder="110"
                            min="0"
                            step="0.01"
                        />
                    </Field>
                    <Field label="Frecuencia">
                        <Select
                            value={f.frequency}
                            onChange={e => setF(p => ({ ...p, frequency: e.target.value }))}
                        >
                            {FREQ_OPTIONS.map(fr => (
                                <option key={fr.id} value={fr.id}>{fr.label}</option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <Field label="Categoría">
                    <Select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
                        {EXPENSE_CATS.map(c => (
                            <option key={c} value={c}>{t.cats?.[c] || c}</option>
                        ))}
                    </Select>
                </Field>

                {/* ── SELECTOR DE CUENTA UNIFICADO ── */}
                <Field label="Cuenta o tarjeta con que se paga *">
                    <Select
                        value={f.account_id}
                        onChange={e => setF(p => ({ ...p, account_id: e.target.value }))}
                    >
                        <option value="">— Seleccionar cuenta —</option>

                        {debitAccounts.length > 0 && (
                            <optgroup label="🏦 Débito / Ahorro / Efectivo">
                                {debitAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {creditAccounts.length > 0 && (
                            <optgroup label="💳 Tarjeta de crédito / Línea">
                                {creditAccounts.map(a => (
                                    <option key={a.id} value={a.id}>
                                        💳 {a.name}
                                        {a.last_four ? ` ···${a.last_four}` : ''}
                                        {a.owner_name ? ` (${a.owner_name})` : ''}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </Select>

                    {/* Info de la cuenta seleccionada */}
                    {selectedAccount && (
                        <div style={{
                            marginTop: 4, fontSize: 10, color: selectedIsCredit ? 'var(--red)' : 'var(--green)',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            {selectedIsCredit ? (
                                <>💳 Crédito · el gasto se registrará en la deuda de la tarjeta</>
                            ) : (
                                <>🏦 Débito · el gasto se descontará del saldo de la cuenta</>
                            )}
                        </div>
                    )}
                </Field>

                {/* ── VINCULAR CON DEUDA (opcional) ── */}
                {activeDebts.length > 0 && (
                    <Field label="Vincular con deuda de largo plazo (opcional)">
                        <Select
                            value={f.linked_debt_id}
                            onChange={e => setF(p => ({ ...p, linked_debt_id: e.target.value }))}
                        >
                            <option value="">— Sin vinculación a deuda —</option>
                            {activeDebts.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} · {
                                        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
                                            .format(d.total_amount - d.paid_amount)
                                    } restante
                                </option>
                            ))}
                        </Select>

                        {/* Explicación si hay deuda seleccionada */}
                        {selectedDebt && (
                            <div style={{
                                marginTop: 6, fontSize: 11, lineHeight: 1.6,
                                background: 'var(--orange)0a', border: '1px solid var(--orange)33',
                                borderRadius: 'var(--radius-sm)', padding: '7px 10px', color: 'var(--muted)',
                            }}>
                                ↺ Al marcar este pago como pagado, se abonará{' '}
                                <strong style={{ color: 'var(--text)' }}>
                                    {f.amount ? `$${parseFloat(f.amount).toFixed(0)}` : 'el monto'}
                                </strong>{' '}
                                automáticamente a la deuda <strong style={{ color: 'var(--orange)' }}>
                                    {selectedDebt.name}
                                </strong>.
                            </div>
                        )}
                        {!selectedDebt && (
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                                Ejemplo: "Hipoteca TD" → vincula al pago mensual de tu deuda hipotecaria
                            </div>
                        )}
                    </Field>
                )}

                {/* Próximo vencimiento */}
                <Field label="Fecha del próximo pago">
                    <Input
                        type="date"
                        value={f.next_due}
                        onChange={e => setF(p => ({ ...p, next_due: e.target.value }))}
                    />
                </Field>

                <Field label="Notas (opcional)">
                    <Input
                        value={f.notes}
                        onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Número de contrato, referencia de pago..."
                    />
                </Field>

                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <ModalFooter
                    onClose={handleClose}
                    onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Crear pago recurrente'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.amount || !f.account_id}
                />
            </div>
        </Modal>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// GoalModal — Nueva meta de ahorro (adultos)
// ═════════════════════════════════════════════════════════════════════════════
export function GoalModal({ onClose }) {
    const { t, accounts, addGoal, closeModal } = useApp()
    const handleClose = onClose || closeModal

    const EMOJIS = ['🎯', '✈️', '🏠', '🚗', '💻', '🏖', '🎓', '🛡️', '💍', '🎸', '⚽', '🌟', '🐕', '🎭']

    const [f, setF] = useState({
        name: '',
        target_amount: '',
        emoji: '🎯',
        color: '#4f7cff',
        account_id: '',
        deadline: '',
        notes: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Solo cuentas de ahorro/activo para las metas
    const savingsAccounts = accounts.filter(a =>
        a.is_active && !isCreditSubtype(a.subtype)
    )

    const handleSave = async () => {
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.target_amount || parseFloat(f.target_amount) <= 0) {
            setError('El monto objetivo debe ser mayor que cero'); return
        }
        setSaving(true)
        const { error } = await addGoal({
            name: f.name.trim(),
            target_amount: parseFloat(f.target_amount),
            current_amount: 0,
            emoji: f.emoji,
            color: f.color,
            account_id: f.account_id || null,
            deadline: f.deadline || null,
            notes: f.notes.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    return (
        <Modal title="＋ Nueva meta de ahorro" onClose={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                <Field label="Emoji de la meta">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => setF(p => ({ ...p, emoji: e }))} style={{
                                width: 36, height: 36, borderRadius: 8, fontSize: 20,
                                border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                background: f.emoji === e ? 'var(--blue)12' : 'transparent', cursor: 'pointer',
                            }}>
                                {e}
                            </button>
                        ))}
                    </div>
                </Field>

                <Field label="Nombre de la meta *">
                    <Input
                        value={f.name}
                        onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                        placeholder="Vacaciones 2025, Fondo emergencias..."
                    />
                </Field>

                <div className="g2">
                    <Field label="Monto objetivo (CAD) *">
                        <Input
                            type="number"
                            value={f.target_amount}
                            onChange={e => setF(p => ({ ...p, target_amount: e.target.value }))}
                            placeholder="3000"
                            min="0"
                        />
                    </Field>
                    <Field label="Fecha límite (opcional)">
                        <Input
                            type="date"
                            value={f.deadline}
                            onChange={e => setF(p => ({ ...p, deadline: e.target.value }))}
                        />
                    </Field>
                </div>

                <Field label="Cuenta asociada (opcional)">
                    <Select
                        value={f.account_id}
                        onChange={e => setF(p => ({ ...p, account_id: e.target.value }))}
                    >
                        <option value="">— Sin cuenta específica —</option>
                        {savingsAccounts.map(a => (
                            <option key={a.id} value={a.id}>
                                {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
                                {a.owner_name ? ` (${a.owner_name})` : ''}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Color">
                    <ColorPicker colors={ACC_COLORS} selected={f.color} onChange={c => setF(p => ({ ...p, color: c }))} />
                </Field>

                <Field label="Notas (opcional)">
                    <Input value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
                </Field>

                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>⚠️ {error}</div>
                )}

                <ModalFooter onClose={handleClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Crear meta'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.name.trim() || !f.target_amount} />
            </div>
        </Modal>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// KidGoalModal — Nueva meta de ahorro (niños)
// ═════════════════════════════════════════════════════════════════════════════
export function KidGoalModal({ onClose }) {
    const { t, kids, addKidGoal, closeModal } = useApp()
    const handleClose = onClose || closeModal

    const EMOJIS = ['⭐', '🎮', '🚲', '🎯', '🏀', '🎸', '📚', '🦋', '🌈', '🎪', '🚀', '💎', '🐉', '🎠']
    const COLORS = ['#fbbf24', '#818cf8', '#2dd4a0', '#ff6b6b', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c']

    const [f, setF] = useState({
        kid_profile: kids[0]?.id || '',
        name: '',
        target_amount: '',
        emoji: '⭐',
        color: '#fbbf24',
        reward_text: '',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const handleSave = async () => {
        if (!f.kid_profile) { setError('Selecciona el niño/a'); return }
        if (!f.name.trim()) { setError('El nombre es requerido'); return }
        if (!f.target_amount || parseFloat(f.target_amount) <= 0) {
            setError('El monto objetivo debe ser mayor que cero'); return
        }
        setSaving(true)
        const kid = kids.find(k => k.id === f.kid_profile)
        const { error } = await addKidGoal({
            kid_profile: f.kid_profile,
            kid_name: kid?.display_name || '',
            name: f.name.trim(),
            target_amount: parseFloat(f.target_amount),
            emoji: f.emoji,
            color: f.color,
            reward_text: f.reward_text.trim() || null,
        })
        if (error) { setError(error.message); setSaving(false); return }
        handleClose()
    }

    return (
        <Modal title="⭐ Nueva meta para un niño/a" onClose={handleClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

                <Field label="Niño/a *">
                    <Select value={f.kid_profile} onChange={e => setF(p => ({ ...p, kid_profile: e.target.value }))}>
                        <option value="">— Seleccionar —</option>
                        {kids.map(k => (
                            <option key={k.id} value={k.id}>
                                {k.avatar_emoji} {k.display_name}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Emoji de la meta">
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {EMOJIS.map(e => (
                            <button key={e} onClick={() => setF(p => ({ ...p, emoji: e }))} style={{
                                width: 36, height: 36, borderRadius: 8, fontSize: 20,
                                border: `2px solid ${f.emoji === e ? 'var(--blue)' : 'var(--border)'}`,
                                background: f.emoji === e ? 'var(--blue)12' : 'transparent', cursor: 'pointer',
                            }}>{e}</button>
                        ))}
                    </div>
                </Field>

                <Field label="Color">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {COLORS.map(c => (
                            <div key={c} onClick={() => setF(p => ({ ...p, color: c }))} style={{
                                width: 26, height: 26, borderRadius: 8, background: c, cursor: 'pointer',
                                border: f.color === c ? '3px solid #fff' : '3px solid transparent',
                                transition: 'border .1s',
                            }} />
                        ))}
                    </div>
                </Field>

                <Field label="Nombre de la meta *">
                    <Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nintendo Switch, Bicicleta nueva..." />
                </Field>

                <Field label="Monto objetivo (CAD) *">
                    <Input type="number" value={f.target_amount}
                        onChange={e => setF(p => ({ ...p, target_amount: e.target.value }))}
                        placeholder="350" min="0" />
                </Field>

                <Field label="Mensaje de ánimo (opcional)">
                    <Input value={f.reward_text}
                        onChange={e => setF(p => ({ ...p, reward_text: e.target.value }))}
                        placeholder="¡Tú puedes lograrlo! 💪" />
                </Field>

                {error && (
                    <div style={{
                        background: 'var(--red)10', border: '1px solid var(--red)33',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--red)', fontSize: 12,
                    }}>⚠️ {error}</div>
                )}

                <ModalFooter onClose={handleClose} onSave={handleSave}
                    saveLabel={saving ? 'Guardando...' : 'Crear meta'}
                    cancelLabel={t.cancel}
                    disabled={saving || !f.kid_profile || !f.name.trim() || !f.target_amount} />
            </div>
        </Modal>
    )
}