import * as XLSX from 'xlsx'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No se recibió ningún archivo' })
  }

  const file = formData[0]
  if (!file.data) {
    throw createError({ statusCode: 400, message: 'Archivo vacío' })
  }

  const wb = XLSX.read(file.data, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws)

  if (rows.length === 0) {
    throw createError({ statusCode: 400, message: 'El archivo no contiene datos' })
  }

  const created: any[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const fecha = row['Fecha'] ? new Date(row['Fecha']) : new Date()
      const year = row['Año'] || fecha.getFullYear()
      const month = row['Mes'] || fecha.getMonth() + 1
      const total = Number(row['Importe Total'] || 0)
      const afectoIgv = row['Afecto IGV'] !== 'NO'
      const tipoMovimiento = row['Tipo Movimiento'] || 'COMPRA'
      const destinoTributario = row['Destino Tributario'] || 'GASTO_ADMIN'

      if (total <= 0) {
        errors.push(`Fila ${i + 2}: Importe total inválido`)
        continue
      }

      const { baseImponible, igv } = calcularBaseEIGV(total, afectoIgv)

      const voucher = await prisma.voucher.create({
        data: {
          year,
          month,
          fecha,
          tipoMovimiento,
          tipoComprobante: row['Tipo Comprobante'] || 'FACTURA',
          serie: row['Serie'] || null,
          numero: row['Número'] || null,
          rucDni: row['RUC/DNI'] || null,
          razonSocial: row['Razón Social'] || null,
          afectoIgv,
          importeTotal: total,
          baseImponible,
          igv,
          medioPago: row['Medio Pago'] || 'TRANSFERENCIA',
          estadoPago: row['Estado Pago'] || 'PAGADO',
          destinoTributario,
          subcategoria: row['Subcategoría'] || 'OTRO',
          deducibleIr: row['Deducible IR'] !== 'NO',
          creditoFiscalIgv: row['Crédito Fiscal'] !== 'NO',
          observacion: row['Observación'] || null,
        },
      })
      created.push(voucher)
    } catch (e: any) {
      errors.push(`Fila ${i + 2}: ${e.message}`)
    }
  }

  return {
    ok: true,
    imported: created.length,
    errors: errors.length,
    errorDetails: errors,
    message: `Se importaron ${created.length} de ${rows.length} registros`,
  }
})
