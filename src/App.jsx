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
import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'

// ── Componentes de layout ─────────────────────────────────────────────────────
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import FilterBar from './components/layout/FilterBar'

// ── Componentes UI compartidos ────────────────────────────────────────────────
import { DemoBanner } from './components/ui/Badges'

// ── Páginas principales ───────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Debts from './pages/Debts'
import Recurring from './pages/Recurring'
import Savings from './pages/Savings'
import Kids from './pages/Kids'
import Statements from './pages/Statements'
import Family from './pages/Family'
import Admin from './pages/Admin'

// ── Pantallas de autenticación y onboarding ───────────────────────────────────
// Auth.jsx exporta: default (Auth), FamilySetupScreen, PendingScreen
import Auth, {
  FamilySetupScreen,
  PendingScreen,
} from './pages/Auth'

// ── Modal de perfil de usuario ────────────────────────────────────────────────
// Se abre al hacer clic en el avatar del Header.
// Contiene: nombre, avatar, idioma, tema, cambio de contraseña, logout.
import ProfileModal from './pages/ProfileModal'

// ── Modales de creación de registros ─────────────────────────────────────────
// Se renderizan aquí (en la raíz) para garantizar z-index correcto.
import {
  TxModal,
  AccModal,
  PmModal,
  DebtModal,
  RecurringModal,
  GoalModal,
  KidGoalModal,
} from './pages/Modals'

// ─────────────────────────────────────────────────────────────────────────────
// MAPA DE PÁGINAS
// Cada clave corresponde a un valor posible de `tab` en AppContext.
// Se define fuera del componente para evitar recrearlo en cada render.
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_MAP = {
  dashboard: <Dashboard />,
  transactions: <Transactions />,
  debts: <Debts />,
  recurring: <Recurring />,
  savings: <Savings />,
  kids: <Kids parentView />,  // Vista de padres (ver metas de niños)
  statements: <Statements />,
  family: <Family />,
  admin: <Admin />,
}

// Tabs que muestran la FilterBar (selector de período y filtros de cuenta)
// Solo tienen sentido en páginas con gráficas o listas temporales.
const TABS_WITH_FILTER = new Set(['dashboard', 'transactions', 'statements'])

// ─────────────────────────────────────────────────────────────────────────────
// AppInner — Componente con acceso al contexto
// Se separa de App para poder usar useApp() dentro del Provider.
// ─────────────────────────────────────────────────────────────────────────────
function AppInner() {
  const {
    onboardingState,  // Estado del onboarding/auth (ver árbol de decisión arriba)
    isDemoMode,       // true = sin Supabase, datos de ejemplo
    tab,              // Página activa ('dashboard', 'transactions', etc.)
    modal,            // Modal activo (null | 'tx' | 'acc' | 'debt' | ...)
    isKid,            // true = el usuario actual es un niño
    t,                // Traducciones del idioma activo
  } = useApp()

  // ── Estado local: modal de perfil ─────────────────────────────────────────
  // El ProfileModal se controla con estado local (no en AppContext) porque
  // solo lo abre el Header y no necesita ser visible desde otras páginas.
  const [showProfileModal, setShowProfileModal] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // ÁRBOL DE DECISIÓN — qué pantalla mostrar
  // ─────────────────────────────────────────────────────────────────────────

  // ── 1. CARGANDO ──────────────────────────────────────────────────────────
  // Supabase está verificando la sesión existente.
  // AppContext tiene un timeout de 8 segundos para no quedarse colgado.
  if (onboardingState === 'loading') {
    return <LoadingScreen t={t} />
  }

  // ── 2. NO AUTENTICADO ────────────────────────────────────────────────────
  // No hay sesión activa → mostrar pantallas de Login/Register.
  // En modo demo nunca se llega aquí (siempre hay sesión simulada).
  if (onboardingState === 'unauthenticated') {
    return <Auth />
  }

  // ── 3. SIN PERFIL EN BASE DE DATOS ───────────────────────────────────────
  // Caso raro: hay sesión pero el trigger handle_new_user() no creó el perfil.
  // AppContext.jsx intenta crearlo manualmente, pero si falla muestra esto.
  if (onboardingState === 'no_profile') {
    return <NoProfileScreen />
  }

  // ── 4. SIN FAMILIA ASIGNADA ───────────────────────────────────────────────
  // El usuario se registró (profile.family_id = null).
  // Debe crear una familia nueva o unirse a una existente con código.
  if (onboardingState === 'no_family') {
    return <FamilySetupScreen />
  }

  // ── 5. PENDIENTE DE APROBACIÓN ────────────────────────────────────────────
  // Se unió a una familia con código pero status = 'pending'.
  // El admin de la familia debe aprobarlo desde Family.jsx → Miembros.
  if (onboardingState === 'pending') {
    return <PendingScreen />
  }

  // ── 6. VISTA DE NIÑO ──────────────────────────────────────────────────────
  // Usuarios con is_kid=true ven solo la interfaz gamificada de Kids.
  // No tienen acceso al sidebar ni a las páginas de finanzas adultos.
  if (isKid) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Header onOpenProfile={() => setShowProfileModal(true)} />
        <main style={{
          padding: '16px 12px',
          maxWidth: 500,
          margin: '0 auto',
          paddingBottom: 20,
        }}>
          {/* Vista sin parentView → interfaz gamificada del niño */}
          <Kids />
        </main>

        {/* El niño también puede cambiar su perfil (emoji, idioma) */}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    )
  }

  // ── 7. LAYOUT COMPLETO (usuario adulto con familia activa) ─────────────────
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
    }}>

      {/* ─── HEADER ────────────────────────────────────────────────────────
           Barra superior sticky con:
           - Logo + nombre de familia + badge de plan
           - Badge de miembros pendientes (solo admin/owner)
           - Selector de idioma (ES/EN/FR)
           - Avatar del usuario → abre ProfileModal al hacer clic
          ──────────────────────────────────────────────────────────────── */}
      <Header onOpenProfile={() => setShowProfileModal(true)} />

      {/* ─── ÁREA PRINCIPAL ────────────────────────────────────────────────
           Flex row: Sidebar (desktop) + Main (contenido scrolleable)
          ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── SIDEBAR ──────────────────────────────────────────────────
             Navegación lateral visible en desktop (≥769px).
             En mobile se reemplaza por BottomNav.
             Se oculta con la clase .hide-mobile de index.css.
            ─────────────────────────────────────────────────────────── */}
        <Sidebar />

        {/* ─── CONTENIDO PRINCIPAL ──────────────────────────────────────
             Área scrolleable donde se renderiza la página activa.
             - paddingBottom: 80px → espacio para BottomNav en mobile
             - maxWidth: 980px → limitar el ancho en pantallas grandes
            ─────────────────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px',
          maxWidth: 980,
          width: '100%',
          margin: '0 auto',
          paddingBottom: 80,
        }}>

          {/* Banner de modo demo — solo visible cuando no hay Supabase */}
          {isDemoMode && <DemoBanner />}

          {/* FilterBar — solo en páginas con filtros de período y cuenta */}
          {TABS_WITH_FILTER.has(tab) && <FilterBar />}

          {/* Página activa con animación de entrada (clase slide-in de index.css) */}
          <div className="slide-in" key={tab}>
            {PAGE_MAP[tab] ?? <Dashboard />}
          </div>
        </main>
      </div>

      {/* ─── BOTTOM NAV ────────────────────────────────────────────────────
           Barra de navegación inferior para mobile (≤768px).
           En desktop se reemplaza por Sidebar.
          ──────────────────────────────────────────────────────────────── */}
      <BottomNav />

      {/* ═══════════════════════════════════════════════════════════════════
          MODALES
          Se renderizan en la raíz del árbol para garantizar z-index correcto.
          Ningún modal se renderiza dentro de una página o tarjeta.
          El valor de `modal` en AppContext determina cuál está abierto.
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Modal de perfil del usuario
          Abierto: Header → clic en avatar → setShowProfileModal(true)
          Contiene: nombre, emoji, color, idioma, tema, contraseña, logout */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Modal: Nueva transacción (income / expense / saving)
          Abierto desde: Dashboard, Transactions, o cualquier Btn que llame openModal('tx') */}
      {modal === 'tx' && <TxModal />}

      {/* Modal: Nueva cuenta bancaria o de inversión
          Solo visible para admin/owner — AccModal verifica internamente el rol */}
      {modal === 'acc' && <AccModal />}

      {/* Modal: Nueva tarjeta de crédito / débito / forma de pago
          Solo visible para admin/owner */}
      {modal === 'pm' && <PmModal />}

      {/* Modal: Nueva deuda (hipoteca, auto, préstamo) */}
      {modal === 'debt' && <DebtModal />}

      {/* Modal: Nuevo pago recurrente (servicios, seguros, etc.)
          Incluye selector de deuda vinculada (linked_debt_id) */}
      {modal === 'recurring' && <RecurringModal />}

      {/* Modal: Nueva meta de ahorro para adultos */}
      {modal === 'goal' && <GoalModal />}

      {/* Modal: Nueva meta de ahorro para niños (con emoji, color, mensaje de ánimo) */}
      {modal === 'kidGoal' && <KidGoalModal />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLAS AUXILIARES
// Componentes simples que se muestran en estados especiales del onboarding.
// Se definen aquí (no en archivos separados) porque son pequeños y específicos.
// ─────────────────────────────────────────────────────────────────────────────

// ── LoadingScreen ─────────────────────────────────────────────────────────────
/**
 * Pantalla de carga mientras Supabase verifica la sesión.
 * Desaparece automáticamente cuando onboardingState cambia a otro valor.
 * Si tarda más de 8 segundos (timeout en AppContext), cambia a 'unauthenticated'.
 *
 * @param {object} t - Traducciones del idioma activo (puede ser undefined al inicio)
 */
function LoadingScreen({ t }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    }}>
      {/* CSS de la animación — definido inline para no depender de index.css */}
      <style>{`
        @keyframes mf-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes mf-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Logo con gradiente — igual que en Header */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 32,
        fontWeight: 900,
        background: 'linear-gradient(135deg, #4f7cff, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        userSelect: 'none',
      }}>
        MiFinanza
      </div>

      {/* Indicador de carga circular */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTop: '3px solid #4f7cff',
        animation: 'mf-spin 0.8s linear infinite',
      }} />

      {/* Texto de estado */}
      <div style={{
        color: 'var(--muted)',
        fontSize: 13,
        animation: 'mf-pulse 1.5s ease-in-out infinite',
      }}>
        {t?.loading ?? 'Cargando...'}
      </div>
    </div>
  )
}

// ── NoProfileScreen ───────────────────────────────────────────────────────────
/**
 * Pantalla de error cuando hay sesión pero no se pudo crear/cargar el perfil.
 * Esto ocurre cuando:
 *   - El trigger handle_new_user() falló en PostgreSQL
 *   - El INSERT manual de rescate en AppContext también falló
 *   - El schema de Supabase no está instalado correctamente
 *
 * SOLUCIÓN TÍPICA: Ejecutar el schema_v3.sql en Supabase SQL Editor.
 */
function NoProfileScreen() {
  const { signOut } = useApp()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: 32,
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 18,
          marginBottom: 10,
        }}>
          Error de configuración
        </div>

        <div style={{
          color: 'var(--muted)',
          fontSize: 13,
          lineHeight: 1.7,
          marginBottom: 20,
        }}>
          Tu cuenta fue creada en Supabase Auth, pero no se pudo crear
          tu perfil en la base de datos.
        </div>

        {/* Instrucciones de solución */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 16px',
          textAlign: 'left',
          fontSize: 12,
          color: 'var(--muted)',
          lineHeight: 1.9,
          marginBottom: 20,
        }}>
          <strong style={{ color: 'var(--text)' }}>Solución:</strong><br />
          1. Abre el <strong style={{ color: '#4f7cff' }}>SQL Editor</strong> de Supabase<br />
          2. Ejecuta el archivo <code style={{ color: 'var(--yellow)' }}>schema_v3.sql</code><br />
          3. Verifica que el trigger <code>handle_new_user</code> esté activo<br />
          4. Cierra sesión y regístrate de nuevo
        </div>

        <button
          onClick={signOut}
          style={{
            background: '#ff6b6b14',
            border: '1px solid #ff6b6b33',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#ff6b6b',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            width: '100%',
          }}
        >
          Cerrar sesión e intentar de nuevo
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App — Componente raíz exportado
// ─────────────────────────────────────────────────────────────────────────────
/**
 * App envuelve AppInner en AppProvider para que useApp() funcione.
 *
 * AppProvider NO puede llamar a useApp() (circular dependency),
 * por eso existe la separación App → AppProvider → AppInner.
 *
 * Árbol de componentes:
 *   <App>
 *     <AppProvider>          ← provee el contexto global
 *       <AppInner>           ← consume el contexto, decide qué renderizar
 *         <Header>
 *           <ProfileModal>   ← estado local en AppInner
 *         <Sidebar>
 *         <main>
 *           <FilterBar>
 *           <Page />         ← página activa del PAGE_MAP
 *         <BottomNav>
 *         <TxModal>          ← controlados por AppContext.modal
 *         <AccModal>
 *         ...
 */
export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}