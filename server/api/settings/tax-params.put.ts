
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.year) {
    throw createError({ statusCode: 400, message: 'Año es obligatorio' })
  }

  const params = await prisma.taxParameter.upsert({
    where: { year: Number(body.year) },
    update: {
      igvPercent: body.igvPercent != null ? Number(body.igvPercent) : 18,
      irMonthlyPercent: body.irMonthlyPercent != null ? Number(body.irMonthlyPercent) : 1,
      uit: body.uit != null ? Number(body.uit) : 5150,
      irAnnualTramo1Limit: body.irAnnualTramo1Limit != null ? Number(body.irAnnualTramo1Limit) : 15,
      irAnnualTramo1Rate: body.irAnnualTramo1Rate != null ? Number(body.irAnnualTramo1Rate) : 10,
      irAnnualTramo2Rate: body.irAnnualTramo2Rate != null ? Number(body.irAnnualTramo2Rate) : 29.5,
    },
    create: {
      year: Number(body.year),
      igvPercent: body.igvPercent != null ? Number(body.igvPercent) : 18,
      irMonthlyPercent: body.irMonthlyPercent != null ? Number(body.irMonthlyPercent) : 1,
      uit: body.uit != null ? Number(body.uit) : 5150,
      irAnnualTramo1Limit: body.irAnnualTramo1Limit != null ? Number(body.irAnnualTramo1Limit) : 15,
      irAnnualTramo1Rate: body.irAnnualTramo1Rate != null ? Number(body.irAnnualTramo1Rate) : 10,
      irAnnualTramo2Rate: body.irAnnualTramo2Rate != null ? Number(body.irAnnualTramo2Rate) : 29.5,
    },
  })

  return params
})
