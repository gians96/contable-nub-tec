import { closingIgvDebtAtYearEnd, IGV_DEBT_ACCRUAL_FROM_YEAR } from '../../utils/monthlyIgvDebt'

/**
 * Tasa de la Ley 31556 efectivamente usada en el mes.
 * Se lee de los comprobantes en vez de fijarla, porque la ley sube al 12% en
 * 2027 y los meses de 2026 deben seguir declarándose al 10%.
 */
function tasaLey31556DelMes(vouchers: any[]): number {
  const conLey = vouchers.find(v => v.regimenIgv === 'LEY_31556' && Number(v.igvPercent) > 0)
  return conLey ? Number(conLey.igvPercent) : 10
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const ctx = requireCtx(event)
  const taxContext = await loadTaxContext(ctx, year)
  const coeficiente = await resolverCoeficiente(ctx, taxContext)

  const vouchers = await ctx.db.voucher.findMany({
    where: { year },
    orderBy: { month: 'asc' },
  })

  // Resúmenes guardados (para pagos efectuados)
  const savedSummaries = await ctx.db.monthlySummary.findMany({ where: { year } })
  const savedMap = new Map(savedSummaries.map(s => [`${s.year}-${s.month}`, s]))

  // NRUS no declara IGV, así que tampoco acumula deuda por IGV impago.
  const debtAccrualActive = taxContext.spec.aplicaIgv && year >= IGV_DEBT_ACCRUAL_FROM_YEAR
  let openingIgvDebt = 0
  if (debtAccrualActive && year > IGV_DEBT_ACCRUAL_FROM_YEAR) {
    openingIgvDebt = await closingIgvDebtAtYearEnd(ctx, year - 1)
  }

  const summaries = []
  let saldoAnterior = 0
  let deudaIgvAcum = openingIgvDebt
  // El umbral de las 300 UIT del RMT se mide sobre ingresos ANUALES acumulados,
  // así que la tasa del pago a cuenta puede cambiar a mitad de año.
  let ingresosNetosAcum = 0

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)

    const base = resumirMes(monthVouchers, year, month, {
      saldoIgvMesAnterior: saldoAnterior,
      aplicaIgv: taxContext.spec.aplicaIgv,
      aplicaCreditoFiscal: taxContext.spec.aplicaCreditoFiscal,
    })

    ingresosNetosAcum = round2(ingresosNetosAcum + base.baseVentas)

    const irMensual = calcularIrMensual({
      regimen: taxContext.spec.code,
      baseVentas: base.baseVentas,
      totalVentasMes: base.totalVentas,
      totalComprasMes: base.totalComprasMes,
      ingresosNetosAcumAnio: ingresosNetosAcum,
      uit: taxContext.uit,
      params: taxContext.irParams,
      coeficiente: coeficiente.valor,
    })

    const igvDelPeriodoAPagar = Math.max(0, base.igvNetoMes)
    const resumen = {
      ...base,
      irMensual,
      pagoIrSugerido: irMensual.monto,
      pagoTotalSugerido: round2(igvDelPeriodoAPagar + irMensual.monto),
    }

    const saved = savedMap.get(`${year}-${month}`)
    const pagoIgv = saved ? Number(saved.pagoIgvEfectuado) : 0

    const igvDeudaInicioMes = deudaIgvAcum
    let igvDeudaCierreMes = 0
    let igvSugeridoPagoTotal = igvDelPeriodoAPagar

    if (debtAccrualActive) {
      const antesPago = round2(igvDeudaInicioMes + igvDelPeriodoAPagar)
      igvSugeridoPagoTotal = antesPago
      igvDeudaCierreMes = Math.max(0, round2(antesPago - pagoIgv))
      deudaIgvAcum = igvDeudaCierreMes
    }

    const guia = generarGuia0621(resumen, taxContext.spec, {
      tasaGeneral: taxContext.igvPercent,
      tasaLey31556: tasaLey31556DelMes(monthVouchers),
      porcentajeRentaTexto: coeficiente.origen === 'no-aplica' ? undefined : coeficiente.detalle,
    })

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
      guia,
    })

    saldoAnterior = resumen.saldoIgvMes
  }

  return {
    year,
    igvDebtAccrualFromYear: IGV_DEBT_ACCRUAL_FROM_YEAR,
    igvDebtAccrualActive: debtAccrualActive,
    regimen: taxContext.spec.code,
    regimenSpec: taxContext.spec,
    igvPercent: taxContext.igvPercent,
    uit: taxContext.uit,
    coeficiente,
    summaries,
  }
})
