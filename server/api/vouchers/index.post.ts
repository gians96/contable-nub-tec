
export default defineEventHandler(async (event) => {
  const ctx = requireCtx(event)
  const body = await readBody(event)

  const { valid, errors } = validateVoucherInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  await assertCupoVouchers(event, ctx, Number(body.year) || new Date(body.fecha).getFullYear())

  const data = await buildVoucherData(ctx, body)

  const voucher = await ctx.db.voucher.create({
    data,
    include: { party: true },
  })

  await registrarAuditoria(event, 'CREAR', 'Voucher', voucher.id, resumenVoucher(voucher))

  return voucher
})
