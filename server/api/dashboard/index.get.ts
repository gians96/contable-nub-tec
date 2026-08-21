
/** Compras del período por destino tributario. Sumar además `baseComprasCreditoFiscal` las contaría dos veces. */
function comprasDelPeriodo(r: { costoVentas: number; gastoAdministracion: number; gastoVentas: number; activoFijo: number; comprasNoDeducibles: number }) {
  return round2(r.costoVentas + r.gastoAdministracion + r.gastoVentas + r.activoFijo + r.comprasNoDeducibles)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()
  const currentMonth = query.month ? Number(query.month) : new Date().getMonth() + 1

  const caches = { tax: new Map(), cierre: new Map() }
  const ctx = await loadTaxContext(prisma, year, caches.tax)
  const coeficiente = await resolverCoeficiente(prisma, ctx, caches)

  const opcionesMes = {
    aplicaIgv: ctx.spec.aplicaIgv,
    aplicaCreditoFiscal: ctx.spec.aplicaCreditoFiscal,
  }

  const allVouchers = await prisma.voucher.findMany({ where: { year } })

  // Serie mensual: da a la vez el saldo arrastrado, los ingresos acumulados
  // (umbral de 300 UIT del RMT) y los datos de los gráficos.
  const monthlyData = []
  let saldo = 0
  let ingresosNetosAcum = 0
  let resumenMesActual = null

  for (let m = 1; m <= 12; m++) {
    const mv = allVouchers.filter(v => v.month === m)
    const base = resumirMes(mv, year, m, { ...opcionesMes, saldoIgvMesAnterior: saldo })
    ingresosNetosAcum = round2(ingresosNetosAcum + base.baseVentas)

    const irMensual = calcularIrMensual({
      regimen: ctx.spec.code,
      baseVentas: base.baseVentas,
      totalVentasMes: base.totalVentas,
      totalComprasMes: base.totalComprasMes,
      ingresosNetosAcumAnio: ingresosNetosAcum,
      uit: ctx.uit,
      params: ctx.irParams,
      coeficiente: coeficiente.valor,
    })

    const resumen = {
      ...base,
      irMensual,
      pagoIrSugerido: irMensual.monto,
      pagoTotalSugerido: round2(Math.max(0, base.igvNetoMes) + irMensual.monto),
    }

    if (m === currentMonth) resumenMesActual = resumen

    monthlyData.push({
      month: m,
      ventas: resumen.totalVentas,
      compras: comprasDelPeriodo(resumen),
      igvNeto: resumen.igvNetoMes,
      irSugerido: resumen.pagoIrSugerido,
    })

    saldo = resumen.saldoIgvMes
  }

  const resumen = resumenMesActual ?? resumirMes([], year, currentMonth, opcionesMes)

  // Resumen anual rápido
  let ventasAnuales = 0
  let comprasAnuales = 0
  for (const v of allVouchers) {
    if (v.tipoMovimiento === 'VENTA') ventasAnuales += Number(v.baseImponible)
    else comprasAnuales += Number(v.baseImponible)
  }

  return {
    year,
    month: currentMonth,
    regimen: ctx.spec.code,
    regimenSpec: ctx.spec,
    coeficiente,
    // Tarjetas del mes actual
    cards: {
      ventasMes: resumen.totalVentas,
      comprasMes: comprasDelPeriodo(resumen),
      igvVentaMes: resumen.igvVentas,
      igvCompraMes: resumen.igvComprasCreditoFiscal,
      igvNetoMes: resumen.igvNetoMes,
      irSugeridoMes: resumen.pagoIrSugerido,
      irConcepto: resumen.irMensual?.concepto ?? '',
      totalSugeridoMes: resumen.pagoTotalSugerido,
      saldoAcumulado: resumen.saldoIgvMes,
      ventasAnuales: round2(ventasAnuales),
      comprasAnuales: round2(comprasAnuales),
    },
    // Datos para gráficos
    charts: monthlyData,
  }
})
