
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const body = await readBody(event)

  const { valid, errors } = validatePartyInput(body)
  if (!valid) {
    throw createError({ statusCode: 400, message: errors.join('. ') })
  }

  const datos = {
    razonSocial: body.razonSocial,
    direccion: body.direccion || null,
    email: body.email || null,
    telefono: body.telefono || null,
  }

  const party = await db.party.upsert({
    // El unique pasó a ser (companyId, tipoDocumento, numeroDocumento): dos
    // empresas pueden tener el mismo proveedor sin pisarse.
    where: {
      companyId_tipoDocumento_numeroDocumento: {
        companyId: db.$companyId,
        tipoDocumento: body.tipoDocumento || 'RUC',
        numeroDocumento: body.numeroDocumento,
      },
    },
    update: datos,
    create: {
      companyId: db.$companyId,
      tipoDocumento: body.tipoDocumento || 'RUC',
      numeroDocumento: body.numeroDocumento,
      ...datos,
    },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'Party', party.id, resumenParty(party))

  return party
})
