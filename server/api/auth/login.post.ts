import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { basePrisma } from '../../database/client'

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 días
  path: '/',
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password } = body

  // El campo admite indistintamente el nombre de usuario o el correo. Ambos se
  // guardan en minúsculas, así que basta con normalizar lo que llega.
  const identificador = String(body.username ?? body.usuario ?? '').trim().toLowerCase()

  if (!identificador || !password) {
    throw createError({ statusCode: 400, message: 'Usuario o correo y contraseña son obligatorios' })
  }

  const user = await basePrisma.user.findFirst({
    where: { OR: [{ username: identificador }, { email: identificador }] },
  })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'Credenciales incorrectas' })
  }

  if (!user.activo) {
    throw createError({ statusCode: 403, message: 'Usuario desactivado' })
  }

  const secret = useRuntimeConfig().authSecret
  const token = jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn: '7d' })

  setCookie(event, 'auth_token', token, COOKIE_BASE)

  // La empresa activa NO va en el token: cambia con el selector y el token dura
  // 7 días sin poder revocarse. Aquí sí hay una respuesta que el navegador ve,
  // así que es uno de los pocos sitios donde se puede fijar la cookie.
  const membership = await basePrisma.membership.findFirst({
    where: { userId: user.id, activo: true },
    orderBy: [{ role: 'asc' }, { companyId: 'asc' }],
  })

  if (membership) {
    setCookie(event, 'cp_company', String(membership.companyId), COOKIE_BASE)
  } else {
    deleteCookie(event, 'cp_company', { path: '/' })
  }

  return {
    ok: true,
    user: { id: user.id, username: user.username },
    debeCambiarPassword: user.debeCambiarPassword,
  }
})
