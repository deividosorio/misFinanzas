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

// Pantallas de autenticación y onboarding
import Auth, { FamilySetupScreen, PendingScreen } from './pages/Auth'

// Modales de creación (new records)
import {
  TxModal, AccModal, PmModal, DebtModal,
  RecurringModal, GoalModal, KidGoalModal,
  ImportCSVModal,
} from './pages/Modals'

// ── AppInner — tiene acceso al contexto (useApp) ──────────────────────────────
function AppInner() {
  const {
    session, profile, family,
    authLoading, isDemoMode,
    tab, modal,
    isKid, t,
  } = useApp()

  // ── 1. CARGANDO SESIÓN ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #4f7cff, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          MiFinanza
        </div>
        <div style={{
          color: 'var(--muted)',
          fontSize: 13,
          animation: 'pulse 1.5s infinite',
        }}>
          {t.loading}
        </div>
      </div>
    )
  }

  // ── 2. SIN SESIÓN → pantallas de auth ────────────────────────────────────
  if (!isDemoMode && !session) {
    return <Auth />
  }

  // ── 3. CON SESIÓN PERO SIN FAMILIA → configuración inicial ────────────────
  // El usuario se registró pero aún no creó ni se unió a una familia
  if (!isDemoMode && session && profile && !profile.family_id) {
    return <FamilySetupScreen />
  }

  // ── 4. EN FAMILIA PERO PENDIENTE DE APROBACIÓN ────────────────────────────
  // El usuario usó el código de invitación pero el admin aún no lo aprobó
  if (!isDemoMode && session && profile && profile.family_id && profile.status === 'pending') {
    return <PendingScreen />
  }

  // ── 5. VISTA DE NIÑO ──────────────────────────────────────────────────────
  // Los niños ven solo su módulo de metas gamificado, sin sidebar
  if (isKid) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header />
        <main style={{
          padding: '16px 12px',
          maxWidth: 500,
          margin: '0 auto',
          paddingBottom: 20,
        }}>
          <Kids />
        </main>
      </div>
    )
  }

  // ── 6. LAYOUT COMPLETO (adulto autenticado con familia activa) ────────────

  // Mapa de tab → componente de página
  const PAGE_MAP = {
    dashboard: <Dashboard />,
    transactions: <Transactions />,
    debts: <Debts />,
    recurring: <Recurring />,
    savings: <Savings />,
    kids: <Kids parentView />,
    statements: <Statements />,
    family: <Family />,
    admin: <Admin />,
  }

  // Tabs que muestran la FilterBar (con selector de período y cuenta)
  const TABS_WITH_FILTER = ['dashboard', 'transactions', 'statements']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER SUPERIOR (sticky) ── */}
      <Header />

      {/* ── ÁREA PRINCIPAL: sidebar + contenido ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar de navegación — solo desktop */}
        <Sidebar />

        {/* Área de contenido scrolleable */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px',
          maxWidth: 980,
          width: '100%',
          margin: '0 auto',
          paddingBottom: 80,  // espacio para BottomNav en mobile
        }}>

          {/* Banner modo demo */}
          {isDemoMode && <DemoBanner />}

          {/* Filtros de período y cuenta (solo en tabs específicos) */}
          {TABS_WITH_FILTER.includes(tab) && <FilterBar />}

          {/* Página activa con animación de entrada */}
          <div className="slide-in">
            {PAGE_MAP[tab] || <Dashboard />}
          </div>
        </main>
      </div>

      {/* ── NAVEGACIÓN INFERIOR (solo mobile) ── */}
      <BottomNav />

      {/* ── MODALES GLOBALES ─────────────────────────────────────────────────
          Se renderizan aquí (fuera de las páginas) para garantizar z-index
          correcto. El valor de `modal` en AppContext determina cuál está abierto.
      ──────────────────────────────────────────────────────────────────────── */}

      {/* Nueva transacción */}
      {modal === 'tx' && <TxModal />}

      {/* Nueva cuenta bancaria (solo admin) */}
      {modal === 'acc' && <AccModal />}

      {/* Nueva tarjeta / forma de pago (solo admin) */}
      {modal === 'pm' && <PmModal />}

      {/* Nueva deuda */}
      {modal === 'debt' && <DebtModal />}

      {/* Nuevo pago recurrente */}
      {modal === 'recurring' && <RecurringModal />}

      {/* Nueva meta de ahorro (adultos) */}
      {modal === 'goal' && <GoalModal />}

      {/* Nueva meta de ahorro (niños) */}
      {modal === 'kidGoal' && <KidGoalModal />}

      {/* Importar CSV */}
      {modal === 'importCSV' && <ImportCSVModal />}
    </div>
  )
}

// ── App — Componente raíz exportado ───────────────────────────────────────────
/**
 * Envuelve AppInner en AppProvider para que useApp() funcione.
 * AppProvider no puede llamar a useApp() — por eso existe AppInner.
 */
export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}