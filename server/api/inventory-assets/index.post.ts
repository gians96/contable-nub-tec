
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { valid, errors } = validateInventoryInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const total = Number(body.total)
  let base = Number(body.base || 0)
  let igv = Number(body.igv || 0)

  // Si no se proporcionan base/igv, calcular
  if (!base) {
    const calc = calcularBaseEIGV(total, body.afectoIgv !== false)
    base = calc.baseImponible
    igv = calc.igv
  }

  // Calcular depreciación si es activo fijo
  let depreciacionMensual = null
  if (body.destinoTributario === 'ACTIVO_FIJO' && body.vidaUtilMeses) {
    depreciacionMensual = Math.round((base / Number(body.vidaUtilMeses)) * 100) / 100
  }

  const asset = await prisma.inventoryAsset.create({
    data: {
      voucherId: body.voucherId || null,
      year: body.year || new Date(body.fecha).getFullYear(),
      fecha: new Date(body.fecha),
      comprobante: body.comprobante || null,
      descripcion: body.descripcion,
      categoria: body.categoria || 'OTRO_EQUIPO',
      base,
      igv,
      total,
      destinoTributario: body.destinoTributario || 'GASTO_ADMIN',
      estadoCierre: body.estadoCierre || 'EN_USO',
      vidaUtilMeses: body.vidaUtilMeses || null,
      depreciacionMensual,
      observaciones: body.observaciones || null,
    },
  })

  return asset
})
