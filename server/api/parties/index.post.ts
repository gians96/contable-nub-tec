
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { valid, errors } = validatePartyInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const party = await prisma.party.upsert({
    where: {
      tipoDocumento_numeroDocumento: {
        tipoDocumento: body.tipoDocumento || 'RUC',
        numeroDocumento: body.numeroDocumento,
      },
    },
    update: {
      razonSocial: body.razonSocial,
      direccion: body.direccion || null,
      email: body.email || null,
      telefono: body.telefono || null,
    },
    create: {
      tipoDocumento: body.tipoDocumento || 'RUC',
      numeroDocumento: body.numeroDocumento,
      razonSocial: body.razonSocial,
      direccion: body.direccion || null,
      email: body.email || null,
      telefono: body.telefono || null,
    },
  })

  return party
})
