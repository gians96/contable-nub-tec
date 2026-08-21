import bcrypt from 'bcryptjs'
import { basePrisma } from '../../database/client'

/**
 * Cambio de contraseña del usuario de la sesión.
 * Hasta ahora la única forma de cambiar la contraseña era reescribir el hash en
 * la base de datos a mano.
 */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)
  const body = await readBody(event)

  const actual = body?.passwordActual
  const nueva = validarPassword(body?.passwordNueva)

  if (typeof actual !== 'string' || !bcrypt.compareSync(actual, user.passwordHash)) {
    throw createError({ statusCode: 401, message: 'La contraseña actual no es correcta' })
  }

  if (bcrypt.compareSync(nueva, user.passwordHash)) {
    throw createError({ statusCode: 400, message: 'La nueva contraseña debe ser distinta de la actual' })
  }

  await basePrisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(nueva, 10), debeCambiarPassword: false },
  })

  // El token sigue siendo válido: identifica al usuario, no a la contraseña.
  return { ok: true }
})
