import { basePrisma } from '../../../database/client'

/** Todas las empresas de la plataforma, con su tamaño. Solo superadmin. */
export default defineEventHandler(async (event) => {
  requirePlatformAdmin(event)

  const companies = await basePrisma.company.findMany({
    orderBy: [{ estado: 'asc' }, { razonSocial: 'asc' }],
    include: {
      _count: { select: { memberships: true, vouchers: true } },
    },
  })

  return companies.map(c => ({
    id: c.id,
    ruc: c.ruc,
    razonSocial: c.razonSocial || c.ruc || `Empresa ${c.id}`,
    nombreComercial: c.nombreComercial,
    estado: c.estado,
    plan: c.plan,
    limiteVouchersAnual: c.limiteVouchersAnual,
    limiteUsuarios: c.limiteUsuarios,
    usuarios: c._count.memberships,
    comprobantes: c._count.vouchers,
    createdAt: c.createdAt,
  }))
})
