
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()
  const currentMonth = query.month ? Number(query.month) : new Date().getMonth() + 1

  // Parámetros tributarios
  const taxParams = await prisma.taxParameter.findUnique({ where: { year } })
  const irPercent = taxParams ? Number(taxParams.irMonthlyPercent) : 1

  // Vouchers del mes actual
  const monthVouchers = await prisma.voucher.findMany({
    where: { year, month: currentMonth },
  })

  // Calcular saldo anterior (necesitamos los meses previos)
  let saldoAnterior = 0
  if (currentMonth > 1) {
    const prevVouchers = await prisma.voucher.findMany({
      where: { year, month: { lt: currentMonth } },
    })
    let saldo = 0
    for (let m = 1; m < currentMonth; m++) {
      const mv = prevVouchers.filter(v => v.month === m)
      const res = resumirMes(mv, year, m, saldo, irPercent)
      saldo = res.saldoIgvMes
    }
    saldoAnterior = saldo
  }

  const resumen = resumirMes(monthVouchers, year, currentMonth, saldoAnterior, irPercent)

  // Resumen anual rápido
  const allVouchers = await prisma.voucher.findMany({ where: { year } })
  let ventasAnuales = 0
  let comprasAnuales = 0
  for (const v of allVouchers) {
    if (v.tipoMovimiento === 'VENTA') ventasAnuales += Number(v.baseImponible)
    else comprasAnuales += Number(v.baseImponible)
  }

  // Datos mensuales para gráficos
  const monthlyData = []
  let saldo = 0
  for (let m = 1; m <= 12; m++) {
    const mv = allVouchers.filter(v => v.month === m)
    const res = resumirMes(mv, year, m, saldo, irPercent)
    monthlyData.push({
      month: m,
      ventas: res.totalVentas,
      compras: res.baseComprasCreditoFiscal + res.costoVentas + res.gastoAdministracion + res.gastoVentas + res.activoFijo + res.comprasNoDeducibles,
      igvNeto: res.igvNetoMes,
      irSugerido: res.pagoIrSugerido,
    })
    saldo = res.saldoIgvMes
  }

  return {
    year,
    month: currentMonth,
    // Tarjetas del mes actual
    cards: {
      ventasMes: resumen.totalVentas,
      comprasMes: resumen.baseComprasCreditoFiscal + resumen.costoVentas + resumen.gastoAdministracion + resumen.gastoVentas,
      igvVentaMes: resumen.igvVentas,
      igvCompraMes: resumen.igvComprasCreditoFiscal,
      igvNetoMes: resumen.igvNetoMes,
      irSugeridoMes: resumen.pagoIrSugerido,
      totalSugeridoMes: resumen.pagoTotalSugerido,
      saldoAcumulado: resumen.saldoIgvMes,
      ventasAnuales: Math.round(ventasAnuales * 100) / 100,
      comprasAnuales: Math.round(comprasAnuales * 100) / 100,
    },
    // Datos para gráficos
    charts: monthlyData,
  }
})
