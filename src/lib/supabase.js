// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Crear y exportar el cliente de Supabase.
//
// Este archivo es el único punto de contacto entre la app y Supabase.
// Centralizar aquí la creación del cliente permite:
//   - Modo demo: si no hay variables de entorno, supabase = null
//     y la app funciona con datos de ejemplo sin errores.
//   - Modo producción: si hay variables, crea el cliente real.
//   - Wrappers helper: funciones rpc() y query() con manejo de errores
//     uniforme para que el resto del código no tenga try/catch repetido.
//
// MODO DEMO vs MODO PRODUCCIÓN:
//   - Si VITE_SUPABASE_URL no está configurada → supabase = null
//   - AppContext.jsx detecta esto con: const isDemoMode = !supabase
//   - En modo demo, todas las mutaciones operan sobre el estado local (useState)
//   - En modo producción, las mutaciones llaman a supabase.rpc() o supabase.from()
//
// SEGURIDAD:
//   - Solo se usa la clave “anon” (pública). Nunca la “service_role”.
//   - La clave anon está protegida por las políticas RLS en Supabase.
//   - RLS garantiza que cada usuario solo vea datos de su familia.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

// Leer variables de entorno — Vite expone solo las que empiezan con VITE_
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Advertencia en consola si no están configuradas (solo en desarrollo)
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
        '⚠️  [MiFinanza] Variables de Supabase no encontradas.\n' +
        '   Copia .env.local.example → .env.local y agrega tus claves.\n' +
        '   La app correrá en MODO DEMO con datos de ejemplo.'
    )
}

/**

- supabase — Cliente de Supabase o null en modo demo.
- 
- El resto de la app debe verificar:
 * Siempre verificar antes de usar:
 *   if (!supabase) { // modo demo }
 *   else { // producción }
 *
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        // Persiste la sesión en localStorage para que el usuario
        // no tenga que re-autenticarse al recargar la página
        persistSession:    true,
        // Detecta el hash #access_token en la URL después de
        // confirmar email o hacer reset de contraseña
        detectSessionInUrl: true,
        // Refresca el token automáticamente antes de que expire
        autoRefreshToken:  true,
      },
    })
  : null

// ── WRAPPERS CON MANEJO DE ERRORES ────────────────────────────────────────

/**

- rpc — Llama a una función RPC de Supabase (función PostgreSQL).
- 
- Las funciones RPC contienen toda la lógica de negocio en el servidor:
- - rpc_add_transaction → valida y guarda una transacción
- - rpc_dashboard_summary → calcula KPIs del período
- - rpc_pay_debt → registra un pago de deuda
- - etc. (ver archivo 02-double-entry-schema.sql)
- 
- Ventajas de RPC vs. queries directas desde el frontend:
- - La lógica vive en PostgreSQL (auditable, segura, sin duplicación)
- - El frontend nunca manipula directamente las tablas
- - Errores de negocio llegan como excepciones SQL claras
- 
- @param {string} fn - Nombre de la función RPC (ej: 'rpc_add_transaction')
- @param {object} params - Parámetros de la función
- @returns {Promise<{data: any, error: any}>}
  */
export async function rpc(fn, params = {}) {
    if (!supabase) return { data: null, error: new Error('No Supabase client (demo mode)') }

    const { data, error } = await supabase.rpc(fn, params)

    if (error) {
        console.error(`[RPC Error] ${fn}:`, error.message)
    }

    return { data, error }
}

/**

- query — Consulta simple a una tabla de Supabase.
- 
- Para consultas que no requieren lógica de negocio compleja,
- como listar todas las cuentas de una familia o buscar el perfil.
- 
- @param {string} table - Nombre de la tabla (ej: 'accounts')
- @param {object} filters - Filtros eq: { family_id: 'uuid', is_active: true }
- @param {string} orderBy - Campo por el que ordenar (default: 'created_at')
- @returns {Promise<{data: Array, error: any}>}
  */
export async function query(table, filters = {}, orderBy = 'created_at') {
    if (!supabase) return { data: [], error: null }

    let q = supabase.from(table).select('*')

    // Aplicar filtros dinámicamente
    Object.entries(filters).forEach(([col, val]) => {
        q = q.eq(col, val)
    })

    const { data, error } = await q.order(orderBy, { ascending: false })

    if (error) {
        console.error(`[Query Error] ${table}:`, error.message)
    }

    return { data: data || [], error }
}
