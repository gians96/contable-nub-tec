import { closingIgvDebtAtYearEnd, IGV_DEBT_ACCRUAL_FROM_YEAR } from '../../utils/monthlyIgvDebt'
import { round2 } from '../../utils/calculations'

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

  const debtAccrualActive = year >= IGV_DEBT_ACCRUAL_FROM_YEAR
  let openingIgvDebt = 0
  if (debtAccrualActive && year > IGV_DEBT_ACCRUAL_FROM_YEAR) {
    openingIgvDebt = await closingIgvDebtAtYearEnd(prisma, year - 1)
  }

  // Calcular resumen por mes
  const summaries = []
  let saldoAnterior = 0
  let deudaIgvAcum = openingIgvDebt

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, saldoAnterior, irPercent)

    const saved = savedMap.get(`${year}-${month}`)
    const pagoIgv = saved ? Number(saved.pagoIgvEfectuado) : 0

    const igvDeudaInicioMes = deudaIgvAcum
    const igvDelPeriodoAPagar = Math.max(0, resumen.igvNetoMes)
    let igvDeudaCierreMes = 0
    let igvSugeridoPagoTotal = igvDelPeriodoAPagar

    if (debtAccrualActive) {
      const antesPago = round2(igvDeudaInicioMes + igvDelPeriodoAPagar)
      igvSugeridoPagoTotal = antesPago
      igvDeudaCierreMes = Math.max(0, round2(antesPago - pagoIgv))
      deudaIgvAcum = igvDeudaCierreMes
    }

    summaries.push({
      ...resumen,
      nombreMes: nombreMes(month),
      pagoIrEfectuado: saved ? Number(saved.pagoIrEfectuado) : 0,
      pagoIgvEfectuado: pagoIgv,
      pagoTotalEfectuado: saved ? Number(saved.pagoTotalEfectuado) : 0,
      observaciones: saved?.observaciones || '',
      igvDeudaInicioMes: round2(igvDeudaInicioMes),
      igvDeudaCierreMes: round2(igvDeudaCierreMes),
      igvSugeridoPagoTotal: round2(igvSugeridoPagoTotal),
      // Valores redondeados SUNAT
      sunat: {
        baseVentas: redondeoSunat(resumen.baseVentas),
        igvVentas: redondeoSunat(resumen.igvVentas),
        totalVentas: redondeoSunat(resumen.totalVentas),
        igvNetoMes: redondeoSunat(resumen.igvNetoMes),
        pagoIrSugerido: redondeoSunat(resumen.pagoIrSugerido),
        pagoTotalSugerido: redondeoSunat(resumen.pagoTotalSugerido),
        igvDeudaCierreMes: redondeoSunat(igvDeudaCierreMes),
        igvSugeridoPagoTotal: redondeoSunat(igvSugeridoPagoTotal),
      },
    })

    saldoAnterior = resumen.saldoIgvMes
  }

  return {
    year,
    igvDebtAccrualFromYear: IGV_DEBT_ACCRUAL_FROM_YEAR,
    igvDebtAccrualActive: debtAccrualActive,
    summaries,
  }
})
