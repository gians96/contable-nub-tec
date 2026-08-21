import type { H3Event } from 'h3'
import type { CompanyRole, User } from '@prisma/client'

/**
 * Usuario autenticado de la petición, leído del JWT que dejó `0.auth.ts`.
 */
export function requireAuth(event: H3Event): { userId: number; username: string } {
  const auth = event.context.auth
  if (!auth?.userId) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }
  return auth
}

/**
 * Usuario completo. Lo carga `1.tenant.ts` una sola vez por petición desde la
 * base de datos: no se confía en el token, que dura 7 días y no lleva rol, así
 * que degradar o desactivar a alguien surte efecto de inmediato.
 */
export function currentUser(event: H3Event): User {
  requireAuth(event)
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'La sesión ya no es válida' })
  }
  return user
}

export function isPlatformAdmin(event: H3Event): boolean {
  return event.context.user?.platformRole === 'SUPERADMIN'
}

export function requirePlatformAdmin(event: H3Event): User {
  const user = currentUser(event)
  if (user.platformRole !== 'SUPERADMIN') {
    throw createError({ statusCode: 403, message: 'Necesitas permisos de plataforma' })
  }
  return user
}

// ─── ROLES DENTRO DE LA EMPRESA ACTIVA ─────────────────

export function currentCompanyRole(event: H3Event): CompanyRole {
  const role = event.context.membershipRole
  if (!role) {
    throw createError({ statusCode: 409, message: 'No hay empresa activa' })
  }
  return role
}

export function requireCompanyRole(event: H3Event, ...roles: CompanyRole[]): CompanyRole {
  const role = currentCompanyRole(event)
  if (!roles.includes(role)) {
    throw createError({ statusCode: 403, message: 'No tienes permisos suficientes en esta empresa' })
  }
  return role
}

/** Gestiona miembros y configuración. */
export function requireCompanyAdmin(event: H3Event): CompanyRole {
  return requireCompanyRole(event, 'OWNER', 'ADMIN')
}

/** Registra y edita datos contables. */
export function requireCompanyWrite(event: H3Event): CompanyRole {
  return requireCompanyRole(event, 'OWNER', 'ADMIN', 'CONTADOR')
}

export function requireCompanyOwner(event: H3Event): CompanyRole {
  return requireCompanyRole(event, 'OWNER')
}

// ─── PROYECCIONES SEGURAS ──────────────────────────────

/** Campos seguros para devolver al cliente: nunca el hash de la contraseña. */
export function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    debeCambiarPassword: user.debeCambiarPassword,
    platformRole: user.platformRole,
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

/** Contraseña temporal legible para el alta de miembros (no hay correo). */
export function generarPasswordTemporal(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, b => alfabeto[b % alfabeto.length]).join('')
}
