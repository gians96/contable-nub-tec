export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  await prisma.voucher.delete({ where: { id } })

  return { ok: true, message: 'Comprobante eliminado' }
})
