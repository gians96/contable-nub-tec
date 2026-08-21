
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { valid, errors } = validateVoucherInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const data = await buildVoucherData(prisma, body)

  const voucher = await prisma.voucher.create({
    data,
    include: { party: true },
  })

  return voucher
})
