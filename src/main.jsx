// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Punto de entrada de la aplicación React.
//
// Es el primer archivo que ejecuta Vite al arrancar.
// Responsabilidades:
//   1. Importar los estilos globales (index.css con variables CSS y reset)
//   2. Montar el árbol de componentes en el elemento #root del HTML
//   3. Envolver en React.StrictMode para detectar problemas en desarrollo
//
// React.StrictMode:
//   - En desarrollo: ejecuta algunos hooks dos veces para detectar efectos
//     secundarios inesperados y usos de APIs obsoletas
//   - En producción (npm run build): se elimina automáticamente, sin overhead
//
// ESTRUCTURA DEL ÁRBOL DE COMPONENTES:
//   main.jsx
//   └── App.jsx
//       └── AppProvider (contexto global)
//           └── AppInner
//               ├── Auth.jsx          (si no hay sesión)
//               ├── Header.jsx        (barra superior)
//               ├── Sidebar.jsx       (nav desktop)
//               ├── [página activa]   (Dashboard, Transactions, etc.)
//               ├── BottomNav.jsx     (nav mobile)
//               └── [modal activo]    (TxModal, ProfileModal, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Estilos globales: variables CSS (colores, tipografía, radios),
// reset CSS, clases de utilidad (grid, flex, animations)
import './index.css'

// Montar la app en el elemento #root definido en index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)