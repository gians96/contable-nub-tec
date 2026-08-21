const ROLES = new Set(['OWNER', 'ADMIN', 'CONTADOR', 'LECTOR'])

/** Cambia el rol o el estado de un miembro dentro de la empresa activa. */
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const db = requireDb(event)

  const userId = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const membership = await db.membership.findFirst({ where: { userId }, include: { user: true } })
  if (!membership) {
    throw createError({ statusCode: 404, message: 'Ese usuario no pertenece a esta empresa' })
  }

  const role = ROLES.has(body?.role) ? body.role : membership.role
  const activo = body?.activo != null ? body.activo !== false : membership.activo

  // El invariante se cuenta dentro de la empresa: antes se contaban los ADMIN de
  // toda la plataforma, así que la segunda empresa nunca habría podido cambiar
  // de propietario.
  if (membership.role === 'OWNER' && (role !== 'OWNER' || !activo)) {
    const otros = await db.membership.count({
      where: { role: 'OWNER', activo: true, userId: { not: userId } },
    })
    if (otros === 0) {
      throw createError({ statusCode: 400, message: 'Debe quedar al menos un propietario activo en la empresa' })
    }
  }

  const actualizado = await db.membership.update({
    where: { id: membership.id },
    data: { role, activo },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'Membership', membership.id, `${membership.user.username} → ${role}`)

  return {
    membershipId: actualizado.id,
    id: membership.user.id,
    username: membership.user.username,
    nombre: membership.user.nombre,
    role: actualizado.role,
    activo: actualizado.activo,
  }
})
