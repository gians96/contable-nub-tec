import type { H3Event } from 'h3'
import type { User } from '@prisma/client'

/**
 * Usuario autenticado de la petición, leído del JWT que dejó el middleware.
 */
export function requireAuth(event: H3Event): { userId: number; username: string } {
  const auth = event.context.auth as { userId: number; username: string } | undefined
  if (!auth?.userId) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }
  return auth
}

/**
 * Usuario completo, releído de la base de datos.
 *
 * No se confía en el rol del token: los JWT vigentes duran 7 días y no lo
 * traen, así que degradar o desactivar a alguien no surtiría efecto hasta que
 * caducara su sesión.
 */
export async function currentUser(event: H3Event): Promise<User> {
  const { userId } = requireAuth(event)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw createError({ statusCode: 401, message: 'La sesión ya no es válida' })
  }
  if (!user.activo) {
    throw createError({ statusCode: 403, message: 'Usuario desactivado' })
  }

  return user
}

export async function requireAdmin(event: H3Event): Promise<User> {
  const user = await currentUser(event)
  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Necesitas permisos de administrador' })
  }
  return user
}

/** Campos seguros para devolver al cliente: nunca el hash de la contraseña. */
export function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    role: user.role,
    activo: user.activo,
    createdAt: user.createdAt,
  }
}

export const MIN_PASSWORD_LENGTH = 8

export function validarPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    })
  }
  return password
}
