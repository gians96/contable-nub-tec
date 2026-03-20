import * as XLSX from 'xlsx'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string || 'vouchers'
  const format = query.format as string || 'xlsx'
  const year = query.year ? Number(query.year) : undefined

  let data: any[] = []
  let filename = ''

  if (type === 'vouchers') {
    const where: any = {}
    if (year) where.year = year

    const vouchers = await prisma.voucher.findMany({
      where,
      orderBy: [{ year: 'asc' }, { month: 'asc' }, { fecha: 'asc' }],
    })

    data = vouchers.map(v => ({
      'Año': v.year,
      'Mes': v.month,
      'Fecha': v.fecha.toISOString().split('T')[0],
      'Tipo Movimiento': v.tipoMovimiento,
      'Tipo Comprobante': v.tipoComprobante,
      'Serie': v.serie || '',
      'Número': v.numero || '',
      'RUC/DNI': v.rucDni || '',
      'Razón Social': v.razonSocial || '',
      'Afecto IGV': v.afectoIgv ? 'SI' : 'NO',
      'Importe Total': Number(v.importeTotal),
      'Base Imponible': Number(v.baseImponible),
      'IGV': Number(v.igv),
      'Medio Pago': v.medioPago,
      'Estado Pago': v.estadoPago,
      'Destino Tributario': v.destinoTributario,
      'Subcategoría': v.subcategoria,
      'Deducible IR': v.deducibleIr ? 'SI' : 'NO',
      'Crédito Fiscal': v.creditoFiscalIgv ? 'SI' : 'NO',
      'Observación': v.observacion || '',
    }))
    filename = `comprobantes_${year || 'todos'}`
  }

  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}.csv"`)
    return csv
  }

  // Excel
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  setResponseHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}.xlsx"`)
  return buffer
})
