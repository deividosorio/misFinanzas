import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import Btn from '../ui/Btn'
import DatePicker from '../ui/DatePicker'
import { ACCOUNT_SUBTYPES, CREDIT_SUBTYPES } from '../../lib/constants'

const TABS_WITH_PERIOD = ['dashboard', 'statements']

export default function FilterBar() {
  const {
    t, tab,
    accounts,
    selAcc, setSelAcc,
    pMode, setPMode,
    selMonth, setSelMonth,
    rFrom, setRFrom,
    rTo, setRTo,
    applyFilter,
  } = useApp()

  const showPeriod = TABS_WITH_PERIOD.includes(tab)
  const [showSelector, setShowSelector] = useState(false)

  const assetAccounts = accounts.filter(a => a.is_active && !CREDIT_SUBTYPES.includes(a.subtype))
  const creditAccounts = accounts.filter(a => a.is_active && CREDIT_SUBTYPES.includes(a.subtype))

  const DATE_INPUT = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 10px',
    color: 'var(--text)',
    fontSize: 12,
    outline: 'none',
    fontFamily: 'var(--font-body)',
  }

  const selectedLabel = (() => {
    if (!selAcc) return t.allAccounts
    const acc = accounts.find(a => a.id === selAcc)
    if (!acc) return t.allAccounts
    return `${ACCOUNT_SUBTYPES[acc.subtype]?.icon || ''} ${acc.name}`
  })()

  return (
    <>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
        marginBottom: 14,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>

        {/* ── PERÍODO ── */}
        {showPeriod && (
          <>
            <div style={{ display: 'flex', gap: 3 }}>
              <Btn size="xs" variant={pMode === 'month' ? 'primary' : 'ghost'} onClick={() => setPMode('month')}>
                {t.selectMonth}
              </Btn>
              <Btn size="xs" variant={pMode === 'range' ? 'primary' : 'ghost'} onClick={() => setPMode('range')}>
                {t.customRange}
              </Btn>
            </div>

            {pMode === 'month' ? (
              <input type="month" value={selMonth}
                onChange={e => setSelMonth(e.target.value)}
                style={{ ...DATE_INPUT, width: 150 }} />
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 130 }}>
                  <DatePicker value={rFrom} onChange={setRFrom} placeholder={t.from} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>→</span>
                <div style={{ width: 130 }}>
                  <DatePicker value={rTo} onChange={setRTo} placeholder={t.to} />
                </div>
              </div>
            )}

            <Btn size="xs" variant="primary" onClick={applyFilter}>{t.apply}</Btn>
          </>
        )}

        {/* ── SELECTOR COMPACTO ── */}
        <button
          onClick={() => setShowSelector(true)}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            flexShrink: 0,
            color: 'var(--text)',
          }}
        >
          {selectedLabel}
        </button>
      </div>

      {/* ── MODAL SELECTOR ── */}
      {showSelector && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#0006',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: 16,
            width: '90%',
            maxWidth: 380,
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ margin: 0, marginBottom: 10, fontSize: 14 }}>{t.selectAccount}</h3>

            {/* Todas */}
            <SelectorItem
              active={!selAcc}
              onClick={() => { setSelAcc(null); setShowSelector(false) }}
            >
              {t.allAccounts}
            </SelectorItem>

            {/* Activos */}
            {assetAccounts.length > 0 && (
              <SectionLabel>{t.assetAccounts}</SectionLabel>
            )}
            {assetAccounts.map(a => (
              <SelectorItem
                key={a.id}
                active={selAcc === a.id}
                color={a.color}
                onClick={() => { setSelAcc(a.id); setShowSelector(false) }}
              >
                {ACCOUNT_SUBTYPES[a.subtype]?.icon} {a.name}
              </SelectorItem>
            ))}

            {/* Tarjetas */}
            {creditAccounts.length > 0 && (
              <SectionLabel>{t.creditCards}</SectionLabel>
            )}
            {creditAccounts.map(a => (
              <SelectorItem
                key={a.id}
                active={selAcc === a.id}
                color={a.color}
                onClick={() => { setSelAcc(a.id); setShowSelector(false) }}
              >
                💳 {a.name}{a.last_four ? ` ···${a.last_four}` : ''}
              </SelectorItem>
            ))}

            <button
              onClick={() => setShowSelector(false)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 0',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SelectorItem({ active, color, children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        marginBottom: 6,
        cursor: 'pointer',
        background: active ? (color || 'var(--blue)') : 'var(--border)',
        color: active ? '#fff' : 'var(--text)',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      marginTop: 12,
      marginBottom: 4,
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}