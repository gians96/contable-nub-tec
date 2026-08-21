export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))

  if (id === admin.id) {
    throw createError({ statusCode: 400, message: 'No puedes eliminar tu propio usuario' })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  if (user.role === 'ADMIN') {
    const otrosAdmins = await prisma.user.count({
      where: { role: 'ADMIN', activo: true, id: { not: id } },
    })
    if (otrosAdmins === 0) {
      throw createError({ statusCode: 400, message: 'Debe quedar al menos un administrador activo' })
    }
  }

  await prisma.user.delete({ where: { id } })

  return { ok: true }
})
