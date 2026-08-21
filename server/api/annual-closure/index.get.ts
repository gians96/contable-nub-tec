
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const caches = { tax: new Map(), cierre: new Map() }
  const { ctx, cierre, manuales, totales } = await computeCierreAnual(prisma, year, caches)

  // Utilidad/pérdida neta antes de cap a 0
  const utilidadNeta = cierre.utilidadContable + cierre.adiciones - cierre.deducciones
  const esPerdida = utilidadNeta < 0

  // Mapeo referencial FV 710 — casillas SUNAT.
  // NRUS y RER no presentan declaración jurada anual de renta empresarial.
  const s = redondeoSunat
  const fv710 = ctx.spec.aplicaDjAnual
    ? {
        // Estado de Resultados
        casilla461: { valor: cierre.ventasNetas, sunat: s(cierre.ventasNetas), desc: 'Ventas netas o ingresos por servicios' },
        casilla462: { valor: cierre.descuentos, sunat: s(cierre.descuentos), desc: 'Desc. rebajas y bonif. concedidas' },
        casilla464: { valor: cierre.costoVentas, sunat: s(cierre.costoVentas), desc: 'Costo de ventas' },
        casilla468: { valor: cierre.gastosVentas, sunat: s(cierre.gastosVentas), desc: 'Gasto de ventas' },
        casilla469: { valor: cierre.gastosAdministracion, sunat: s(cierre.gastosAdministracion), desc: 'Gasto de administración' },
        casilla475: { valor: cierre.otrosIngresos, sunat: s(cierre.otrosIngresos), desc: 'Otros ingresos gravados' },
        casilla480: { valor: cierre.otrosGastos, sunat: s(cierre.otrosGastos), desc: 'Gastos diversos' },
        // Impuesto a la Renta
        casilla100: { valor: !esPerdida ? cierre.utilidadContable : 0, sunat: s(!esPerdida ? cierre.utilidadContable : 0), desc: 'Utilidad antes de adiciones y deducciones' },
        casilla101: { valor: esPerdida ? Math.abs(cierre.utilidadContable) : 0, sunat: s(esPerdida ? Math.abs(cierre.utilidadContable) : 0), desc: 'Pérdida antes de adiciones y deducciones' },
        casilla103: { valor: cierre.adiciones, sunat: s(cierre.adiciones), desc: 'Adiciones para determinar la renta imponible' },
        casilla105: { valor: cierre.deducciones, sunat: s(cierre.deducciones), desc: 'Deducciones para determinar la renta imponible' },
        casilla107: { valor: esPerdida ? Math.abs(utilidadNeta) : 0, sunat: s(esPerdida ? Math.abs(utilidadNeta) : 0), desc: 'Pérdida neta del ejercicio' },
        casilla110: { valor: cierre.rentaNetaImponible, sunat: s(cierre.rentaNetaImponible), desc: 'Renta neta imponible' },
        casilla113: { valor: cierre.impuestoAnual, sunat: s(cierre.impuestoAnual), desc: 'Total impuesto a la renta' },
        casilla128: { valor: cierre.pagosCuentaAcumulados, sunat: s(cierre.pagosCuentaAcumulados), desc: 'Pagos a cuenta mensuales del ejercicio' },
        casilla138: { valor: cierre.saldoAFavor, sunat: s(cierre.saldoAFavor), desc: 'A favor del contribuyente' },
        casilla139: { valor: cierre.saldoPorPagar > 0 ? cierre.saldoPorPagar : 0, sunat: s(cierre.saldoPorPagar > 0 ? cierre.saldoPorPagar : 0), desc: 'A favor del fisco' },
      }
    : null

  return {
    year,
    ...cierre,
    ventasBrutas: totales.ventasBrutas,
    observaciones: manuales.observaciones,
    regimenSpec: ctx.spec,
    fv710,
    parametros: {
      uit: ctx.uit,
      tramo1Limit: ctx.tramo1Limit,
      tramo1Rate: ctx.tramo1Rate,
      tramo2Rate: ctx.tramo2Rate,
      flatRate: ctx.flatRate,
    },
  }
})
