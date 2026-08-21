import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  const username = String(body?.username ?? '').trim().toLowerCase()
  if (!username) {
    throw createError({ statusCode: 400, message: 'El usuario es obligatorio' })
  }

  const password = validarPassword(body?.password)
  const role = body?.role === 'ADMIN' ? 'ADMIN' : 'USUARIO'

  const existente = await prisma.user.findUnique({ where: { username } })
  if (existente) {
    throw createError({ statusCode: 409, message: 'Ya existe un usuario con ese nombre' })
  }

  const user = await prisma.user.create({
    data: {
      username,
      nombre: body?.nombre?.trim() || null,
      passwordHash: bcrypt.hashSync(password, 10),
      role,
      activo: body?.activo !== false,
    },
  })

  return publicUser(user)
})
