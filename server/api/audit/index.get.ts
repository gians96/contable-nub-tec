/** Registro de auditoría de la empresa activa. */
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const db = requireDb(event)
  const query = getQuery(event)

  const where: any = {}
  if (query.entidad) where.entidad = query.entidad as string
  if (query.accion) where.accion = query.accion as string
  if (query.userId) where.userId = Number(query.userId)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50))

  const [registros, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, username: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ])

  return {
    data: registros,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
})
