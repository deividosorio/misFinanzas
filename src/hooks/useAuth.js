// src/hooks/useAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// PROPÓSITO: Hook custom que encapsula toda la lógica de autenticación.
//
// RESPONSABILIDADES:
//   - Gestionar sesión de Supabase
//   - Cargar y validar perfil del usuario
//   - Asignar estado de onboarding según el contexto
//   - Exponer métodos simples: login, register, logout, reloadProfile, etc.
//
// RETORNA: {
//   user,              // objeto auth.users de Supabase
//   profile,           // perfil del usuario en profiles table
//   family,            // familia a la que pertenece
//   loading,           // boolean — están cargando datos
//   onboardingState,   // 'loading' | 'unauthenticated' | 'no_profile' | 'no_family' | 'pending' | 'ready'
//   login,             // async (email, password) → void
//   register,          // async (name, email, password) → void
//   logout,            // async () → void
//   reloadProfile,     // async () → void (útil después de signUp/familyCreate)
//   createFamily,      // async (name, currency) → void
//   joinFamily,        // async (inviteCode) → void
// }
//
// MÁQUINA DE ESTADOS (onboardingState):
//
//   loading
//     ↓
//   ┌─────────────────────────────────────────┐
//   │                                         │
//   unauthenticated          no_profile       │ (error: trigger falló)
//   ↓                         ↓               │
//   login/register ──→ no_family (sin familia)
//                       ↓         ↓
//                  createFamily  joinFamily
//                       ↓         ↓
//                    pending ←────┘ (esperando aprobación)
//                       ↓
//                    ready (usuario activo)
//
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth () {
  // ── Estado ──────────────────────────────────────────────────────────────
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [family, setFamily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingState, setOnboardingState] = useState('loading')

  // Flag para evitar race conditions (solo un resolveProfile a la vez)
  const resolvingRef = useRef(false)

  // Ref para manejar el timer de inactividad
  const idleTimerRef = useRef(null)
  const IDLE_LIMIT = 5 * 60 * 1000 // 5 minutos

  // ── Funciones Internas ──────────────────────────────────────────────────

  /**
   * NÚCLEO: Carga perfil, lo crea si no existe, asigna familia, y determina
   * el estado de onboarding.
   *
   * PASOS:
   *   1. Cargar perfil de BD
   *   2. Si no existe → crearlo
   *   3. Si tiene familia → cargarla
   *   4. Determinar onboarding state según contexto
   */

  const resolveProfile = useCallback(async authUser => {
    // No user
      if (!authUser) {
        setOnboardingState('unauthenticated')
        setLoading(false)
      return
      }

    try {
      // PASO 1: Intentar cargar perfil
      let { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      // PASO 2: Si no existe, crearlo (el trigger falló, caso raro)
      if (pErr?.code === 'PGRST116' || !prof) {
        const displayName =
          authUser.user_metadata?.display_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          'Usuario'

        const { data: newProf, error: insErr } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            display_name: displayName,
            role: 'member',
            status: 'active',
            is_kid: false,
            avatar_emoji: '🧑',
            avatar_color: '#4f7cff',
            lang: 'es',
            theme: 'dark'
          })
          .select()
          .single()

        if (insErr) {
          console.error('[MiFinanza] Error creando perfil:', insErr.message)
          setOnboardingState('no_profile')
          setLoading(false)
          return
        }
        prof = newProf
      } else if (pErr) {
        console.error('[MiFinanza] Error cargando perfil:', pErr.message)
        setOnboardingState('unauthenticated')
        setLoading(false)
        return
      }

      // Asegurar que el rol no esté vacío
      if (!prof.role) {
        await supabase
          .from('profiles')
          .update({ role: 'member' })
          .eq('id', authUser.id)
        prof = { ...prof, role: 'member' }
      }

      setProfile(prof)

      // PASO 3: Determinar onboarding state según familia y status
      if (!prof.family_id) {
        // Usuario sin familia → debe crear o unirse
        setOnboardingState('no_family')
        setFamily(null)
        setLoading(false)
        return
      }

      // Usuario tiene familia → cargarla
      const { data: fam, error: fErr } = await supabase
        .from('families')
        .select('*')
        .eq('id', prof.family_id)
        .single()

      if (fErr || !fam) {
        // Familia no existe → resetear
        await supabase
          .from('profiles')
          .update({ family_id: null })
          .eq('id', authUser.id)
        setProfile(prev => (prev ? { ...prev, family_id: null } : prev))
        setOnboardingState('no_family')
        setLoading(false)
        return
      }

      setFamily(fam)

      // PASO 4: Verificar si está pendiente de aprobación
      if (prof.status === 'pending') {
        setOnboardingState('pending')
      } else {
        // Usuario completamente activo
        setOnboardingState('ready')
      }

      setLoading(false)
    } catch (err) {
      console.error('[MiFinanza] resolveProfile error:', err)
      setOnboardingState('unauthenticated')
      setLoading(false)
    }
  }, [])


  // ── EFECTO: Inicializar autenticación ────────────────────────────────
  useEffect(() => {
    let cancelled = false

    // TIMEOUT DE SEGURIDAD: 5 segundos máximo para cargar
    const safetyTimeout = setTimeout(() => {
      if (!cancelled && loading) {
        console.warn('[MiFinanza] Auth timeout — mostrando login')
        setLoading(false)
        setOnboardingState('unauthenticated')
      }
    }, 5000)

    // FUENTE DE VERDAD INICIAL: getSession()
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (cancelled) return
      clearTimeout(safetyTimeout)

      // ❌ No hay sesión → reset total
      if (error || !session?.user || isTokenExpired(session)) {
        hardResetAuth()
        return
      }

      setUser(session.user)
      resolvingRef.current = true
      try {
        await resolveProfile(session.user)
      } finally {
        resolvingRef.current = false
      }
    })

    // OBSERVADOR DE CAMBIOS: onAuthStateChange()
    // Solo procesa cambios DESPUÉS de que getSession() haya resuelto.
    // Ignora INITIAL_SESSION (ya manejado por getSession).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return

      // Ignorar el evento inicial
      if (event === 'INITIAL_SESSION') return

      // LIMPIEZA DE CACHÉ: Evitar datos residuales en cambios de sesión en PWA
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
      }

      // REVALIDACIÓN DE SESIÓN: Si el token está expirado, forzar logout
      if (session && isTokenExpired(session)) {
        await logout()
        return
      }

      // Si estamos en el proceso inicial, ignorar SIGNED_IN
      if (event === 'SIGNED_IN' && resolvingRef.current) return

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setProfile(null)
        setFamily(null)
        setOnboardingState('unauthenticated')
        setLoading(false)
        hardResetAuth() // Limpiar todo para evitar datos residuales
        return
      }

      // Procesar cambios: TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
      if (
        [
          'TOKEN_REFRESHED',
          'USER_UPDATED',
          'PASSWORD_RECOVERY',
          'SIGNED_IN'
        ].includes(event)
      ) {
        setUser(session.user)
        if (!resolvingRef.current) {
          resolvingRef.current = true
          try {
            await resolveProfile(session.user)
          } finally {
            resolvingRef.current = false
          }
        }
      }
    })

    return () => {
      cancelled = true
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [resolveProfile])

  // ── Métodos Públicos ────────────────────────────────────────────────────

  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true)
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          })

        if (signInError) {
          setLoading(false)
          return { error: signInError }
        }

        if (data?.session?.user) {
          setUser(data.session.user)
          resolvingRef.current = true
          try {
            await resolveProfile(data.session.user)
          } finally {
            resolvingRef.current = false
          }
        }

        return { error: null }
      } catch (err) {
        console.error('[MiFinanza] login error:', err)
        setLoading(false)
        return { error: err }
      }
    },
    [resolveProfile]
  )

  const register = useCallback(
    async (name, email, password) => {
      try {
        setLoading(true)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim(), lang: 'es' },
            emailRedirectTo: window.location.origin
          }
        })

        if (signUpError) {
          setLoading(false)
          return { error: signUpError }
        }

        // Si el email está confirmado automáticamente, cargar el perfil
        if (data?.session?.user) {
          setUser(data.session.user)
          resolvingRef.current = true
          try {
            await resolveProfile(data.session.user)
          } finally {
            resolvingRef.current = false
          }
        } else {
          // Si requiere confirmación de email, esperar a que confirme
          setLoading(false)
        }

        return { error: null }
      } catch (err) {
        console.error('[MiFinanza] register error:', err)
        setLoading(false)
        return { error: err }
      }
    },
    [resolveProfile]
  )

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setFamily(null)
    setOnboardingState('unauthenticated')
    setLoading(false)
    hardResetAuth()
  }, [])

  const reloadProfile = useCallback(async () => {
    console.log('[MiFinanza] useAuth reloadProfile: recargando perfil...')
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      console.log('[MiFinanza] useAuth reloadProfile: getSession result:', { session, error })
      // ❌ No hay sesión → reset total
      if (error || !user || !session || isTokenExpired(session)) {
        console.log('[MiFinanza] useAuth reloadProfile: Session invalida o expirada')
        await logout()
        return
      }

      console.log('[MiFinanza] useAuth reloadProfile: Found session for user:', session.user)
      setUser(session.user)
      resolvingRef.current = true
      try {
        console.log('[MiFinanza] useAuth reloadProfile: Resolving profile for user:', session.user)
        await resolveProfile(session.user)
      } finally {
        resolvingRef.current = false
      }
    } catch (err) {
      console.error('[MiFinanza] useAuth reloadProfile: Error reloading profile:', err)
      await logout()
    }
  }, [resolveProfile, logout])

  const createFamily = useCallback(
    async (name, currency = 'CAD') => {
      try {
        const { data, error } = await supabase.rpc('rpc_create_family', {
          p_name: name.trim(),
          p_currency: currency,
          p_locale: 'es'
        })

        if (!error) {
          await reloadProfile()
        }

        return { data, error }
      } catch (err) {
        console.error('[MiFinanza] createFamily error:', err)
        return { error: err }
      }
    },
    [reloadProfile]
  )

  const joinFamily = useCallback(
    async inviteCode => {
      try {
        const { data, error } = await supabase.rpc('rpc_join_family', {
          p_invite_code: inviteCode.trim().toLowerCase()
        })

        if (!error) {
          await reloadProfile()
        }

        return { data, error }
      } catch (err) {
        console.error('[MiFinanza] joinFamily error:', err)
        return { error: err }
      }
    },
    [reloadProfile]
  )

  const isTokenExpired = session => {
    if (!session?.expires_at) return true

    const now = Math.floor(Date.now() / 1000)
    return session.expires_at <= now
  }

  const hardResetAuth = () => {
    console.warn('[MiFinanza] HARD RESET AUTH — limpiando todo')

    setUser(null)
    setProfile(null)
    setFamily(null)
    setOnboardingState('unauthenticated')
    setLoading(false)

    // Opcional: limpiar storage local
    localStorage.removeItem('supabase.auth.token')
    localStorage.removeItem('mifinanza-cache')

    localStorage.clear()
    sessionStorage.clear()

    // cookies (opcional)
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
    })
  }

  // Función para resetear el timer de inactividad
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    idleTimerRef.current = setTimeout(async () => {
      console.warn('[MiFinanza] Sesión cerrada por inactividad')
      await logout()
      hardResetAuth()
    }, IDLE_LIMIT)
  }, [logout])

  // ── EFECTO: Manejar inactividad del usuario ─────────────────────────────
  useEffect(() => {
    if (!user) return

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

    const handleActivity = () => {
      resetIdleTimer()
    }

    events.forEach(event => window.addEventListener(event, handleActivity))

    // iniciar timer al montar
    resetIdleTimer()

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [user, resetIdleTimer])

  return {
    user,
    profile,
    family,
    loading,
    onboardingState,
    login,
    register,
    logout,
    reloadProfile,
    createFamily,
    joinFamily
  }
}
