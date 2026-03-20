import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'Usuario y contraseña son obligatorios' })
  }

  const user = await prisma.user.findUnique({ where: { username } })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'Usuario o contraseña incorrectos' })
  }

  const secret = useRuntimeConfig().authSecret
  const token = jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn: '7d' })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  })

  return { ok: true, user: { id: user.id, username: user.username } }
})
