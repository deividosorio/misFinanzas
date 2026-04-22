// src/components/layout/index.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barrel export — punto de entrada único para todos los componentes
// de layout.
//
// VENTAJA: Los importadores solo necesitan saber la carpeta, no el archivo exacto.
//
// USO EN CUALQUIER ARCHIVO:
//   import { Header, Sidebar, BottomNav, FilterBar } from '../components/layout'
//   (en lugar de 4 imports separados con rutas individuales)
//
// PATRÓN: Barrel exports son una convención en proyectos React medianos/grandes.
// Facilitan refactoring: si un archivo se renombra, solo cambia este index.js.
// ─────────────────────────────────────────────────────────────────────────────
export { default as Header    } from './Header'
export { default as Sidebar   } from './Sidebar'
export { default as BottomNav } from './BottomNav'
export { default as FilterBar } from './FilterBar'