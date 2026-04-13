// src/ColorPicker.jsx — Full color picker with hue/saturation/hex input
import { useState, useRef, useEffect, useCallback } from 'react'

function hsvToHex(h, s, v) {
  const f = n => { const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1)); }
  const r=Math.round(f(5)*255), g=Math.round(f(3)*255), b=Math.round(f(1)*255)
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')
}

function hexToHsv(hex) {
  const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min
  let h=0
  if(d!==0){
    if(max===r) h=((g-b)/d)%6
    else if(max===g) h=(b-r)/d+2
    else h=(r-g)/d+4
    h=Math.round(h*60); if(h<0) h+=360
  }
  return { h, s:max===0?0:d/max, v:max }
}

const PRESETS = [
  '#4f7cff','#818cf8','#10b981','#34d399','#f43f5e','#f97316',
  '#f59e0b','#fbbf24','#a855f7','#ec4899','#06b6d4','#38bdf8',
  '#6366f1','#8b5cf6','#14b8a6','#ef4444','#e11d48','#64748b',
]

export function ColorPicker({ value, onChange, th }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value || '#4f7cff'))
  const [hex, setHex] = useState(value || '#4f7cff')
  const [showFull, setShowFull] = useState(false)
  const svRef = useRef()
  const hueRef = useRef()

  useEffect(() => {
    const c = hsvToHex(hsv.h, hsv.s, hsv.v)
    setHex(c)
    onChange(c)
  }, [hsv])

  const getSVFromEvent = useCallback((e, rect) => {
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { s: x, v: 1 - y }
  }, [])

  const handleSVDown = e => {
    const rect = svRef.current.getBoundingClientRect()
    const { s, v } = getSVFromEvent(e, rect)
    setHsv(h => ({ ...h, s, v }))
    const move = e2 => { const { s, v } = getSVFromEvent(e2, rect); setHsv(h => ({ ...h, s, v })) }
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleHueDown = e => {
    const rect = hueRef.current.getBoundingClientRect()
    const getH = e2 => Math.round(Math.max(0, Math.min(1, (e2.clientX - rect.left) / rect.width)) * 360)
    setHsv(h => ({ ...h, h: getH(e) }))
    const move = e2 => setHsv(h => ({ ...h, h: getH(e2) }))
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleHex = v => {
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { setHsv(hexToHsv(v)); onChange(v) }
  }

  const thumbX = `${hsv.s * 100}%`
  const thumbY = `${(1 - hsv.v) * 100}%`
  const hueX = `${(hsv.h / 360) * 100}%`
  const hueColor = hsvToHex(hsv.h, 1, 1)

  return (
    <div>
      {/* Compact preset grid + current swatch */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: hex, border: `2px solid ${th?.border||'#e2e6f0'}`, flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowFull(f => !f)} title="Abrir selector"/>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
          {PRESETS.map(c => (
            <div key={c} onClick={() => { setHsv(hexToHsv(c)); setHex(c); onChange(c) }}
              style={{ width: 22, height: 22, borderRadius: 6, background: c, cursor: 'pointer', border: hex === c ? '2.5px solid #1a1d2e' : '2px solid transparent', transition: 'transform .1s', flexShrink: 0 }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      </div>

      {/* Full picker */}
      {showFull && (
        <div style={{ background: th?.subcard || '#f8f9fc', border: `1px solid ${th?.border || '#e2e6f0'}`, borderRadius: 14, padding: 14, marginTop: 4 }}>
          {/* SV area */}
          <div ref={svRef} onMouseDown={handleSVDown}
            style={{ width: '100%', height: 140, borderRadius: 10, position: 'relative', cursor: 'crosshair', marginBottom: 12, flexShrink: 0,
              background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})` }}>
            <div style={{ position: 'absolute', left: thumbX, top: thumbY, width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #fff', boxShadow: '0 1px 4px #0005', transform: 'translate(-50%,-50%)', pointerEvents: 'none', background: hex }} />
          </div>
          {/* Hue slider */}
          <div ref={hueRef} onMouseDown={handleHueDown}
            style={{ width: '100%', height: 14, borderRadius: 99, cursor: 'pointer', marginBottom: 12, position: 'relative',
              background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}>
            <div style={{ position: 'absolute', left: hueX, top: '50%', width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #fff', boxShadow: '0 1px 4px #0005', transform: 'translate(-50%,-50%)', background: hueColor, pointerEvents: 'none' }} />
          </div>
          {/* Hex input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: th?.text3 || '#9ca3af', fontWeight: 500 }}>HEX</div>
            <input value={hex} onChange={e => handleHex(e.target.value)}
              style={{ flex: 1, background: th?.input || '#f8f9fc', border: `1.5px solid ${th?.inputBorder || '#e2e6f0'}`, borderRadius: 8, padding: '6px 10px', color: th?.text || '#1a1d2e', fontFamily: 'monospace', fontSize: 13, outline: 'none' }} />
            <div style={{ width: 28, height: 28, borderRadius: 7, background: hex, border: `1px solid ${th?.border || '#e2e6f0'}` }} />
          </div>
        </div>
      )}
    </div>
  )
}
