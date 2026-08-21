import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  const role = body?.role === 'ADMIN' ? 'ADMIN' : body?.role === 'USUARIO' ? 'USUARIO' : user.role
  const activo = body?.activo != null ? body.activo !== false : user.activo

  // Sin al menos un administrador activo nadie podría volver a gestionar usuarios.
  const perderiaAdmin = user.role === 'ADMIN' && (role !== 'ADMIN' || !activo)
  if (perderiaAdmin) {
    const otrosAdmins = await prisma.user.count({
      where: { role: 'ADMIN', activo: true, id: { not: id } },
    })
    if (otrosAdmins === 0) {
      throw createError({ statusCode: 400, message: 'Debe quedar al menos un administrador activo' })
    }
  }

  const data: Record<string, unknown> = { role, activo }

  if ('nombre' in (body ?? {})) data.nombre = body.nombre?.trim() || null
  if (body?.password) data.passwordHash = bcrypt.hashSync(validarPassword(body.password), 10)

  const actualizado = await prisma.user.update({ where: { id }, data })

  return publicUser(actualizado)
})
