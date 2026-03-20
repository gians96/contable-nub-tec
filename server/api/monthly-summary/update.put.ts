
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { year, month, pagoIrEfectuado, pagoIgvEfectuado, pagoTotalEfectuado, observaciones } = body

  if (!year || !month) {
    throw createError({ statusCode: 400, message: 'Año y mes son obligatorios' })
  }

  const summary = await prisma.monthlySummary.upsert({
    where: { year_month: { year: Number(year), month: Number(month) } },
    update: {
      pagoIrEfectuado: pagoIrEfectuado != null ? Number(pagoIrEfectuado) : 0,
      pagoIgvEfectuado: pagoIgvEfectuado != null ? Number(pagoIgvEfectuado) : 0,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      observaciones: observaciones || null,
    },
    create: {
      year: Number(year),
      month: Number(month),
      pagoIrEfectuado: pagoIrEfectuado != null ? Number(pagoIrEfectuado) : 0,
      pagoIgvEfectuado: pagoIgvEfectuado != null ? Number(pagoIgvEfectuado) : 0,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      observaciones: observaciones || null,
    },
  })

  return summary
})
