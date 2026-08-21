import { basePrisma } from '../../../database/client'

/** Activa, desactiva o promueve a un usuario en el ámbito de plataforma. */
export default defineEventHandler(async (event) => {
  const admin = requirePlatformAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const user = await basePrisma.user.findUnique({ where: { id } })
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  const platformRole = body?.platformRole === 'SUPERADMIN' || body?.platformRole === 'USER'
    ? body.platformRole
    : user.platformRole
  const activo = body?.activo != null ? body.activo !== false : user.activo

  // Quedarse sin superadmins dejaría el panel de plataforma inaccesible.
  if (user.platformRole === 'SUPERADMIN' && (platformRole !== 'SUPERADMIN' || !activo)) {
    const otros = await basePrisma.user.count({
      where: { platformRole: 'SUPERADMIN', activo: true, id: { not: id } },
    })
    if (otros === 0) {
      throw createError({ statusCode: 400, message: 'Debe quedar al menos un superadmin activo' })
    }
  }

  if (id === admin.id && !activo) {
    throw createError({ statusCode: 400, message: 'No puedes desactivar tu propia cuenta' })
  }

  const actualizado = await basePrisma.user.update({
    where: { id },
    data: { platformRole, activo },
  })

  return publicUser(actualizado)
})
