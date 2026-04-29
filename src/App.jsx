// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Componente raíz de la aplicación. Router principal y orquestador.
//
// ── RESPONSABILIDADES ────────────────────────────────────────────────────────
//
//   1. ROUTER DE AUTENTICACIÓN Y ONBOARDING
//      Lee `onboardingState` del contexto y decide qué pantalla mostrar.
//      Este valor lo calcula AppContext.jsx basándose en la sesión activa
//      y el estado del perfil en la base de datos.
//
//   2. LAYOUT PRINCIPAL
//      Cuando el usuario está completamente autenticado y con familia,
//      renderiza el layout de la app: Header + Sidebar + Main + BottomNav.
//
//   3. ORQUESTADOR DE MODALES
//      Todos los modales de la app se renderizan aquí (no en las páginas).
//      Esto garantiza que el z-index sea siempre correcto y que los modales
//      no queden atrapados dentro de contenedores con overflow:hidden.
//
// ── ÁRBOL DE DECISIÓN (onboardingState) ─────────────────────────────────────
//
//   'loading'         → <LoadingScreen />
//        │               Supabase está verificando la sesión.
//        │               Tiene un timeout de 5s para no quedarse colgado.
//        │
//   'unauthenticated' → <Auth />  (pantalla login/register)
//        │               No hay sesión activa.
//        │
//   'no_profile'      → <NoProfileScreen />
//        │               Hay sesión pero el perfil no se creó en BD.
//        │               Caso raro (trigger falló). Permite reintentar o salir.
//        │
//   'no_family'       → <FamilySetupScreen />
//        │               El usuario se registró pero aún no creó familia.
//        │               Opciones: crear familia o unirse con código.
//        │
//   'pending'         → <PendingScreen />
//        │               Se unió a una familia pero el admin no lo aprobó.
//        │               Solo puede cerrar sesión o refrescar.
//        │
//   'ready' + is_kid  → Layout Kids (sin sidebar, solo módulo Kids)
//        │               Usuarios con is_kid=true ven la interfaz gamificada.
//        │
//   'ready'           → Layout completo (Dashboard, Sidebar, etc.)
//
// ── MODALES DISPONIBLES (controlados por AppContext.modal) ──────────────────
//
//   'tx'        → Nueva transacción
//   'acc'       → Nueva cuenta bancaria (solo admin)
//   'pm'        → Nueva tarjeta / forma de pago (solo admin)
//   'debt'      → Nueva deuda
//   'recurring' → Nuevo pago recurrente
//   'goal'      → Nueva meta de ahorro (adultos)
//   'kidGoal'   → Nueva meta de ahorro (niños)
//
// ── SOBRE ProfileModal ───────────────────────────────────────────────────────
//
//   El ProfileModal se abre desde el Header (clic en el avatar).
//   Se monta aquí para garantizar z-index correcto.
//   Permite: cambiar idioma, tema, avatar, nombre, contraseña, cerrar sesión.
//
// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CAMBIOS v4:
//   - AccModal y PmModal ELIMINADOS → reemplazados por AccountModal unificado
//   - modal === 'acc' y modal === 'pm' → modal === 'account'
//   - AccountModal maneja cualquier tipo: checking/savings/credit_card/etc.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import FilterBar from './components/layout/FilterBar'
import { DemoBanner } from './components/ui/Badges'

// Páginas
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts from './pages/Debts'
import Recurring from './pages/Recurring'
import Savings from './pages/Savings'
import Kids from './pages/Kids'
import Statements from './pages/Statements'
import Family from './pages/Family'
import Admin from './pages/Admin'

// Auth y onboarding
import Auth, { FamilySetupScreen, PendingScreen } from './pages/Auth'

// Modales — v4: AccountModal reemplaza AccModal + PmModal
import {
  TxModal,
  AccountModal,   // ← UNIFICADO: antes eran AccModal + PmModal
  DebtModal,
  RecurringModal,
  GoalModal,
  KidGoalModal,
} from './pages/Modals'

// Modal de perfil — abierto desde el Header
import ProfileModal from './pages/ProfileModal'

// Mapa de páginas
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

// Tabs que muestran la FilterBar
const TABS_WITH_FILTER = new Set(['dashboard', 'transactions', 'statements'])

// ── AppInner ──────────────────────────────────────────────────────────────────
function AppInner() {
  const { onboardingState, isDemoMode, tab, modal, isKid, t } = useApp()
  const [showProfile, setShowProfile] = useState(false)

  // 1. Cargando
  if (onboardingState === 'loading') return <LoadingScreen t={t} />

  // 2. No autenticado
  if (onboardingState === 'unauthenticated') return <Auth />

  // 3. Sin perfil en BD (trigger falló)
  if (onboardingState === 'no_profile') return <NoProfileScreen />

  // 4. Sin familia — mostrar onboarding de familia
  if (onboardingState === 'no_family') return <FamilySetupScreen />

  // 5. En familia pero pendiente de aprobación
  if (onboardingState === 'pending') return <PendingScreen />

  // 6. Vista de niño — interfaz simplificada
  if (isKid) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header onOpenProfile={() => setShowProfile(true)} />
        <main style={{ padding: '16px 12px', maxWidth: 500, margin: '0 auto', paddingBottom: 20 }}>
          <Kids />
        </main>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </div>
    )
  }

  // 7. Layout completo — adulto activo con familia
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Header onOpenProfile={() => setShowProfile(true)} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '18px 16px',
          maxWidth: 980, width: '100%', margin: '0 auto', paddingBottom: 80,
        }}>
          {isDemoMode && <DemoBanner />}
          {TABS_WITH_FILTER.has(tab) && <FilterBar />}
          <div className="slide-in" key={tab}>
            {PAGE_MAP[tab] ?? <Dashboard />}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* ── MODALES GLOBALES ─────────────────────────────────────────────
          v4: modal === 'account' → AccountModal unificado
          Ya no existe modal === 'acc' ni modal === 'pm'
      ──────────────────────────────────────────────────────────────── */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Nueva transacción */}
      {modal === 'tx' && <TxModal />}

      {/* Nueva cuenta — v4: UN SOLO modal para cualquier tipo de cuenta
          Reemplaza: modal === 'acc' (cuentas) y modal === 'pm' (tarjetas)
          El AccountModal muestra campos distintos según el subtype elegido */}
      {modal === 'account' && <AccountModal />}

      {/* Nueva deuda de largo plazo (hipoteca, auto, préstamo) */}
      {modal === 'debt' && <DebtModal />}

      {/* Nuevo pago recurrente */}
      {modal === 'recurring' && <RecurringModal />}

      {/* Nueva meta de ahorro adultos */}
      {modal === 'goal' && <GoalModal />}

      {/* Nueva meta de ahorro niños */}
      {modal === 'kidGoal' && <KidGoalModal />}
    </div>
  )
}

// ── Pantallas auxiliares ───────────────────────────────────────────────────────
function LoadingScreen({ t }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <style>{`
        @keyframes mf-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes mf-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900,
        background: 'linear-gradient(135deg,#4f7cff,#a78bfa)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        MiFinanza
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border)', borderTop: '3px solid #4f7cff',
        animation: 'mf-spin .8s linear infinite',
      }} />
      <div style={{ color: 'var(--muted)', fontSize: 13, animation: 'mf-pulse 1.5s ease-in-out infinite' }}>
        {t?.loading || 'Cargando...'}
      </div>
    </div>
  )
}

function NoProfileScreen() {
  const { signOut } = useApp()
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 32, maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
          Error de configuración
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
          Tu cuenta fue creada en Supabase Auth, pero no se pudo crear el perfil en la base de datos.
        </div>
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 16px', textAlign: 'left',
          fontSize: 12, color: 'var(--muted)', lineHeight: 1.9, marginBottom: 20,
        }}>
          <strong style={{ color: 'var(--text)' }}>Solución:</strong><br />
          1. Abre el <strong style={{ color: '#4f7cff' }}>SQL Editor</strong> de Supabase<br />
          2. Ejecuta <code style={{ color: 'var(--yellow)' }}>schema_v4.sql</code><br />
          3. Verifica que el trigger <code>handle_new_user</code> esté activo<br />
          4. Cierra sesión y regístrate de nuevo
        </div>
        <button onClick={signOut} style={{
          background: '#ff6b6b14', border: '1px solid #ff6b6b33',
          borderRadius: 10, padding: '10px 20px', color: '#ff6b6b',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--font-body)', width: '100%',
        }}>
          Cerrar sesión e intentar de nuevo
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}