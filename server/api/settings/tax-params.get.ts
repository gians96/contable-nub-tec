
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  let params = await prisma.taxParameter.findUnique({ where: { year } })

  if (!params) {
    // Crear con valores por defecto
    params = await prisma.taxParameter.create({
      data: { year, uit: 5150 },
    })
  }

  return params
})
