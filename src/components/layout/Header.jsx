// src/components/layout/Header.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barra superior fija de la aplicación.
//
// CONTENIDO:
//   Izquierda → Logo con gradiente + nombre de la familia + badge de plan
//               + indicador "DEMO" cuando no hay Supabase configurado
//   Derecha   → Badge de miembros pendientes (solo admin/owner)
//               + Selector de idioma (ES / EN / FR)
//               + Avatar del usuario (clic abre ProfileModal)
//
// INTEGRACIÓN CON PROFILEMODAL:
//   El estado showProfile controla la apertura del modal de perfil.
//   El modal incluye: nombre, avatar, idioma, tema, cambio de contraseña, logout.
//
// BADGE DE PENDIENTES:
//   Aparece solo si hay miembros esperando aprobación (status = 'pending').
//   Solo visible para owner y admin.
//   Al hacer clic navega a la página Familia.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import PlanBadge from '../ui/Badges'
import ProfileModal from '../../pages/ProfileModal'

export default function Header() {
  const {
    t, lang, setLang,
    profile, family, isDemoMode,
    isFamilyAdmin, pendingMembers,
    setTab,
  } = useApp()

  // Controla si el ProfileModal está abierto
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      {/* ── BARRA SUPERIOR ── */}
      <header style={{
        background:     'var(--surface)',
        borderBottom:   '1px solid var(--border)',
        padding:        '0 18px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        height:         54,
        position:       'sticky',
        top:            0,
        zIndex:         40,
        flexShrink:     0,
      }}>

        {/* ── LADO IZQUIERDO: logo + familia ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>

          {/* Logo con gradiente azul/lavanda */}
          <span
            onClick={() => setTab('dashboard')}
            style={{
              fontFamily:           'var(--font-display)',
              fontSize:             18,
              fontWeight:           900,
              background:           'linear-gradient(135deg, #4f7cff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
              cursor:               'pointer',
              userSelect:           'none',
            }}
          >
            {t.appName}
          </span>

          {/* Nombre de familia + plan + indicador demo */}
          {family && (
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ color:'var(--muted)', fontSize:14, lineHeight:1 }}>·</span>
              <span style={{
                fontSize:   13,
                color:      'var(--muted)',
                fontWeight: 500,
                // Ocultar en pantallas muy pequeñas
                '@media(max-width:480px)': { display:'none' },
              }}>
                {family.name}
              </span>
              <PlanBadge plan={family.plan} />
              {isDemoMode && (
                <span style={{
                  fontSize:     10,
                  fontWeight:   700,
                  color:        '#fbbf24',
                  background:   '#fbbf2420',
                  borderRadius: 20,
                  padding:      '2px 8px',
                  letterSpacing:0.5,
                }}>
                  DEMO
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── LADO DERECHO: badges + idioma + avatar ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>

          {/* Badge de miembros pendientes — solo admin/owner */}
          {isFamilyAdmin && pendingMembers.length > 0 && (
            <button
              onClick={() => setTab('family')}
              title={`${pendingMembers.length} miembro(s) esperando aprobación`}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                background:   '#fbbf2420',
                border:       '1px solid #fbbf2433',
                borderRadius: 20,
                padding:      '4px 10px',
                cursor:       'pointer',
                fontSize:     11,
                fontWeight:   700,
                color:        '#fbbf24',
                transition:   'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fbbf2430'}
              onMouseLeave={e => e.currentTarget.style.background = '#fbbf2420'}
            >
              <span style={{ fontSize:12 }}>⏳</span>
              {pendingMembers.length} pendiente{pendingMembers.length > 1 ? 's' : ''}
            </button>
          )}

          {/* Selector de idioma — 3 botones compactos */}
          <div style={{ display:'flex', gap:2 }}>
            {['es', 'en', 'fr'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                title={l === 'es' ? 'Español' : l === 'en' ? 'English' : 'Français'}
                style={{
                  background:   lang === l ? 'var(--border)' : 'transparent',
                  color:        lang === l ? 'var(--text)'   : 'var(--muted)',
                  border:       'none',
                  borderRadius: 'var(--radius-xs)',
                  padding:      '4px 8px',
                  fontSize:     11,
                  fontWeight:   700,
                  cursor:       'pointer',
                  transition:   'all .15s',
                  letterSpacing:0.5,
                  fontFamily:   'var(--font-body)',
                }}
                onMouseEnter={e => { if (lang !== l) e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { if (lang !== l) e.currentTarget.style.color = 'var(--muted)' }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Avatar del usuario — clic abre el ProfileModal */}
          {profile && (
            <button
              onClick={() => setShowProfile(true)}
              title="Mi perfil y configuración"
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                padding:      '5px 10px',
                borderRadius: 'var(--radius-sm)',
                background:   'var(--border)',
                border:       'none',
                cursor:       'pointer',
                transition:   'all .15s',
                fontFamily:   'var(--font-body)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
            >
              {/* Emoji del avatar con color de fondo */}
              <span style={{
                width:        26,
                height:       26,
                borderRadius: '50%',
                background:   profile.avatar_color + '22',
                border:       `1.5px solid ${profile.avatar_color}66`,
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                fontSize:     14,
                flexShrink:   0,
              }}>
                {profile.avatar_emoji}
              </span>
              {/* Nombre — ocultar en pantallas pequeñas */}
              <span style={{
                fontSize:   12,
                fontWeight: 500,
                color:      'var(--text)',
                maxWidth:   100,
                overflow:   'hidden',
                textOverflow:'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {profile.display_name}
              </span>
              {/* Flecha indicadora de que abre un menú */}
              <span style={{ fontSize:9, color:'var(--muted)', marginLeft:2 }}>▾</span>
            </button>
          )}
        </div>
      </header>

      {/* ── PROFILE MODAL (se monta fuera del header para evitar z-index issues) ── */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </>
  )
}