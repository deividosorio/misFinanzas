// src/ImportCSV.jsx — Modal para importar transacciones desde CSV
import { useState, useRef } from 'react'

const REQUIRED = ['type','description','amount','date']
const VALID_TYPES = ['income','expense','saving']
const EXPENSE_CATS = ["food","housing","transport","health","entertainment","education","clothing","utilities","insurance","mortgage","car","other_expense"]

export function ImportCSV({ t, accs, pms, onImport, onClose, th }) {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [step, setStep] = useState('upload') // upload | preview | done
  const [imported, setImported] = useState(0)
  const fileRef = useRef()

  const parseCSV = (text) => {
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) return { rows: [], errors: ['El archivo está vacío'] }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'))
    const missing = REQUIRED.filter(r => !headers.includes(r))
    if (missing.length > 0) return { rows: [], errors: [`Columnas faltantes: ${missing.join(', ')}`] }

    const parsed = []
    const errs = []

    lines.slice(1).forEach((line, idx) => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''))
      const row = {}
      headers.forEach((h, i) => row[h] = vals[i] || '')

      const rowNum = idx + 2
      if (!VALID_TYPES.includes(row.type)) { errs.push(`Fila ${rowNum}: tipo inválido "${row.type}" (use income/expense/saving)`); return }
      const amount = parseFloat(row.amount)
      if (isNaN(amount) || amount <= 0) { errs.push(`Fila ${rowNum}: monto inválido "${row.amount}"`); return }
      if (!row.date.match(/^\d{4}-\d{2}-\d{2}$/)) { errs.push(`Fila ${rowNum}: fecha inválida "${row.date}" (use YYYY-MM-DD)`); return }
      if (!row.description) { errs.push(`Fila ${rowNum}: descripción vacía`); return }

      parsed.push({
        type: row.type,
        category: row.category || (row.type === 'income' ? 'other_income' : row.type === 'saving' ? 'goal' : 'other_expense'),
        description: row.description,
        amount,
        date: row.date,
        accId: row.account_id || accs[0]?.id || null,
        pmId: row.payment_method_id || null,
      })
    })

    return { rows: parsed, errors: errs }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { rows, errors } = parseCSV(ev.target.result)
      setRows(rows)
      setErrors(errors)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    let count = 0
    for (const row of rows) {
      try { await onImport(row); count++ } catch(e) {}
    }
    setImported(count)
    setStep('done')
  }

  const s = { // styles using theme
    overlay: { position:'fixed', inset:0, background:'#00000066', zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' },
    modal: { background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius:22, padding:28, width:'100%', maxWidth:520, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px #00000030' },
    title: { fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color: th.text, marginBottom:18 },
    lbl: { fontSize:11, color: th.text3, marginBottom:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' },
    inp: { background: th.input, border: `1.5px solid ${th.inputBorder}`, borderRadius:10, padding:'9px 13px', color: th.text, fontFamily:'inherit', fontSize:13, width:'100%', outline:'none' },
    btn: { border:'none', borderRadius:10, padding:'9px 16px', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all .15s', whiteSpace:'nowrap' },
    err: { background:'#fff5f5', border:'1px solid #fecdd3', color:'#ef4444', borderRadius:8, padding:'8px 12px', fontSize:12 },
    ok: { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:8, padding:'8px 12px', fontSize:12 },
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.title}>📥 Importar desde CSV</div>

        {step === 'upload' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ background: th.subcard, border:`1.5px dashed ${th.border}`, borderRadius:14, padding:28, textAlign:'center', cursor:'pointer' }}
              onClick={() => fileRef.current.click()}>
              <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:14, fontWeight:600, color: th.text, marginBottom:4 }}>Seleccionar archivo CSV</div>
              <div style={{ fontSize:12, color: th.text3 }}>Haz clic o arrastra tu archivo aquí</div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleFile} />
            </div>

            <div style={{ background: th.subcard, border:`1px solid ${th.border}`, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color: th.text, marginBottom:8 }}>📋 Formato esperado del CSV:</div>
              <div style={{ fontFamily:'monospace', fontSize:11, color: th.text2, background: th.input, borderRadius:8, padding:10, overflowX:'auto' }}>
                type,category,description,amount,date<br/>
                income,salary,Salario Mayo,5200,2025-05-01<br/>
                expense,food,IGA Supermercado,320,2025-05-05<br/>
                saving,vacation,Viaje verano,400,2025-05-06
              </div>
              <div style={{ fontSize:11, color: th.text3, marginTop:8 }}>
                • <strong>type:</strong> income / expense / saving<br/>
                • <strong>date:</strong> formato YYYY-MM-DD<br/>
                • <strong>category:</strong> opcional (se asigna automáticamente)<br/>
                • <strong>account_id / payment_method_id:</strong> opcional
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {errors.length > 0 && (
              <div style={s.err}>
                <div style={{ fontWeight:600, marginBottom:4 }}>⚠️ {errors.length} advertencia(s):</div>
                {errors.slice(0,5).map((e,i) => <div key={i} style={{ fontSize:11 }}>{e}</div>)}
                {errors.length > 5 && <div style={{ fontSize:11 }}>...y {errors.length-5} más</div>}
              </div>
            )}
            {rows.length > 0 && (
              <div style={s.ok}>✅ {rows.length} transacciones listas para importar</div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
              <div style={{ maxHeight:280, overflowY:'auto', border:`1px solid ${th.border}`, borderRadius:12, overflow:'hidden' }}>
                {rows.slice(0,10).map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom: i < Math.min(rows.length,10)-1 ? `1px solid ${th.trBorder}` : 'none', background: i%2===0 ? th.card : th.subcard }}>
                    <span style={{ fontSize:12, padding:'2px 8px', borderRadius:6, background: r.type==='income'?'#f0fdf4':r.type==='expense'?'#fff5f5':'#f5f3ff', color: r.type==='income'?'#16a34a':r.type==='expense'?'#ef4444':'#7c3aed', fontWeight:600 }}>{r.type}</span>
                    <span style={{ flex:1, fontSize:12, color: th.text, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</span>
                    <span style={{ fontSize:12, fontWeight:700, color: r.type==='income'?'#16a34a':r.type==='expense'?'#ef4444':'#7c3aed' }}>${r.amount}</span>
                    <span style={{ fontSize:11, color: th.text3 }}>{r.date}</span>
                  </div>
                ))}
                {rows.length > 10 && <div style={{ padding:'8px 14px', fontSize:11, color: th.text3, textAlign:'center', background: th.subcard }}>...y {rows.length-10} más</div>}
              </div>
            )}

            <div style={{ display:'flex', gap:8 }}>
              <button style={{ ...s.btn, flex:1, background: th.btnGhost, color: th.text2, border:`1.5px solid ${th.btnGhostBorder}` }} onClick={() => { setStep('upload'); setRows([]); setErrors([]); }}>← Atrás</button>
              {rows.length > 0 && <button style={{ ...s.btn, flex:2, background:'#4f7cff', color:'#fff' }} onClick={handleImport}>Importar {rows.length} transacciones</button>}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:17, fontWeight:700, color: th.text, marginBottom:6 }}>¡Importación completada!</div>
            <div style={{ fontSize:13, color: th.text2, marginBottom:20 }}>{imported} transacciones importadas correctamente</div>
            <button style={{ ...s.btn, background:'#4f7cff', color:'#fff', width:'100%' }} onClick={onClose}>Cerrar</button>
          </div>
        )}

        {step !== 'done' && (
          <button style={{ ...s.btn, width:'100%', background:'transparent', color: th.text3, border:'none', marginTop:10, fontSize:12 }} onClick={onClose}>Cancelar</button>
        )}
      </div>
    </div>
  )
}
