
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = query.year ? Number(query.year) : undefined
  const categoria = query.categoria as string | undefined
  const destinoTributario = query.destinoTributario as string | undefined

  const where: any = {}
  if (year) where.year = year
  if (categoria) where.categoria = categoria
  if (destinoTributario) where.destinoTributario = destinoTributario

  const assets = await prisma.inventoryAsset.findMany({
    where,
    include: { voucher: true },
    orderBy: { fecha: 'desc' },
  })

  return assets
})
