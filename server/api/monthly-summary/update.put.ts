
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const body = await readBody(event)
  const {
    year, month, pagoIrEfectuado, pagoIgvEfectuado, pagoTotalEfectuado,
    pagoConDetraccion, observaciones,
  } = body

  if (!year || !month) {
    throw createError({ statusCode: 400, message: 'Año y mes son obligatorios' })
  }

  const igv = pagoIgvEfectuado != null ? Number(pagoIgvEfectuado) : 0
  const ir = pagoIrEfectuado != null ? Number(pagoIrEfectuado) : 0
  const conDetraccion = pagoConDetraccion != null ? Number(pagoConDetraccion) : 0

  if (!Number.isFinite(conDetraccion) || conDetraccion < 0) {
    throw createError({ statusCode: 400, message: 'Lo pagado con detracción no puede ser negativo' })
  }

  // No es un pago aparte: es la parte de lo ya pagado que salió del fondo. Si
  // pudiera superarlo, el saldo del Banco de la Nación bajaría por dinero que
  // nunca se usó.
  if (conDetraccion > igv + ir + 0.01) {
    throw createError({
      statusCode: 400,
      message: 'Lo pagado con detracción no puede superar el total pagado del mes (IGV + renta)',
    })
  }

  const summary = await db.monthlySummary.upsert({
    where: { companyId_year_month: { companyId: db.$companyId, year: Number(year), month: Number(month) } },
    update: {
      pagoIrEfectuado: ir,
      pagoIgvEfectuado: igv,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      pagoConDetraccion: conDetraccion,
      observaciones: observaciones || null,
    },
    create: {
      companyId: db.$companyId,
      year: Number(year),
      month: Number(month),
      pagoIrEfectuado: ir,
      pagoIgvEfectuado: igv,
      pagoTotalEfectuado: pagoTotalEfectuado != null ? Number(pagoTotalEfectuado) : 0,
      pagoConDetraccion: conDetraccion,
      observaciones: observaciones || null,
    },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'MonthlySummary', summary.id, `Pagos ${month}/${year}`)

  return summary
})
