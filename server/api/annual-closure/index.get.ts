
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  // Parámetros tributarios
  const taxParams = await prisma.taxParameter.findUnique({ where: { year } })
  const irPercent = taxParams ? Number(taxParams.irMonthlyPercent) : 1
  const uit = taxParams ? Number(taxParams.uit) : 5150
  const tramo1Limit = taxParams ? Number(taxParams.irAnnualTramo1Limit) : 15
  const tramo1Rate = taxParams ? Number(taxParams.irAnnualTramo1Rate) : 10
  const tramo2Rate = taxParams ? Number(taxParams.irAnnualTramo2Rate) : 29.5

  // Obtener todos los vouchers del año
  const vouchers = await prisma.voucher.findMany({ where: { year } })

  // Resúmenes mensuales para acumular datos
  let totalVentasNetas = 0
  let totalCostoVentas = 0
  let totalGastosAdmin = 0
  let totalGastosVenta = 0
  let saldoAnterior = 0

  // Pagos a cuenta acumulados
  const savedSummaries = await prisma.monthlySummary.findMany({ where: { year } })
  let pagosCuenta = 0
  for (const s of savedSummaries) {
    pagosCuenta += Number(s.pagoIrEfectuado)
  }

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, saldoAnterior, irPercent)
    totalVentasNetas += resumen.baseVentas
    totalCostoVentas += resumen.costoVentas
    totalGastosAdmin += resumen.gastoAdministracion
    totalGastosVenta += resumen.gastoVentas
    saldoAnterior = resumen.saldoIgvMes
  }

  // Obtener cierre anual guardado (para campos manuales)
  const savedClosure = await prisma.annualClosure.findUnique({ where: { year } })

  const otrosIngresos = savedClosure ? Number(savedClosure.otrosIngresos) : 0
  const otrosGastos = savedClosure ? Number(savedClosure.otrosGastos) : 0
  const adiciones = savedClosure ? Number(savedClosure.adiciones) : 0
  const deducciones = savedClosure ? Number(savedClosure.deducciones) : 0
  const retenciones = savedClosure ? Number(savedClosure.retenciones) : 0
  const saldoFavorAnterior = savedClosure ? Number(savedClosure.saldoFavorAnterior) : 0
  const descuentos = savedClosure ? Number(savedClosure.descuentos) : 0

  const cierre = calcularCierreAnual(
    totalVentasNetas - descuentos,
    totalCostoVentas,
    totalGastosVenta,
    totalGastosAdmin,
    otrosIngresos,
    otrosGastos,
    adiciones,
    deducciones,
    pagosCuenta,
    retenciones,
    saldoFavorAnterior,
    uit,
    tramo1Limit,
    tramo1Rate,
    tramo2Rate,
  )

  // Utilidad/pérdida neta antes de cap a 0
  const utilidadNeta = cierre.utilidadContable + adiciones - deducciones
  const esPerdida = utilidadNeta < 0

  // Mapeo referencial FV 710 — casillas SUNAT
  const s = redondeoSunat
  const fv710 = {
    // Estado de Resultados
    casilla461: { valor: cierre.ventasNetas, sunat: s(cierre.ventasNetas), desc: 'Ventas netas o ingresos por servicios' },
    casilla462: { valor: descuentos, sunat: s(descuentos), desc: 'Desc. rebajas y bonif. concedidas' },
    casilla464: { valor: cierre.costoVentas, sunat: s(cierre.costoVentas), desc: 'Costo de ventas' },
    casilla468: { valor: cierre.gastosVentas, sunat: s(cierre.gastosVentas), desc: 'Gasto de ventas' },
    casilla469: { valor: cierre.gastosAdministracion, sunat: s(cierre.gastosAdministracion), desc: 'Gasto de administración' },
    casilla475: { valor: otrosIngresos, sunat: s(otrosIngresos), desc: 'Otros ingresos gravados' },
    casilla480: { valor: otrosGastos, sunat: s(otrosGastos), desc: 'Gastos diversos' },
    // Impuesto a la Renta
    casilla100: { valor: !esPerdida ? cierre.utilidadContable : 0, sunat: s(!esPerdida ? cierre.utilidadContable : 0), desc: 'Utilidad antes de adiciones y deducciones' },
    casilla101: { valor: esPerdida ? Math.abs(cierre.utilidadContable) : 0, sunat: s(esPerdida ? Math.abs(cierre.utilidadContable) : 0), desc: 'Pérdida antes de adiciones y deducciones' },
    casilla103: { valor: adiciones, sunat: s(adiciones), desc: 'Adiciones para determinar la renta imponible' },
    casilla105: { valor: deducciones, sunat: s(deducciones), desc: 'Deducciones para determinar la renta imponible' },
    casilla107: { valor: esPerdida ? Math.abs(utilidadNeta) : 0, sunat: s(esPerdida ? Math.abs(utilidadNeta) : 0), desc: 'Pérdida neta del ejercicio' },
    casilla110: { valor: cierre.rentaNetaImponible, sunat: s(cierre.rentaNetaImponible), desc: 'Renta neta imponible' },
    casilla113: { valor: cierre.impuestoAnual, sunat: s(cierre.impuestoAnual), desc: 'Total impuesto a la renta' },
    casilla128: { valor: cierre.pagosCuentaAcumulados, sunat: s(cierre.pagosCuentaAcumulados), desc: 'Pagos a cuenta mensuales del ejercicio' },
    casilla138: { valor: cierre.saldoAFavor, sunat: s(cierre.saldoAFavor), desc: 'A favor del contribuyente' },
    casilla139: { valor: cierre.saldoPorPagar > 0 ? cierre.saldoPorPagar : 0, sunat: s(cierre.saldoPorPagar > 0 ? cierre.saldoPorPagar : 0), desc: 'A favor del fisco' },
  }

  return {
    year,
    ...cierre,
    descuentos,
    otrosIngresos,
    otrosGastos,
    adiciones,
    deducciones,
    retenciones,
    saldoFavorAnterior,
    fv710,
    parametros: { uit, tramo1Limit, tramo1Rate, tramo2Rate },
  }
})
