export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const existing = await prisma.inventoryAsset.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Activo no encontrado' })
  }

  let depreciacionMensual = body.depreciacionMensual
  if (body.destinoTributario === 'ACTIVO_FIJO' && body.vidaUtilMeses && body.base) {
    depreciacionMensual = Math.round((Number(body.base) / Number(body.vidaUtilMeses)) * 100) / 100
  }

  const asset = await prisma.inventoryAsset.update({
    where: { id },
    data: {
      descripcion: body.descripcion,
      categoria: body.categoria,
      base: body.base != null ? Number(body.base) : undefined,
      igv: body.igv != null ? Number(body.igv) : undefined,
      total: body.total != null ? Number(body.total) : undefined,
      destinoTributario: body.destinoTributario,
      estadoCierre: body.estadoCierre,
      vidaUtilMeses: body.vidaUtilMeses || null,
      depreciacionMensual: depreciacionMensual != null ? Number(depreciacionMensual) : null,
      observaciones: body.observaciones || null,
    },
  })

  return asset
})
