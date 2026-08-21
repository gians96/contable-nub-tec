export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const id = Number(getRouterParam(event, 'id'))

  const existing = await db.inventoryAsset.findFirst({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Activo no encontrado' })
  }

  await db.inventoryAsset.delete({ where: { id } })
  await registrarAuditoria(event, 'ELIMINAR', 'InventoryAsset', id, resumenActivo(existing))

  return { ok: true, message: 'Activo eliminado' }
})
