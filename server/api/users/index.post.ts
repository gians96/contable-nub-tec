import bcrypt from 'bcryptjs'
import { basePrisma } from '../../database/client'

const ROLES = new Set(['OWNER', 'ADMIN', 'CONTADOR', 'LECTOR'])

/**
 * Alta de un miembro. Sin proveedor de correo hay dos caminos: crear el usuario
 * con una contraseña temporal, o vincular a alguien que ya existe en la
 * plataforma (el caso del contador que lleva varias empresas con una cuenta).
 */
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const ctx = requireCtx(event)
  const body = await readBody(event)

  const username = String(body?.username ?? '').trim().toLowerCase()
  if (!username) {
    throw createError({ statusCode: 400, message: 'El usuario es obligatorio' })
  }

  const email = String(body?.email ?? '').trim().toLowerCase() || null
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'El correo no tiene un formato válido' })
  }

  const role = ROLES.has(body?.role) ? body.role : 'LECTOR'
  await assertCupoUsuarios(ctx)

  let user = await basePrisma.user.findUnique({ where: { username } })
  let passwordTemporal: string | null = null

  if (user) {
    if (body?.vincularExistente !== true) {
      throw createError({
        statusCode: 409,
        message: `Ya existe un usuario "${username}" en la plataforma. Puedes darle acceso a esta empresa.`,
        data: { code: 'USUARIO_EXISTE' },
      })
    }
  } else {
    passwordTemporal = typeof body?.password === 'string' && body.password
      ? validarPassword(body.password)
      : generarPasswordTemporal()

    if (email) {
      const repetido = await basePrisma.user.findUnique({ where: { email } })
      if (repetido) {
        throw createError({ statusCode: 409, message: `Ya hay una cuenta con el correo ${email}` })
      }
    }

    user = await basePrisma.user.create({
      data: {
        username,
        email,
        nombre: body?.nombre?.trim() || null,
        passwordHash: bcrypt.hashSync(passwordTemporal, 10),
        // La contraseña la fija un tercero: hay que cambiarla al entrar.
        debeCambiarPassword: true,
      },
    })
  }

  const yaEsMiembro = await ctx.db.membership.findFirst({ where: { userId: user.id } })
  if (yaEsMiembro) {
    throw createError({ statusCode: 409, message: 'Ese usuario ya pertenece a esta empresa' })
  }

  const membership = await ctx.db.membership.create({
    data: { companyId: ctx.companyId, userId: user.id, role, activo: true },
  })

  await registrarAuditoria(event, 'CREAR', 'Membership', membership.id, `${username} como ${role}`)

  // La contraseña temporal se devuelve una sola vez: no se guarda en claro.
  return {
    membershipId: membership.id,
    id: user.id,
    username: user.username,
    email: user.email,
    nombre: user.nombre,
    role: membership.role,
    activo: membership.activo,
    passwordTemporal,
  }
})
