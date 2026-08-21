/**
 * Quita a un usuario de la empresa activa.
 *
 * Borra la membresía, no la cuenta: el usuario puede pertenecer a otras
 * empresas. Eliminar la cuenta es cosa del panel de plataforma.
 */
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const db = requireDb(event)
  const actual = currentUser(event)

  const userId = Number(getRouterParam(event, 'id'))

  const membership = await db.membership.findFirst({ where: { userId }, include: { user: true } })
  if (!membership) {
    throw createError({ statusCode: 404, message: 'Ese usuario no pertenece a esta empresa' })
  }

  if (userId === actual.id) {
    const otros = await db.membership.count({
      where: { role: 'OWNER', activo: true, userId: { not: userId } },
    })
    if (otros === 0) {
      throw createError({ statusCode: 400, message: 'No puedes salir de la empresa siendo el único propietario' })
    }
  }

  if (membership.role === 'OWNER') {
    const otros = await db.membership.count({
      where: { role: 'OWNER', activo: true, userId: { not: userId } },
    })
    if (otros === 0) {
      throw createError({ statusCode: 400, message: 'Debe quedar al menos un propietario activo en la empresa' })
    }
  }

  await db.membership.delete({ where: { id: membership.id } })
  await registrarAuditoria(event, 'ELIMINAR', 'Membership', membership.id, membership.user.username)

  return { ok: true }
})
