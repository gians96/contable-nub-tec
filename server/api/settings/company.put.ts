
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  let company = await prisma.companySettings.findFirst()

  if (company) {
    company = await prisma.companySettings.update({
      where: { id: company.id },
      data: {
        ruc: body.ruc || '',
        razonSocial: body.razonSocial || '',
        nombreComercial: body.nombreComercial || null,
        direccion: body.direccion || null,
        moneda: body.moneda || 'PEN',
      },
    })
  } else {
    company = await prisma.companySettings.create({
      data: {
        ruc: body.ruc || '',
        razonSocial: body.razonSocial || '',
        nombreComercial: body.nombreComercial || null,
        direccion: body.direccion || null,
        moneda: body.moneda || 'PEN',
      },
    })
  }

  return company
})
