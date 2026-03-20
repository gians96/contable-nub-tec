
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = query.year ? Number(query.year) : undefined
  const month = query.month ? Number(query.month) : undefined
  const tipoMovimiento = query.tipoMovimiento as string | undefined
  const destinoTributario = query.destinoTributario as string | undefined
  const subcategoria = query.subcategoria as string | undefined
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50))

  const where: any = {}
  if (year) where.year = year
  if (month) where.month = month
  if (tipoMovimiento) where.tipoMovimiento = tipoMovimiento
  if (destinoTributario) where.destinoTributario = destinoTributario
  if (subcategoria) where.subcategoria = subcategoria

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: { party: true },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count({ where }),
  ])

  return {
    data: vouchers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
})
