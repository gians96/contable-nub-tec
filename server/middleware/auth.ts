import jwt from 'jsonwebtoken'

/**
 * Autenticación de las rutas API.
 *
 * La lista de rutas públicas es explícita: antes se dejaba pasar todo
 * `/api/auth/*`, lo que dejaría sin guardia a endpoints como el cambio de
 * contraseña, que necesita `event.context.auth`.
 */
const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return
  if (PUBLIC_PATHS.has(path)) return

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
