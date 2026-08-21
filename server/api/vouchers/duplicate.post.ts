
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const body = await readBody(event)
  const { id } = body

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID del comprobante a duplicar es obligatorio' })
  }

  const original = await db.voucher.findFirst({ where: { id: Number(id) } })
  if (!original) {
    throw createError({ statusCode: 404, message: 'Comprobante original no encontrado' })
  }

  // `companyId` se descarta junto al id: lo vuelve a poner el cliente acotado, y
  // así el duplicado no puede heredar la empresa de un registro ajeno.
  const { id: _id, companyId: _companyId, createdAt, updatedAt, ...data } = original

  const duplicado = await db.voucher.create({
    data: {
      ...data,
      companyId: db.$companyId,
      observacion: `[Duplicado] ${data.observacion || ''}`.trim(),
    },
    include: { party: true },
  })

  await registrarAuditoria(event, 'CREAR', 'Voucher', duplicado.id, resumenVoucher(duplicado))

  return duplicado
})
