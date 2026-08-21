import { resumirMes, round2 } from '../../shared/utils/tax'
import { loadTaxContext } from './taxContext'
import type { RequestCtx } from './tenant'

/**
 * A partir de este año se acumula en la app la deuda por IGV no pagado mes a mes.
 * No se arrastra deuda de años anteriores a 2026 (enero 2026 parte con deuda 0).
 * El crédito fiscal (saldo a favor por compras) sigue arrastrándose como hasta ahora.
 */
export const IGV_DEBT_ACCRUAL_FROM_YEAR = 2026

/** Memoización por request: la función es recursiva año a año. */
export type IgvDebtCache = Map<number, number>

/**
 * Deuda IGV no pagada al cierre de diciembre de `year` (para abrir el año siguiente).
 *
 * La recursión propaga el mismo `ctx`, así que el cliente acotado —y con él la
 * empresa— viaja intacto a los ejercicios anteriores.
 */
export async function closingIgvDebtAtYearEnd(ctx: RequestCtx, year: number): Promise<number> {
  if (year < IGV_DEBT_ACCRUAL_FROM_YEAR) return 0

  const cached = ctx.debt.get(year)
  if (cached != null) return cached

  const taxContext = await loadTaxContext(ctx, year)

  // Sin IGV (NRUS) no hay deuda que acumular en el ejercicio.
  if (!taxContext.spec.aplicaIgv) {
    const heredada =
      year === IGV_DEBT_ACCRUAL_FROM_YEAR ? 0 : await closingIgvDebtAtYearEnd(ctx, year - 1)
    ctx.debt.set(year, heredada)
    return heredada
  }

  const vouchers = await ctx.db.voucher.findMany({ where: { year } })
  const savedSummaries = await ctx.db.monthlySummary.findMany({ where: { year } })
  const savedMap = new Map(savedSummaries.map(s => [s.month, s]))

  const openingDebt =
    year === IGV_DEBT_ACCRUAL_FROM_YEAR ? 0 : await closingIgvDebtAtYearEnd(ctx, year - 1)

  let saldoCredito = 0
  let deuda = openingDebt

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, {
      saldoIgvMesAnterior: saldoCredito,
      aplicaIgv: taxContext.spec.aplicaIgv,
      aplicaCreditoFiscal: taxContext.spec.aplicaCreditoFiscal,
    })
    saldoCredito = resumen.saldoIgvMes
    const pagoIgv = Number(savedMap.get(month)?.pagoIgvEfectuado ?? 0)
    const antesPago = deuda + Math.max(0, resumen.igvNetoMes)
    deuda = Math.max(0, round2(antesPago - pagoIgv))
  }

  ctx.debt.set(year, deuda)
  return deuda
}
