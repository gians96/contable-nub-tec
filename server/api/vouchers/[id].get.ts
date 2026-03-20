export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const voucher = await prisma.voucher.findUnique({
    where: { id },
    include: { party: true },
  })

  if (!voucher) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  return voucher
})
