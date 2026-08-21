/**
 * Middleware global: redirige a /login si no está autenticado.
 *
 * El resultado se guarda en el estado de sesión: antes se descartaba y el layout
 * repetía la misma petición en cada carga.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { user } = useAuth()
  const headers = useRequestHeaders(['cookie'])

  try {
    user.value = await $fetch<SessionUser>('/api/auth/me', { headers })
  } catch {
    user.value = null
    return navigateTo('/login')
  }
})
