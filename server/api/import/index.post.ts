import * as XLSX from 'xlsx'

export default defineEventHandler(async (event) => {
  const ctx = requireCtx(event)
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No se recibió ningún archivo' })
  }

  const file = formData[0]
  if (!file?.data) {
    throw createError({ statusCode: 400, message: 'Archivo vacío' })
  }

  const wb = XLSX.read(file.data, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]!]!
  const rows: any[] = XLSX.utils.sheet_to_json(ws)

  if (rows.length === 0) {
    throw createError({ statusCode: 400, message: 'El archivo no contiene datos' })
  }

  const created: any[] = []
  const errors: string[] = []

  // Cupo del plan: se comprueba una vez con el lote entero en vez de por fila.
  const anios = new Set<number>(
    rows.map(r => Number(r['Año']) || (r['Fecha'] ? new Date(r['Fecha']).getFullYear() : new Date().getFullYear()))
  )
  for (const anio of anios) await assertCupoVouchers(event, ctx, anio, rows.length)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const fecha = row['Fecha'] ? new Date(row['Fecha']) : new Date()
      const year = row['Año'] || fecha.getFullYear()
      const month = row['Mes'] || fecha.getMonth() + 1
      const total = Number(row['Importe Total'] || 0)
      const tipoMovimiento = row['Tipo Movimiento'] || 'COMPRA'
      const destinoTributario = row['Destino Tributario'] || 'GASTO_ADMIN'
      const tipoComprobante = row['Tipo Comprobante'] || 'FACTURA'

      // Las notas de crédito restan y por eso vienen en negativo. El resto de
      // comprobantes sigue exigiendo un importe positivo.
      if (!Number.isFinite(total) || total === 0) {
        errors.push(`Fila ${i + 2}: Importe total inválido`)
        continue
      }
      if (total < 0 && tipoComprobante !== 'NOTA_CREDITO') {
        errors.push(`Fila ${i + 2}: solo una nota de crédito puede tener importe negativo`)
        continue
      }

      // La tasa viene del archivo si el export la incluyó; si no, del parámetro
      // del año. Antes se recalculaba siempre al 18% y un round-trip
      // export→import convertía en 18% cualquier comprobante al 10%.
      const taxContext = await loadTaxContext(ctx, year)
      const { afectoIgv, igvPercent, regimenIgv } = resolverTasaIgv(
        {
          afectoIgv: row['Afecto IGV'] !== 'NO',
          igvPercent: row['Tasa IGV (%)'],
          regimenIgv: row['Régimen IGV'],
        },
        taxContext.igvPercent
      )

      const { baseImponible, igv } = calcularBaseEIGV(total, afectoIgv, igvPercent)

      const detraccion = row['Detracción'] === 'SI'
      const detraccionPorcentaje = detraccion ? round2(Number(row['% Detracción']) || 0) : 0
      const montoDelArchivo = Number(row['Monto Detracción'])
      const detraccionMonto = detraccion
        ? (Number.isFinite(montoDelArchivo) && montoDelArchivo !== 0
            ? round2(montoDelArchivo)
            : calcularDetraccion(total, detraccionPorcentaje).monto)
        : 0
      const fechaDeposito = row['Fecha Depósito Detracción']
        ? new Date(row['Fecha Depósito Detracción'])
        : null

      const voucher = await ctx.db.voucher.create({
        data: {
          companyId: ctx.companyId,
          year,
          month,
          fecha,
          tipoMovimiento,
          tipoComprobante,
          serie: row['Serie'] || null,
          numero: row['Número'] || null,
          rucDni: row['RUC/DNI'] || null,
          razonSocial: row['Razón Social'] || null,
          afectoIgv,
          igvPercent,
          regimenIgv: regimenIgv as any,
          importeTotal: total,
          baseImponible,
          igv,
          medioPago: row['Medio Pago'] || 'TRANSFERENCIA',
          estadoPago: row['Estado Pago'] || 'PAGADO',
          destinoTributario,
          subcategoria: row['Subcategoría'] || 'OTRO',
          deducibleIr: row['Deducible IR'] !== 'NO',
          creditoFiscalIgv: afectoIgv && row['Crédito Fiscal'] !== 'NO',
          detraccion,
          detraccionCodigo: detraccion ? (row['Cód. Detracción'] || null) : null,
          detraccionPorcentaje,
          detraccionMonto,
          detraccionConstancia: detraccion ? (row['Constancia Detracción'] || null) : null,
          detraccionFechaDeposito:
            fechaDeposito && !Number.isNaN(fechaDeposito.getTime()) ? fechaDeposito : null,
          observacion: row['Observación'] || null,
        },
      })
      created.push(voucher)
    } catch (e: any) {
      errors.push(`Fila ${i + 2}: ${e.message}`)
    }
  }

  if (created.length) {
    await registrarAuditoria(event, 'CREAR', 'Voucher', null, `Importación de ${created.length} comprobantes`)
  }

  return {
    ok: true,
    imported: created.length,
    errors: errors.length,
    errorDetails: errors,
    message: `Se importaron ${created.length} de ${rows.length} registros`,
  }
})
