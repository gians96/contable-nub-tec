
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { valid, errors } = validateVoucherInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const fecha = new Date(body.fecha)
  const year = body.year || fecha.getFullYear()
  const month = body.month || fecha.getMonth() + 1
  const total = Number(body.importeTotal)
  const afectoIgv = body.afectoIgv !== false

  // Calcular base e IGV automáticamente, o usar valores manuales
  let baseImponible: number
  let igv: number

  if (body.modoManual && body.baseImponible != null) {
    baseImponible = Number(body.baseImponible)
    igv = Number(body.igv || 0)
  } else {
    const calc = calcularBaseEIGV(total, afectoIgv)
    baseImponible = calc.baseImponible
    igv = calc.igv
  }

  // Determinar crédito fiscal y deducible por defecto
  const creditoFiscalIgv = body.creditoFiscalIgv ??
    (body.destinoTributario !== 'NO_DEDUCIBLE' && body.tipoMovimiento !== 'VENTA')
  const deducibleIr = body.deducibleIr ?? (body.destinoTributario !== 'NO_DEDUCIBLE')

  const voucher = await prisma.voucher.create({
    data: {
      year,
      month,
      fecha,
      tipoMovimiento: body.tipoMovimiento,
      tipoComprobante: body.tipoComprobante || 'FACTURA',
      serie: body.serie || null,
      numero: body.numero || null,
      partyId: body.partyId || null,
      rucDni: body.rucDni || null,
      razonSocial: body.razonSocial || null,
      afectoIgv,
      importeTotal: total,
      baseImponible,
      igv,
      modoManual: body.modoManual || false,
      medioPago: body.medioPago || 'TRANSFERENCIA',
      estadoPago: body.estadoPago || 'PAGADO',
      destinoTributario: body.destinoTributario,
      subcategoria: body.subcategoria || 'OTRO',
      deducibleIr,
      creditoFiscalIgv,
      inventarioFinal: body.inventarioFinal || false,
      activoFijo: body.activoFijo || false,
      vidaUtilMeses: body.vidaUtilMeses || null,
      observacion: body.observacion || null,
    },
    include: { party: true },
  })

  return voucher
})
