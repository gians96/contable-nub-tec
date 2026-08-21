/**
 * Contexto de la aplicación: empresa, parámetros y régimen del año.
 *
 * Existe para que el layout no tenga que encadenar dos o tres peticiones en cada
 * navegación solo para pintar la razón social y el badge del régimen.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  let company = await prisma.companySettings.findFirst()
  if (!company) {
    company = await prisma.companySettings.create({ data: {} })
  }

  const ctx = await loadTaxContext(prisma, year)

  return {
    year,
    company: {
      ruc: company.ruc,
      razonSocial: company.razonSocial,
      nombreComercial: company.nombreComercial,
      direccion: company.direccion,
      moneda: company.moneda,
    },
    regimen: ctx.spec.code,
    regimenSpec: ctx.spec,
    igvPercent: ctx.igvPercent,
    uit: ctx.uit,
  }
})
