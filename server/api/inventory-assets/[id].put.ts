export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const existing = await prisma.inventoryAsset.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Activo no encontrado' })
  }

  const total = body.total != null && body.total !== '' ? Number(body.total) : Number(existing.total)
  const ctx = await loadTaxContext(prisma, existing.year)

  // La tasa cae al valor guardado si el formulario no la envía, para que editar
  // la descripción de un activo al 10% no lo devuelva al 18%.
  const { afectoIgv, igvPercent, regimenIgv } = resolverTasaIgv(
    {
      afectoIgv: body.afectoIgv ?? Number(existing.igvPercent) > 0,
      igvPercent: body.igvPercent ?? Number(existing.igvPercent),
      regimenIgv: body.regimenIgv ?? existing.regimenIgv,
    },
    ctx.igvPercent
  )

  // Antes base/igv solo se recalculaban si el body los traía, y el formulario de
  // /inventario nunca los envía: cambiar el total dejaba base, IGV y
  // depreciación con los valores viejos.
  const calc = calcularBaseEIGV(total, afectoIgv, igvPercent)
  const base = body.base != null && body.base !== '' ? Number(body.base) : calc.baseImponible
  const igv = body.igv != null && body.igv !== '' ? Number(body.igv) : calc.igv

  const destinoTributario = body.destinoTributario ?? existing.destinoTributario
  const vidaUtilMeses = body.vidaUtilMeses ? Number(body.vidaUtilMeses) : null

  let depreciacionMensual: number | null = null
  if (destinoTributario === 'ACTIVO_FIJO' && vidaUtilMeses) {
    depreciacionMensual = Math.round((base / vidaUtilMeses) * 100) / 100
  }

  const asset = await prisma.inventoryAsset.update({
    where: { id },
    data: {
      descripcion: body.descripcion,
      categoria: body.categoria,
      base,
      igv,
      total,
      igvPercent,
      regimenIgv: regimenIgv as any,
      destinoTributario,
      estadoCierre: body.estadoCierre,
      vidaUtilMeses,
      depreciacionMensual,
      observaciones: body.observaciones || null,
    },
  })

  return asset
})
