/**
 * Middleware global: redirige a /login si no está autenticado.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const headers = useRequestHeaders(['cookie'])

  try {
    await $fetch('/api/auth/me', { headers })
  } catch {
    return navigateTo('/login')
  }
})
