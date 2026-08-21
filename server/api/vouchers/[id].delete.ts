export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const id = Number(getRouterParam(event, 'id'))

  const existing = await db.voucher.findFirst({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  await db.voucher.delete({ where: { id } })
  await registrarAuditoria(event, 'ELIMINAR', 'Voucher', id, resumenVoucher(existing))

  return { ok: true, message: 'Comprobante eliminado' }
})
