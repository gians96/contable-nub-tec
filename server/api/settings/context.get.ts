/**
 * Contexto de la aplicación: empresa activa, régimen, parámetros del año y las
 * empresas del usuario para el selector del header.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const ctx = requireCtx(event)
  const taxContext = await loadTaxContext(ctx, year)
  const uso = await usoDeLaEmpresa(ctx, year)

  return {
    year,
    company: {
      id: ctx.company.id,
      ruc: ctx.company.ruc,
      razonSocial: ctx.company.razonSocial,
      nombreComercial: ctx.company.nombreComercial,
      direccion: ctx.company.direccion,
      moneda: ctx.company.moneda,
      estado: ctx.company.estado,
      plan: ctx.company.plan,
    },
    companyRole: ctx.role,
    uso,
    regimen: taxContext.spec.code,
    regimenSpec: taxContext.spec,
    igvPercent: taxContext.igvPercent,
    uit: taxContext.uit,
  }
})
