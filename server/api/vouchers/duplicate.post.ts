
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id } = body

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID del comprobante a duplicar es obligatorio' })
  }

  const original = await prisma.voucher.findUnique({ where: { id: Number(id) } })
  if (!original) {
    throw createError({ statusCode: 404, message: 'Comprobante original no encontrado' })
  }

  const { id: _id, createdAt, updatedAt, ...data } = original

  const duplicado = await prisma.voucher.create({
    data: {
      ...data,
      observacion: `[Duplicado] ${data.observacion || ''}`.trim(),
    },
    include: { party: true },
  })

  return duplicado
})
