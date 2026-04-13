// src/useTheme.js — Hook para modo oscuro/claro persistido
import { useState, useEffect } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('fn_theme') === 'dark' }
    catch { return false }
  })

  useEffect(() => {
    localStorage.setItem('fn_theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => setDark(d => !d)

  // Theme tokens
  const th = dark ? {
    bg:       '#0f1117',
    bg2:      '#13161f',
    bg3:      '#1a1d2e',
    border:   '#1e2235',
    border2:  '#252840',
    text:     '#e8eaf0',
    text2:    '#8b90a8',
    text3:    '#6b7280',
    card:     '#13161f',
    cardBorder:'#1e2235',
    input:    '#0b0d14',
    inputBorder:'#1e2235',
    navBg:    '#0f1118',
    filterBg: '#0f1118',
    hoverBg:  '#1e2235',
    shadow:   '0 1px 4px #00000040',
    chipOff:  '#1e2235',
    chipOffText:'#8b90a8',
    btnGhost: 'transparent',
    btnGhostText:'#8b90a8',
    btnGhostBorder:'#1e2235',
    progBg:   '#1e2235',
    trBorder: '#0f111a',
    subcard:  '#0b0d14',
  } : {
    bg:       '#e8ecf4',
    bg2:      '#dde2ed',
    bg3:      '#d2d8e8',
    border:   '#c8d0e2',
    border2:  '#bac4d8',
    text:     '#1a1d2e',
    text2:    '#4b5563',
    text3:    '#6b7280',
    card:     '#ffffff',
    cardBorder:'#d4daea',
    input:    '#edf0f7',
    inputBorder:'#c8d0e2',
    navBg:    '#ffffff',
    filterBg: '#ffffff',
    hoverBg:  '#edf0f7',
    shadow:   '0 1px 4px #00000012',
    chipOff:  '#dde2ed',
    chipOffText:'#4b5563',
    btnGhost: '#ffffff',
    btnGhostText:'#4b5563',
    btnGhostBorder:'#c8d0e2',
    progBg:   '#dde2ed',
    trBorder: '#edf0f7',
    subcard:  '#edf0f7',
  }

  return { dark, toggle, th }
}
