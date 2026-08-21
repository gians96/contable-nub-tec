
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const body = await readBody(event)
  const { year, month, pagoIrEfectuado, pagoIgvEfectuado, pagoTotalEfectuado, observaciones } = body

  if (!year || !month) {
    throw createError({ statusCode: 400, message: 'Año y mes son obligatorios' })
  }

  const summary = await db.monthlySummary.upsert({
    where: { companyId_year_month: { companyId: db.$companyId, year: Number(year), month: Number(month) } },
    update: {
      pagoIrEfectuado: pagoIrEfectuado != null ? Number(pagoIrEfectuado) : 0,
      pagoIgvEfectuado: pagoIgvEfectuado != null ? Number(pagoIgvEfectuado) : 0,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      observaciones: observaciones || null,
    },
    create: {
      companyId: db.$companyId,
      year: Number(year),
      month: Number(month),
      pagoIrEfectuado: pagoIrEfectuado != null ? Number(pagoIrEfectuado) : 0,
      pagoIgvEfectuado: pagoIgvEfectuado != null ? Number(pagoIgvEfectuado) : 0,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      observaciones: observaciones || null,
    },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'MonthlySummary', summary.id, `Pagos ${month}/${year}`)

  return summary
})
