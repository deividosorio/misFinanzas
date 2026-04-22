// src/components/ui/index.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Barrel export — punto de entrada único para todos los componentes UI.
//
// VENTAJA del barrel export:
//   En lugar de:
//     import Btn        from '../components/ui/Btn'
//     import { Card }   from '../components/ui/Card'
//     import Modal      from '../components/ui/Modal'
//     import { Field, Input, Select } from '../components/ui/Form'
//
//   Basta con:
//     import Btn, { Card, Modal, Field, Input, Select } from '../components/ui'
//     (o desde '../components/ui/index')
//
// ORGANIZACIÓN:
//   Btn.jsx         → Botón con variantes y tamaños
//   Card.jsx        → Card, CardSm, CardGlass
//   Modal.jsx       → Modal accesible con overlay
//   Form.jsx        → Field, Input, Select, ModalFooter, ColorPicker
//   DataDisplay.jsx → KPICard, ProgressBar, SectionHeader, Empty, TypeBadge
//   Badges.jsx      → Chip, PlanBadge, DemoBanner
// ─────────────────────────────────────────────────────────────────────────────

// ── Btn ───────────────────────────────────────────────────────────────────────
export { default as Btn } from './Btn'

// ── Card ──────────────────────────────────────────────────────────────────────
export { default as Card, CardSm, CardGlass } from './Card'

// ── Modal ─────────────────────────────────────────────────────────────────────
export { default as Modal } from './Modal'

// ── Form components ───────────────────────────────────────────────────────────
export { Field, Input, Select, ModalFooter, ColorPicker } from './Form'

// ── Data display ──────────────────────────────────────────────────────────────
export { KPICard, ProgressBar, SectionHeader, Empty, TypeBadge } from './DataDisplay'

// ── Badges ────────────────────────────────────────────────────────────────────
export { default as PlanBadge, Chip, DemoBanner } from './Badges'