export default defineEventHandler(async (event) => {
  const ctx = requireCtx(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const existing = await ctx.db.voucher.findFirst({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Comprobante no encontrado' })
  }

  const { valid, errors } = validateVoucherInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const data = await buildVoucherData(ctx, body)

  const voucher = await ctx.db.voucher.update({
    where: { id },
    data,
    include: { party: true },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'Voucher', id, resumenVoucher(voucher))

  return voucher
})
