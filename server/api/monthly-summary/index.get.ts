
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  // Obtener parámetros tributarios del año
  const taxParams = await prisma.taxParameter.findUnique({ where: { year } })
  const irPercent = taxParams ? Number(taxParams.irMonthlyPercent) : 1

  // Obtener todos los vouchers del año
  const vouchers = await prisma.voucher.findMany({
    where: { year },
    orderBy: { month: 'asc' },
  })

  // Obtener resúmenes guardados (para pagos efectuados)
  const savedSummaries = await prisma.monthlySummary.findMany({
    where: { year },
  })
  const savedMap = new Map(savedSummaries.map(s => [`${s.year}-${s.month}`, s]))

  // Calcular resumen por mes
  const summaries = []
  let saldoAnterior = 0

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, saldoAnterior, irPercent)

    // Merge con datos guardados (pagos efectuados)
    const saved = savedMap.get(`${year}-${month}`)

    summaries.push({
      ...resumen,
      nombreMes: nombreMes(month),
      pagoIrEfectuado: saved ? Number(saved.pagoIrEfectuado) : 0,
      pagoIgvEfectuado: saved ? Number(saved.pagoIgvEfectuado) : 0,
      pagoTotalEfectuado: saved ? Number(saved.pagoTotalEfectuado) : 0,
      observaciones: saved?.observaciones || '',
      // Valores redondeados SUNAT
      sunat: {
        baseVentas: redondeoSunat(resumen.baseVentas),
        igvVentas: redondeoSunat(resumen.igvVentas),
        totalVentas: redondeoSunat(resumen.totalVentas),
        igvNetoMes: redondeoSunat(resumen.igvNetoMes),
        pagoIrSugerido: redondeoSunat(resumen.pagoIrSugerido),
        pagoTotalSugerido: redondeoSunat(resumen.pagoTotalSugerido),
      },
    })

    // Arrastrar saldo IGV al mes siguiente
    saldoAnterior = resumen.saldoIgvMes
  }

  return { year, summaries }
})
