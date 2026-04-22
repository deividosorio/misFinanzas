// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componente raíz de la aplicación. Actúa como router y orquestador.
//
// RESPONSABILIDADES:
//   1. Envolver todo en AppProvider (estado global)
//   2. Decidir qué mostrar según el estado de auth:
//      - Cargando → pantalla de loading
//      - Sin sesión (Supabase configurado) → Auth.jsx
//      - Usuario es niño → vista simplificada Kids
//      - Usuario adulto → layout completo con Sidebar + páginas
//   3. Mapear tab activo → componente de página
//   4. Renderizar el modal correcto según `modal` en el contexto
//
// PATRÓN DE NAVEGACIÓN:
//   No usa react-router-dom. La “navegación” es simplemente cambiar
//   el valor de `tab` en el contexto, lo que causa re-render de <main>.
//   Esto es suficiente para una SPA sin rutas en la URL.
//   Si en el futuro se necesitan URLs (ej: /debts, /kids),
//   se puede migrar a react-router-dom sin cambiar la lógica de negocio.
//
// MODAL ORCHESTRATION:
//   Los modales se definen aquí (no en cada página) para:
//   - Evitar que se rendericen dentro de tarjetas (z-index issues)
//   - Poder abrirlos desde cualquier parte del árbol de componentes
//   - Un único punto de control de qué modal está abierto
// ─────────────────────────────────────────────────────────────────────────────
import { AppProvider, useApp } from './context/AppContext'
import { Header, Sidebar, BottomNav, FilterBar } from './components/layout/index'
import { DemoBanner } from './components/ui/index'

// Páginas principales
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts from './pages/Debts'
import Recurring from './pages/Recurring'
import Savings from './pages/Savings'
import Kids from './pages/Kids'
import Statements from './pages/Statements'
import Family from './pages/Family'
import Admin from './pages/Admin'
import Auth from './pages/Auth'

// Modales (todos los formularios de la app)
import {
  TxModal,
  AccModal,
  PmModal,
  DebtModal,
  RecurringModal,
  GoalModal,
  KidGoalModal,
  ImportCSVModal,
} from './pages/Modals'

// ── AppInner — Lógica de routing (tiene acceso al contexto) ───────────────────
// Se separa de App para poder usar useApp() (que requiere estar dentro del Provider)
function AppInner() {
  const {
    session,
    authLoading,
    isDemoMode,
    tab,
    modal,
    isKid,
    t,
  } = useApp()

  // ── Estado de carga inicial ────────────────────────────────────────────────
  // Mientras Supabase verifica la sesión existente (milisegundos)
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 900,
            background: 'linear-gradient(135deg,#4f7cff,#a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {t.appName}
          </div>
          <div style={{
            color: 'var(--muted)',
            fontSize: 13,
            marginTop: 8,
            animation: 'pulse 1.5s infinite',
          }}>
            {t.loading}
          </div>
        </div>
      </div>
    )
  }

  // ── Sin sesión → mostrar Auth ──────────────────────────────────────────────
  // Solo si Supabase está configurado. En modo demo siempre hay “sesión”.
  if (!isDemoMode && !session) {
    console.log('isDemoMode:', isDemoMode, 'session:', session)
    return <Auth />
  }

  // ── Vista de niño (Kids) ───────────────────────────────────────────────────
  // Los niños ven una interfaz simplificada y gamificada, sin sidebar.
  if (isKid) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <main style={{ padding: '16px 12px', maxWidth: 500, margin: '0 auto' }}>
          <Kids /> {/* sin prop parentView → vista del niño */}
        </main>
      </div>
    )
  }

  // ── Mapa de tab → componente ───────────────────────────────────────────────
  // Cada entrada es { tab_id: <Componente /> }
  const PAGE_MAP = {
    dashboard: <Dashboard />,
    transactions: <Transactions />,
    debts: <Debts />,
    recurring: <Recurring />,
    savings: <Savings />,
    kids: <Kids parentView />,   // parentView → vista de padres
    statements: <Statements />,
    family: <Family />,
    admin: <Admin />,
  }

  // ── Vista adulto: layout completo ─────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>


      {/* Barra superior fija */}
      <Header />

      {/* Área principal: sidebar + contenido */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar de navegación (oculto en mobile) */}
        <Sidebar />

        {/* Área de contenido scrolleable */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px',
          maxWidth: 980,      // ancho máximo para pantallas grandes
          width: '100%',
          margin: '0 auto', // centrado horizontal
          paddingBottom: 80,       // espacio para BottomNav en mobile
        }}>

          {/* Aviso de modo demo */}
          {isDemoMode && <DemoBanner />}

          {/* Barra de filtros (solo en páginas que la necesitan) */}
          {['dashboard', 'transactions', 'statements'].includes(tab) && <FilterBar />}

          {/* Página activa con animación de entrada */}
          <div className="slide-in">
            {PAGE_MAP[tab] || <Dashboard />}
          </div>
        </main>
      </div>

      {/* Navegación inferior (solo visible en mobile) */}
      <BottomNav />

      {/* ── MODALES ────────────────────────────────────────────────────────── */}
      {/* Solo se renderiza el modal que está abierto (modal !== null)        */}
      {/* Se usa el valor de `modal` del contexto para decidir cuál mostrar  */}

      {/* Formulario de nueva transacción */}
      {modal === 'tx' && <TxModal />}

      {/* Formulario de nueva cuenta bancaria */}
      {modal === 'acc' && <AccModal />}

      {/* Formulario de nueva forma de pago / tarjeta */}
      {modal === 'pm' && <PmModal />}

      {/* Formulario de nueva deuda */}
      {modal === 'debt' && <DebtModal />}

      {/* Formulario de nuevo pago recurrente */}
      {modal === 'recurring' && <RecurringModal />}

      {/* Formulario de nueva meta de ahorro (adultos) */}
      {modal === 'goal' && <GoalModal />}

      {/* Formulario de nueva meta de ahorro (niños) */}
      {modal === 'kidGoal' && <KidGoalModal />}

      {/* Modal de importación de CSV */}
      {modal === 'importCSV' && <ImportCSVModal />}
    </div>


  )
}

// ── App — Componente raíz exportado ───────────────────────────────────────────
/**

- Envuelve AppInner en AppProvider para que useApp() funcione.
- AppProvider no puede llamar a useApp() — por eso existe AppInner.
  */
export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}