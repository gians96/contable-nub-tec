import { basePrisma } from '../database/client'
import { createTenantClient } from '../database/tenant'

/**
 * Resuelve la empresa activa y prepara el cliente acotado.
 *
 * Nitro ejecuta los middlewares en orden alfabético de ruta de archivo; el
 * prefijo numérico deja explícito que este corre después de `0.auth.ts`.
 */

/** Rutas que no necesitan empresa en absoluto. */
const SIN_EMPRESA = [
  '/api/auth/change-password',
  '/api/platform/',
]

/** Rutas que la usan si existe, pero funcionan sin ella. */
const EMPRESA_OPCIONAL = [
  '/api/auth/me',
  '/api/session/company',
  '/api/companies',
]

/** Roles que pueden escribir. */
const ROLES_ESCRITURA = new Set(['OWNER', 'ADMIN', 'CONTADOR'])

function modoEmpresa(path: string): 'ninguna' | 'opcional' | 'requerida' {
  if (SIN_EMPRESA.some(p => path.startsWith(p))) return 'ninguna'
  if (EMPRESA_OPCIONAL.some(p => path === p || path.startsWith(p + '/'))) return 'opcional'
  return 'requerida'
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return

  const auth = event.context.auth
  if (!auth?.userId) return // rutas públicas: 0.auth ya decidió

  const modo = modoEmpresa(path)

  // El usuario se lee una vez por petición: antes `currentUser()` lo releía en
  // cada llamada y `requireAdmin()` volvía a llamarlo.
  const user = await basePrisma.user.findUnique({ where: { id: auth.userId } })
  if (!user) throw createError({ statusCode: 401, message: 'La sesión ya no es válida' })
  if (!user.activo) throw createError({ statusCode: 403, message: 'Usuario desactivado' })
  event.context.user = user

  if (modo === 'ninguna') return

  const solicitada = Number(getCookie(event, 'cp_company')) || null

  let membership = solicitada
    ? await basePrisma.membership.findFirst({
        where: { userId: user.id, companyId: solicitada, activo: true },
        include: { company: true },
      })
    : null

  // Fallback determinista y SIN efectos secundarios: nada de setCookie aquí.
  // El middleware de ruta del cliente llama a /api/auth/me en SSR mediante un
  // $fetch interno cuyo Set-Cookie no llega al navegador, así que una
  // "auto-curación" por cookie nunca se vería. Al recalcularse igual en cada
  // petición, una cookie obsoleta deja de importar.
  if (!membership) {
    membership = await basePrisma.membership.findFirst({
      where: { userId: user.id, activo: true },
      include: { company: true },
      orderBy: [{ role: 'asc' }, { company: { razonSocial: 'asc' } }, { companyId: 'asc' }],
    })
  }

  let company = membership?.company ?? null
  let role = membership?.role ?? null

  // Un superadmin puede entrar a cualquier empresa aunque no sea miembro.
  if (!company && user.platformRole === 'SUPERADMIN') {
    company = solicitada
      ? await basePrisma.company.findUnique({ where: { id: solicitada } })
      : await basePrisma.company.findFirst({ orderBy: { id: 'asc' } })
    if (company) role = 'OWNER'
  }

  if (!company || !role) {
    if (modo === 'opcional') return
    throw createError({
      statusCode: 409,
      message: 'No perteneces a ninguna empresa. Crea una o pide acceso a un administrador.',
      data: { code: 'NO_COMPANY' },
    })
  }

  const escribe = !['GET', 'HEAD'].includes(event.method)

  if (modo === 'requerida' && escribe) {
    // Un solo punto cubre todos los endpoints mutantes, presentes y futuros.
    if (!ROLES_ESCRITURA.has(role)) {
      throw createError({ statusCode: 403, message: 'Tu rol en esta empresa es de solo lectura' })
    }
    // Una empresa suspendida puede leerse y exportarse — que puedan sacar su
    // contabilidad — pero no recibir escrituras.
    if (company.estado === 'SUSPENDIDA') {
      throw createError({
        statusCode: 403,
        message: 'La empresa está suspendida: solo se permite consultar y exportar',
        data: { code: 'COMPANY_SUSPENDED' },
      })
    }
  }

  event.context.company = company
  event.context.membershipRole = role
  event.context.db = createTenantClient(company.id, role)
})
