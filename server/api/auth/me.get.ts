import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')

  if (!token) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  try {
    const secret = useRuntimeConfig().authSecret
    const decoded = jwt.verify(token, secret) as { userId: number; username: string }
    return { id: decoded.userId, username: decoded.username }
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido o expirado' })
  }
})
