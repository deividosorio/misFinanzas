# DatePicker — Guía de Implementación

## Overview

Un componente de selector de fecha **responsive** (mobile/desktop) sin dependencias externas. Usa un calendario visual con navegación por meses y soporte para fechas mínimas/máximas.

## Características

✅ **Responsive**: Sheet modal en mobile (≤768px), popover en desktop  
✅ **Sin dependencias**: Componente puro con lógica de calendario  
✅ **Touch-friendly**: Botones grandes, navegación clara  
✅ **Keyboard-friendly**: Cerrar con Escape, seleccionar con Enter  
✅ **Accessible**: ARIA labels, focus management  
✅ **Temas**: Soporta variables CSS (--surface, --border, --blue, etc.)

## Ubicación

```
src/components/ui/DatePicker.jsx
```

Se exporta desde `src/components/ui/index.jsx`:

```javascript
export { default as DatePicker } from './DatePicker'
```

## Uso Básico

### Importar

```javascript
import DatePicker from '../components/ui/DatePicker'
```

### Ejemplo Simple

```jsx
const [date, setDate] = useState('2024-05-15')

<DatePicker 
  value={date} 
  onChange={(newDate) => setDate(newDate)} 
  label="Selecciona una fecha"
/>
```

## Props

| Prop | Tipo | Descripción |
|------|------|-------------|
| `value` | string | ISO date `YYYY-MM-DD` o vacío |
| `onChange` | function | Callback con la fecha seleccionada |
| `label` | string | (Obsoleto, para compatibilidad) |
| `placeholder` | string | Texto en el input vacío |
| `disabled` | boolean | Deshabilitar el componente |
| `min` | string | Fecha mínima permitida `YYYY-MM-DD` |
| `max` | string | Fecha máxima permitida `YYYY-MM-DD` |

## Ejemplos de Uso Real

### En FilterBar (Rango de fechas)

```jsx
<div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
  <div style={{ width: 130 }}>
    <DatePicker value={rFrom} onChange={setRFrom} placeholder="Desde" />
  </div>
  <span style={{ fontSize: 11, color: 'var(--muted)' }}>→</span>
  <div style={{ width: 130 }}>
    <DatePicker value={rTo} onChange={setRTo} placeholder="Hasta" />
  </div>
</div>
```

### En Modales de Creación/Edición

```jsx
<Field label="Fecha de la transacción">
  <DatePicker 
    value={f.date} 
    onChange={v => setF(p => ({ ...p, date: v }))}
  />
</Field>
```

### Con Restricciones de Fecha

```jsx
const today = new Date().toISOString().split('T')[0]
const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
  .toISOString().split('T')[0]

<DatePicker 
  value={date} 
  onChange={setDate}
  min={oneYearAgo}
  max={today}
  placeholder="Selecciona del último año"
/>
```

## Comportamiento

### Desktop (> 768px)
- Click en input → abre **popover** debajo/arriba
- Click fuera → cierra el popover
- Tecla Escape → cierra
- Navegación: flechas ← → para meses
- Botón "Hoy" → selecciona hoy y cierra

### Mobile (≤ 768px)
- Click en input → abre **sheet modal** desde el bottom
- Overlay oscuro → click = cierra
- Drag handle visual para indicar que es draggable (iOS)
- Touch-optimized con botones grandes
- Misma navegación que desktop

## Características del Calendario

1. **Vista mensual**: Todos los días del mes en una grid
2. **Navegación**: Botones ← → para cambiar mes/año
3. **Marcado visual**:
   - Día seleccionado: **azul sólido**
   - Hoy: **borde azul** (si no está seleccionado)
   - Días deshabilitados: **opacidad 40%**
4. **Botón "Hoy"**: Selecciona el día actual y cierra
5. **Hover en desktop**: Cambio de fondo en días no seleccionados

## Traducciones

Los meses y días se muestran en español. Para cambiar idioma, edita los arrays al inicio de `DatePicker.jsx`:

```javascript
const monthNames = ['Enero', 'Febrero', ... 'Diciembre']
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
```

## Integración Actual

Ya está integrado en:

1. **FilterBar.jsx** → Filtros de rango de fechas
2. **Modals.jsx** → Todos los campos de fecha:
   - TxModal (fecha de transacción)
   - DebtModal (fecha de inicio)
   - RecurringModal (próximo pago)
   - GoalModal (fecha límite)
3. **EditModals.jsx** → Edición de los campos anteriores

## Estilos CSS Personalizables

El DatePicker usa variables CSS que se heredan del tema:

```css
--surface    /* Fondo del popover/sheet */
--bg         /* Fondo de input */
--border     /* Color de bordes */
--text       /* Color de texto */
--muted      /* Color de texto secundario */
--blue       /* Color de selección/hover */
```

Edita `src/index.css` para cambiar estas variables globalmente.

## Casos de Uso Avanzados

### Bloquear fechas futuras

```jsx
const today = new Date().toISOString().split('T')[0]

<DatePicker 
  value={date} 
  onChange={setDate}
  max={today}  // Solo fechas pasadas/hoy
/>
```

### Rango acotado

```jsx
<DatePicker 
  value={startDate} 
  onChange={setStartDate}
  min="2024-01-01"
  max="2024-12-31"
/>
```

### Integración con formularios

```jsx
const [form, setForm] = useState({
  description: 'Groceries',
  date: '2024-05-15',
  amount: 50,
})

const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

<DatePicker 
  value={form.date}
  onChange={v => set('date', v)}
/>
```

## Mejoras Futuras

- [ ] Selección de rango (date range picker)
- [ ] Shortcuts (This week, Last month, etc.)
- [ ] Localization para EN/FR/etc.
- [ ] Teclado numérico en mobile
- [ ] Integración con react-hook-form
- [ ] Animaciones suavizadas en transiciones

## Troubleshooting

### El popover aparece fuera de pantalla
**Solución**: Usa contenedores con `overflow: visible` o ajusta `position: absolute` en el CSS.

### Fechas deshabilitadas no funcionan
**Verifica**: Que `min` y `max` sean strings válidos en formato `YYYY-MM-DD`.

### El input no se actualiza
**Revisa**: Que `onChange` esté actualizando correctamente el estado con `setState(newDate)`.

---

**Última actualización**: May 2024  
**Autor**: MiFinanza Dev Team
