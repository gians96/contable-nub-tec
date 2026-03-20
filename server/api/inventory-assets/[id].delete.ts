export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const existing = await prisma.inventoryAsset.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Activo no encontrado' })
  }

  await prisma.inventoryAsset.delete({ where: { id } })

  return { ok: true, message: 'Activo eliminado' }
})
