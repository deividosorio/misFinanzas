// src/pages/Accounts.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Gestión de cuentas bancarias y tarjetas de crédito de la familia.
//
// FUNCIONALIDADES:
//   1. Lista de cuentas de débito/ahorro
//   2. Lista de tarjetas de crédito y líneas de crédito
//   3. Crear nueva cuenta (solo admin/owner)
//   4. Editar cuenta existente (solo admin/owner)
//   5. Ver balance y disponible (para crédito)
//   6. Barra de progreso de utilización de crédito
//
// CAMBIOS v4:
//   - Cuentas unificadas: activos (checking, savings, investment, cash) 
//     + pasivos (credit_card, credit_line)
//   - AccountModal unificado (openModal('account'))
//   - assetAccounts / creditAccounts del contexto
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Card, Btn, SectionHeader, ProgressBar } from '../components/ui/index'
import { EditAccountModal } from './EditModals'
import { ACCOUNT_SUBTYPES, CREDIT_SUBTYPES, fmt, pct } from '../lib/constants'

export default function Accounts() {
  const {
    t, isFamilyAdmin,
    assetAccounts, creditAccounts,
    openModal,
  } = useApp()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionHeader title="Cuentas" />

      {!isFamilyAdmin && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          fontSize: 12, color: 'var(--muted)',
        }}>
          🔒 Solo el administrador puede crear y editar cuentas
        </div>
      )}

      {/* Cuentas de activo */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            🏦 Cuentas de débito y ahorro ({assetAccounts.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('account')}>
              + Nueva cuenta
            </Btn>
          )}
        </div>
        {assetAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
            Sin cuentas configuradas
          </div>
        ) : (
          assetAccounts.map(acc => (
            <AccountRow key={acc.id} account={acc} isFamilyAdmin={isFamilyAdmin} />
          ))
        )}
      </Card>

      {/* Tarjetas de crédito */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            💳 Tarjetas y líneas de crédito ({creditAccounts.length})
          </div>
          {isFamilyAdmin && (
            <Btn size="sm" variant="primary" onClick={() => openModal('account')}>
              + Nueva tarjeta
            </Btn>
          )}
        </div>
        {creditAccounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>
            Sin tarjetas configuradas
          </div>
        ) : (
          creditAccounts.map(acc => (
            <AccountRow key={acc.id} account={acc} isFamilyAdmin={isFamilyAdmin} isCredit />
          ))
        )}
      </Card>
    </div>
  )
}

// ── AccountRow ────────────────────────────────────────────────────────────────
function AccountRow({ account: a, isFamilyAdmin, isCredit }) {
  const [editing, setEditing] = useState(false)
  const cfg = ACCOUNT_SUBTYPES[a.subtype]

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 0', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: a.color + '18', border: `1px solid ${a.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {isCredit ? '💳' : cfg?.icon || '🏦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: a.color }}>
            {a.name}
            {a.last_four && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 4 }}>···{a.last_four}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {cfg?.label}
            {a.institution && ` · ${a.institution}`}
            {a.owner_name && ` · ${a.owner_name}`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isCredit ? (
            <div>
              <div className="mono" style={{ fontSize: 14, color: 'var(--red)' }}>
                {fmt(a.month_debt || 0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                de {fmt(a.credit_limit || 0)} límite
              </div>
              <div style={{ marginTop: 4 }}>
                <ProgressBar
                  value={a.month_debt || 0}
                  max={a.credit_limit || 1}
                  height={4}
                  color={pct(a.month_debt || 0, a.credit_limit || 1) > 80 ? 'var(--red)' : 'var(--yellow)'}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>
                {fmt(a.available || 0)} disponible
              </div>
            </div>
          ) : (
            <div className="mono" style={{
              fontSize: 14,
              color: (a.balance || 0) >= 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {fmt(a.balance || 0)}
            </div>
          )}
        </div>
        {isFamilyAdmin && (
          <button onClick={() => setEditing(true)} title="Editar" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
            fontSize: 13, padding: '4px 6px', borderRadius: 4, transition: 'color .12s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>
            ✏️
          </button>
        )}
      </div>
      {editing && <EditAccountModal account={a} onClose={() => setEditing(false)} />}
    </>
  )
}
