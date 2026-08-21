
export default defineEventHandler(async (event) => {
  const ctx = requireCtx(event)
  const body = await readBody(event)

  const { valid, errors } = validateInventoryInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const total = Number(body.total)
  const year = body.year || new Date(body.fecha).getFullYear()

  const taxContext = await loadTaxContext(ctx, year)
  const { afectoIgv, igvPercent, regimenIgv } = resolverTasaIgv(body, taxContext.igvPercent)

  // El comprobante enlazado tiene que ser de esta empresa.
  const voucherId = await assertPertenece(ctx.db, 'voucher', body.voucherId || null)

  const calc = calcularBaseEIGV(total, afectoIgv, igvPercent)
  const base = body.base != null && body.base !== '' ? Number(body.base) : calc.baseImponible
  const igv = body.igv != null && body.igv !== '' ? Number(body.igv) : calc.igv

  // Calcular depreciación si es activo fijo
  let depreciacionMensual = null
  if (body.destinoTributario === 'ACTIVO_FIJO' && body.vidaUtilMeses) {
    depreciacionMensual = Math.round((base / Number(body.vidaUtilMeses)) * 100) / 100
  }

  const asset = await ctx.db.inventoryAsset.create({
    data: {
      companyId: ctx.companyId,
      voucherId,
      year,
      fecha: new Date(body.fecha),
      comprobante: body.comprobante || null,
      descripcion: body.descripcion,
      categoria: body.categoria || 'OTRO_EQUIPO',
      base,
      igv,
      total,
      igvPercent,
      regimenIgv: regimenIgv as any,
      destinoTributario: body.destinoTributario || 'GASTO_ADMIN',
      estadoCierre: body.estadoCierre || 'EN_USO',
      vidaUtilMeses: body.vidaUtilMeses || null,
      depreciacionMensual,
      observaciones: body.observaciones || null,
    },
  })

  await registrarAuditoria(event, 'CREAR', 'InventoryAsset', asset.id, resumenActivo(asset))

  return asset
})
