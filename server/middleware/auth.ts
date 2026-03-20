import jwt from 'jsonwebtoken'

/**
 * Middleware de autenticación para rutas API.
 * Excluye: /api/auth/login
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // No proteger login
  if (path === '/api/auth/login') return

  // Solo proteger rutas /api/ (excepto auth)
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return

  const token = getCookie(event, 'auth_token')

  if (!token) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  try {
    const secret = useRuntimeConfig().authSecret
    const decoded = jwt.verify(token, secret) as { userId: number; username: string }
    event.context.auth = decoded
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido o expirado' })
  }
})
