
export default defineEventHandler(async (event) => {
  requireCompanyAdmin(event)
  const db = requireDb(event)
  const body = await readBody(event)

  // El cliente acotado fija el `where` a la empresa activa: este endpoint no
  // puede tocar otra aunque llegue un id en el body.
  const company = await db.company.update({
    where: { id: db.$companyId },
    data: {
      ruc: body.ruc ?? undefined,
      razonSocial: body.razonSocial ?? undefined,
      nombreComercial: body.nombreComercial || null,
      direccion: body.direccion || null,
      moneda: body.moneda || 'PEN',
    },
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'Company', company.id, company.razonSocial)

  return company
})
