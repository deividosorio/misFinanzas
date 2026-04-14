// src/SplitExpenses.jsx — Split expenses between family members
import { useState, useMemo } from 'react'

const fmt = n => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n||0)

export function useSplit(txns, accs) {
  // Calculate who owes whom based on split transactions
  const splitSummary = useMemo(() => {
    const splitTxns = txns.filter(t => t.split && t.split.length > 0)
    const balances = {} // { owner: net }

    splitTxns.forEach(tx => {
      const payer = accs.find(a => a.id === tx.accId)?.owner || 'Unknown'
      tx.split.forEach(s => {
        if (s.owner !== payer) {
          // s.owner owes payer s.amount
          balances[s.owner] = (balances[s.owner] || 0) - s.amount
          balances[payer] = (balances[payer] || 0) + s.amount
        }
      })
    })

    // Build "who owes whom" list
    const debts = []
    const owners = Object.keys(balances)
    const pos = owners.filter(o => balances[o] > 0).map(o => ({ owner:o, amt:balances[o] }))
    const neg = owners.filter(o => balances[o] < 0).map(o => ({ owner:o, amt:-balances[o] }))

    let pi = 0, ni = 0
    while (pi < pos.length && ni < neg.length) {
      const pay = Math.min(pos[pi].amt, neg[ni].amt)
      if (pay > 0.01) debts.push({ from: neg[ni].owner, to: pos[pi].owner, amount: pay })
      pos[pi].amt -= pay
      neg[ni].amt -= pay
      if (pos[pi].amt < 0.01) pi++
      if (neg[ni].amt < 0.01) ni++
    }
    return debts
  }, [txns, accs])

  return { splitSummary }
}

// Modal to configure split on a transaction
export function SplitModal({ tx, accs, onSave, onClose, th }) {
  const owners = [...new Set(accs.map(a => a.owner))]
  const [splits, setSplits] = useState(() => {
    if (tx.split?.length > 0) return tx.split
    // Default: 50/50 between all owners
    const each = Math.round(tx.amount / owners.length * 100) / 100
    return owners.map(o => ({ owner: o, amount: each, pct: Math.round(100/owners.length) }))
  })

  const total = splits.reduce((s, x) => s + (parseFloat(x.amount)||0), 0)
  const diff = Math.abs(total - tx.amount)
  const isValid = diff < 0.02

  const updateSplit = (idx, field, value) => {
    const updated = splits.map((s, i) => {
      if (i !== idx) return s
      if (field === 'pct') {
        return { ...s, pct: parseFloat(value)||0, amount: Math.round(tx.amount * (parseFloat(value)||0) / 100 * 100) / 100 }
      }
      return { ...s, [field]: field === 'amount' ? parseFloat(value)||0 : value }
    })
    setSplits(updated)
  }

  const setEqual = () => {
    const each = Math.round(tx.amount / splits.length * 100) / 100
    const pct = Math.round(100 / splits.length)
    setSplits(splits.map(s => ({ ...s, amount: each, pct })))
  }

  const s = {
    overlay:{ position:'fixed',inset:0,background:'#00000066',zIndex:65,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)' },
    modal:{ background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:20,padding:24,width:'100%',maxWidth:420,boxShadow:'0 20px 60px #00000030' },
    inp:{ background:th.input,border:`1.5px solid ${th.inputBorder}`,borderRadius:9,padding:'8px 12px',color:th.text,fontFamily:'inherit',fontSize:13,outline:'none' },
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:th.text,marginBottom:4}}>🔀 Dividir gasto</div>
        <div style={{fontSize:12,color:th.text3,marginBottom:16}}>{tx.description} — {fmt(tx.amount)}</div>

        {splits.map((sp, idx) => (
          <div key={sp.owner} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'10px 12px',borderRadius:11,background:th.subcard,border:`1px solid ${th.border}`}}>
            <div style={{width:32,height:32,borderRadius:9,background:'#4f7cff18',display:'flex',alignItems:'center',justifyContent:'center',color:'#4f7cff',fontWeight:700,fontSize:13,flexShrink:0}}>
              {sp.owner[0]}
            </div>
            <div style={{flex:1,fontSize:13,fontWeight:600,color:th.text}}>{sp.owner}</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="number" value={sp.pct} onChange={e=>updateSplit(idx,'pct',e.target.value)}
                style={{...s.inp,width:55,textAlign:'center'}} placeholder="%"/>
              <span style={{color:th.text3,fontSize:12}}>%</span>
              <input type="number" value={sp.amount} onChange={e=>updateSplit(idx,'amount',e.target.value)}
                style={{...s.inp,width:80,textAlign:'right'}}/>
            </div>
          </div>
        ))}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,padding:'8px 12px',borderRadius:9,background:isValid?'#f0fdf4':'#fff5f5',border:`1px solid ${isValid?'#bbf7d0':'#fecdd3'}`}}>
          <span style={{fontSize:12,color:th.text2}}>Total dividido:</span>
          <span style={{fontSize:13,fontWeight:700,color:isValid?'#16a34a':'#ef4444'}}>{fmt(total)} {isValid?'✓':`(faltan ${fmt(tx.amount-total)})`}</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={setEqual} style={{flex:1,border:`1.5px solid ${th.border}`,borderRadius:9,padding:'8px',cursor:'pointer',background:th.btnGhost,color:th.text2,fontFamily:'inherit',fontSize:12,fontWeight:600}}>50/50</button>
          <button onClick={onClose} style={{flex:1,border:`1.5px solid ${th.border}`,borderRadius:9,padding:'8px',cursor:'pointer',background:th.btnGhost,color:th.text2,fontFamily:'inherit',fontSize:12,fontWeight:600}}>Cancelar</button>
          <button onClick={()=>{if(isValid)onSave(splits)}} disabled={!isValid}
            style={{flex:2,border:'none',borderRadius:9,padding:'8px',cursor:isValid?'pointer':'not-allowed',background:isValid?'#4f7cff':'#94a3b8',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600}}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// Summary card showing who owes whom
export function SplitSummaryCard({ splitSummary, th }) {
  if (splitSummary.length === 0) return null
  return (
    <div style={{background:th.card,border:`1px solid ${th.cardBorder}`,borderRadius:16,padding:'14px 18px',marginBottom:0}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:th.text,marginBottom:10}}>🔀 Gastos compartidos</div>
      {splitSummary.map((d, i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:i<splitSummary.length-1?`1px solid ${th.trBorder}`:'none'}}>
          <span style={{fontSize:12,fontWeight:600,color:'#ef4444'}}>{d.from}</span>
          <span style={{fontSize:11,color:th.text3}}>le debe a</span>
          <span style={{fontSize:12,fontWeight:600,color:'#16a34a'}}>{d.to}</span>
          <span style={{marginLeft:'auto',fontSize:14,fontWeight:800,color:'#4f7cff',fontFamily:"'Syne',sans-serif"}}>{fmt(d.amount)}</span>
        </div>
      ))}
    </div>
  )
}
