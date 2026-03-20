import type { PrismaClient } from '@prisma/client'
import { resumirMes, round2 } from './calculations'

/**
 * A partir de este año se acumula en la app la deuda por IGV no pagado mes a mes.
 * No se arrastra deuda de años anteriores a 2026 (enero 2026 parte con deuda 0).
 * El crédito fiscal (saldo a favor por compras) sigue arrastrándose como hasta ahora.
 */
export const IGV_DEBT_ACCRUAL_FROM_YEAR = 2026

/**
 * Deuda IGV no pagada al cierre de diciembre de `year` (para abrir el año siguiente).
 */
export async function closingIgvDebtAtYearEnd(
  prisma: PrismaClient,
  year: number
): Promise<number> {
  if (year < IGV_DEBT_ACCRUAL_FROM_YEAR) return 0

  const taxParams = await prisma.taxParameter.findUnique({ where: { year } })
  const irPercent = taxParams ? Number(taxParams.irMonthlyPercent) : 1

  const vouchers = await prisma.voucher.findMany({ where: { year } })
  const savedSummaries = await prisma.monthlySummary.findMany({ where: { year } })
  const savedMap = new Map(savedSummaries.map(s => [s.month, s]))

  const openingDebt =
    year === IGV_DEBT_ACCRUAL_FROM_YEAR
      ? 0
      : await closingIgvDebtAtYearEnd(prisma, year - 1)

  let saldoCredito = 0
  let deuda = openingDebt

  for (let month = 1; month <= 12; month++) {
    const monthVouchers = vouchers.filter(v => v.month === month)
    const resumen = resumirMes(monthVouchers, year, month, saldoCredito, irPercent)
    saldoCredito = resumen.saldoIgvMes
    const pagoIgv = Number(savedMap.get(month)?.pagoIgvEfectuado ?? 0)
    const antesPago = deuda + Math.max(0, resumen.igvNetoMes)
    deuda = Math.max(0, round2(antesPago - pagoIgv))
  }

  return deuda
}
