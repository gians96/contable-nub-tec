import { basePrisma } from '../../database/client'

/** Empresas del usuario, para el selector y la página /empresas. */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)

  const memberships = await basePrisma.membership.findMany({
    where: { userId: user.id, activo: true },
    include: { company: true },
    orderBy: [{ role: 'asc' }, { company: { razonSocial: 'asc' } }],
  })

  return memberships.map(m => ({
    id: m.company.id,
    ruc: m.company.ruc,
    razonSocial: m.company.razonSocial || m.company.ruc || `Empresa ${m.company.id}`,
    nombreComercial: m.company.nombreComercial,
    estado: m.company.estado,
    plan: m.company.plan,
    role: m.role,
    activa: event.context.company?.id === m.company.id,
  }))
})
