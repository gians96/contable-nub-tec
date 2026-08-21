import { basePrisma } from '../../database/client'

/**
 * Usuario de la sesión, empresa activa y empresas a las que pertenece.
 *
 * Lleva todo junto porque el middleware de ruta del cliente ya llama a este
 * endpoint en cada navegación: el selector de empresa del header se pinta sin
 * una petición extra.
 */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)

  const memberships = await basePrisma.membership.findMany({
    where: { userId: user.id, activo: true },
    include: { company: true },
    orderBy: [{ role: 'asc' }, { company: { razonSocial: 'asc' } }],
  })

  const company = event.context.company ?? null

  return {
    ...publicUser(user),
    companyRole: event.context.membershipRole ?? null,
    company: company
      ? { id: company.id, razonSocial: company.razonSocial, estado: company.estado, plan: company.plan }
      : null,
    companies: memberships.map(m => ({
      id: m.company.id,
      razonSocial: m.company.razonSocial || m.company.ruc || `Empresa ${m.company.id}`,
      ruc: m.company.ruc,
      estado: m.company.estado,
      role: m.role,
    })),
  }
})
