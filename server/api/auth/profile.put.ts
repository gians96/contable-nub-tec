import { basePrisma } from '../../database/client'

const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Datos de la propia cuenta: nombre para mostrar y correo de acceso.
 *
 * El correo es una alternativa al nombre de usuario para iniciar sesión, así que
 * se guarda en minúsculas y tiene que ser único en toda la plataforma.
 */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)
  const body = await readBody(event)

  const data: Record<string, unknown> = {}

  if ('nombre' in (body ?? {})) {
    data.nombre = body.nombre?.trim() || null
  }

  if ('email' in (body ?? {})) {
    const email = String(body.email ?? '').trim().toLowerCase() || null

    if (email) {
      if (!FORMATO_EMAIL.test(email)) {
        throw createError({ statusCode: 400, message: 'El correo no tiene un formato válido' })
      }

      const repetido = await basePrisma.user.findUnique({ where: { email } })
      if (repetido && repetido.id !== user.id) {
        throw createError({ statusCode: 409, message: 'Ese correo ya está en uso por otra cuenta' })
      }
    }

    data.email = email
  }

  if (Object.keys(data).length === 0) {
    return publicUser(user)
  }

  const actualizado = await basePrisma.user.update({ where: { id: user.id }, data })

  return publicUser(actualizado)
})
