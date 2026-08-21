export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const id = Number(getRouterParam(event, 'id'))

  // findFirst y no findUnique: el cliente acotado inyecta el companyId, así que
  // un id de otra empresa simplemente no encuentra fila.
  const voucher = await db.voucher.findFirst({
    where: { id },
    include: { party: true },
  })

  if (!voucher) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  return voucher
})
