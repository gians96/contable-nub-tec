/**
 * Usuario de la sesión actual.
 *
 * Se relee de la base de datos en vez de devolver lo que trae el JWT: así el rol
 * está siempre al día y desactivar a alguien lo expulsa en la siguiente
 * navegación, sin esperar a que caduque su token de 7 días.
 */
export default defineEventHandler(async (event) => {
  const user = await currentUser(event)
  return publicUser(user)
})
