export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const existing = await prisma.voucher.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  const { valid, errors } = validateVoucherInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const data = await buildVoucherData(prisma, body)

  const voucher = await prisma.voucher.update({
    where: { id },
    data,
    include: { party: true },
  })

  return voucher
})
