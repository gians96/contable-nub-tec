import type { PrismaClient } from '@prisma/client'
import { resumirMes, round2 } from '../../shared/utils/tax'
import { loadTaxContext, type TaxContextCache } from './taxContext'

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
 */
export async function closingIgvDebtAtYearEnd(
  prisma: PrismaClient,
  year: number,
  caches?: { debt?: IgvDebtCache; tax?: TaxContextCache }
): Promise<number> {
  if (year < IGV_DEBT_ACCRUAL_FROM_YEAR) return 0

  const cached = caches?.debt?.get(year)
  if (cached != null) return cached

  const ctx = await loadTaxContext(prisma, year, caches?.tax)

  // Sin IGV (NRUS) no hay deuda que acumular en el ejercicio.
  if (!ctx.spec.aplicaIgv) {
    const heredada =
      year === IGV_DEBT_ACCRUAL_FROM_YEAR
        ? 0
        : await closingIgvDebtAtYearEnd(prisma, year - 1, caches)
    caches?.debt?.set(year, heredada)
    return heredada
  }

  const vouchers = await prisma.voucher.findMany({ where: { year } })
  const savedSummaries = await prisma.monthlySummary.findMany({ where: { year } })
  const savedMap = new Map(savedSummaries.map(s => [s.month, s]))

  const openingDebt =
    year === IGV_DEBT_ACCRUAL_FROM_YEAR
      ? 0
      : await closingIgvDebtAtYearEnd(prisma, year - 1, caches)

  let saldoCredito = 0
  let deuda = openingDebt

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, {
      saldoIgvMesAnterior: saldoCredito,
      aplicaIgv: ctx.spec.aplicaIgv,
      aplicaCreditoFiscal: ctx.spec.aplicaCreditoFiscal,
    })
    saldoCredito = resumen.saldoIgvMes
    const pagoIgv = Number(savedMap.get(month)?.pagoIgvEfectuado ?? 0)
    const antesPago = deuda + Math.max(0, resumen.igvNetoMes)
    deuda = Math.max(0, round2(antesPago - pagoIgv))
  }

  caches?.debt?.set(year, deuda)
  return deuda
}
