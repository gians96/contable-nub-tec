
export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const query = getQuery(event)
  const year = Number(query.year) || new Date().getFullYear()

  const params = await db.taxParameter.findFirst({ where: { year } })
  if (params) return params

  // Sin fila para ese año se devuelven los valores por defecto en memoria. Antes
  // se creaba la fila desde un GET, lo que ya era raro y con roles de solo
  // lectura sería directamente un 403.
  return {
    id: null,
    companyId: db.$companyId,
    year,
    igvPercent: TAX_DEFAULTS.igvPercent,
    irMonthlyPercent: TAX_DEFAULTS.irMonthlyPercent,
    uit: TAX_DEFAULTS.uit,
    irAnnualTramo1Limit: TAX_DEFAULTS.irAnnualTramo1Limit,
    irAnnualTramo1Rate: TAX_DEFAULTS.irAnnualTramo1Rate,
    irAnnualTramo2Rate: TAX_DEFAULTS.irAnnualTramo2Rate,
    irAnnualFlatRate: TAX_DEFAULTS.irAnnualFlatRate,
    regimen: 'RMT',
    nrusCategoria: TAX_DEFAULTS.nrusCategoria,
    nrusCuotaCat1: TAX_DEFAULTS.nrusCuotaCat1,
    nrusCuotaCat2: TAX_DEFAULTS.nrusCuotaCat2,
    nrusLimiteCat1: TAX_DEFAULTS.nrusLimiteCat1,
    nrusLimiteCat2: TAX_DEFAULTS.nrusLimiteCat2,
    rerRate: TAX_DEFAULTS.rerRate,
    rmtUmbralUit: TAX_DEFAULTS.rmtUmbralUit,
    rmtLimiteRegimenUit: TAX_DEFAULTS.rmtLimiteRegimenUit,
    pagoCuentaMinRate: TAX_DEFAULTS.pagoCuentaMinRate,
    coeficienteManual: null,
  }
})
