
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const query = getQuery(event)
  const search = query.search as string | undefined

  const where: any = {}
  if (search) {
    where.OR = [
      { razonSocial: { contains: search } },
      { numeroDocumento: { contains: search } },
    ]
  }

  const parties = await db.party.findMany({
    where,
    orderBy: { razonSocial: 'asc' },
    take: 100,
  })

  return parties
})
