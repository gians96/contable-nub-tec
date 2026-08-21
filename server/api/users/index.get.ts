/**
 * Miembros de la empresa activa.
 *
 * Antes esto listaba TODOS los usuarios del sistema; con varias empresas eso
 * habría expuesto el directorio completo a cualquier administrador.
 */
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const db = requireDb(event)

  const miembros = await db.membership.findMany({
    include: { user: true },
    orderBy: [{ role: 'asc' }, { user: { username: 'asc' } }],
  })

  return miembros.map(m => ({
    membershipId: m.id,
    id: m.user.id,
    username: m.user.username,
    email: m.user.email,
    nombre: m.user.nombre,
    debeCambiarPassword: m.user.debeCambiarPassword,
    role: m.role,
    activo: m.activo,
    usuarioActivo: m.user.activo,
    createdAt: m.createdAt,
  }))
})
