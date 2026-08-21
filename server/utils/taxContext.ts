import type { IrMensualParams, RegimenSpec } from '../../shared/types/tax'
import { getRegimenSpec } from '../../shared/utils/regimenes'
import type { RequestCtx } from './tenant'

/**
 * Parámetros tributarios de un año, ya normalizados a `number` y con el régimen
 * resuelto. Todos los endpoints leían `taxParameter` por su cuenta y aplicaban
 * sus propios fallbacks; aquí hay una sola versión de esos defaults.
 */
export interface TaxContext {
  year: number
  spec: RegimenSpec
  igvPercent: number
  uit: number
  irParams: IrMensualParams
  tramo1Limit: number
  tramo1Rate: number
  tramo2Rate: number
  flatRate: number
  coeficienteManual: number | null
}

export const TAX_DEFAULTS = {
  igvPercent: 18,
  irMonthlyPercent: 1,
  uit: 5150,
  irAnnualTramo1Limit: 15,
  irAnnualTramo1Rate: 10,
  irAnnualTramo2Rate: 29.5,
  irAnnualFlatRate: 29.5,
  rerRate: 1.5,
  pagoCuentaMinRate: 1.5,
  rmtUmbralUit: 300,
  rmtLimiteRegimenUit: 1700,
  nrusCategoria: 1,
  nrusCuotaCat1: 20,
  nrusCuotaCat2: 50,
  nrusLimiteCat1: 5000,
  nrusLimiteCat2: 8000,
}

function num(valor: unknown, fallback: number): number {
  if (valor == null) return fallback
  const n = Number(valor)
  return Number.isFinite(n) ? n : fallback
}

/** Cache por request: `loadTaxContext` se llama una vez por año y por endpoint. */
export type TaxContextCache = Map<number, TaxContext>

export async function loadTaxContext(ctx: RequestCtx, year: number): Promise<TaxContext> {
  const cached = ctx.tax.get(year)
  if (cached) return cached

  // findFirst y no findUnique: el unique pasó a ser (companyId, year) y el
  // cliente acotado inyecta el companyId por su cuenta.
  const p = await ctx.db.taxParameter.findFirst({ where: { year } })

  const resultado: TaxContext = {
    year,
    spec: getRegimenSpec(p?.regimen),
    igvPercent: num(p?.igvPercent, TAX_DEFAULTS.igvPercent),
    uit: num(p?.uit, TAX_DEFAULTS.uit),
    tramo1Limit: num(p?.irAnnualTramo1Limit, TAX_DEFAULTS.irAnnualTramo1Limit),
    tramo1Rate: num(p?.irAnnualTramo1Rate, TAX_DEFAULTS.irAnnualTramo1Rate),
    tramo2Rate: num(p?.irAnnualTramo2Rate, TAX_DEFAULTS.irAnnualTramo2Rate),
    flatRate: num(p?.irAnnualFlatRate, TAX_DEFAULTS.irAnnualFlatRate),
    coeficienteManual: p?.coeficienteManual != null ? Number(p.coeficienteManual) : null,
    irParams: {
      irMonthlyPercent: num(p?.irMonthlyPercent, TAX_DEFAULTS.irMonthlyPercent),
      rerRate: num(p?.rerRate, TAX_DEFAULTS.rerRate),
      pagoCuentaMinRate: num(p?.pagoCuentaMinRate, TAX_DEFAULTS.pagoCuentaMinRate),
      rmtUmbralUit: num(p?.rmtUmbralUit, TAX_DEFAULTS.rmtUmbralUit),
      rmtLimiteRegimenUit: num(p?.rmtLimiteRegimenUit, TAX_DEFAULTS.rmtLimiteRegimenUit),
      nrusCategoria: num(p?.nrusCategoria, TAX_DEFAULTS.nrusCategoria),
      nrusCuotaCat1: num(p?.nrusCuotaCat1, TAX_DEFAULTS.nrusCuotaCat1),
      nrusCuotaCat2: num(p?.nrusCuotaCat2, TAX_DEFAULTS.nrusCuotaCat2),
      nrusLimiteCat1: num(p?.nrusLimiteCat1, TAX_DEFAULTS.nrusLimiteCat1),
      nrusLimiteCat2: num(p?.nrusLimiteCat2, TAX_DEFAULTS.nrusLimiteCat2),
    },
  }

  ctx.tax.set(year, resultado)
  return resultado
}
