import { round2 } from '../../shared/utils/tax'
import type { RequestCtx } from './tenant'

/**
 * Fondo de detracciones: el saldo de la cuenta del Banco de la Nación.
 *
 * **Solo abonan las detracciones de las VENTAS.** Cuando te detraen una venta,
 * ese dinero entra en *tu* cuenta —lo deposite el cliente o te lo autodetraigas
 * tú—. Las detracciones de las compras van a la cuenta *del proveedor*, así que
 * no suman aquí: son dinero que sale, no que entra.
 *
 * Carga lo que se va usando para pagar tributos, que es lo único en lo que se
 * puede gastar ese saldo.
 */

/** Saldo acumulado del fondo al terminar el año `year` (incluido). */
export async function saldoFondoAlCierre(ctx: RequestCtx, year: number): Promise<number> {
  const [abonos, usos] = await Promise.all([
    ctx.db.voucher.aggregate({
      _sum: { detraccionMonto: true },
      where: { year: { lte: year }, tipoMovimiento: 'VENTA', detraccion: true },
    }),
    ctx.db.monthlySummary.aggregate({
      _sum: { pagoConDetraccion: true },
      where: { year: { lte: year } },
    }),
  ])

  return round2(
    Number(abonos._sum.detraccionMonto ?? 0) - Number(usos._sum.pagoConDetraccion ?? 0)
  )
}

/** Saldo con el que abre el año `year`, es decir el cierre del anterior. */
export async function saldoFondoAlAbrirAnio(ctx: RequestCtx, year: number): Promise<number> {
  return saldoFondoAlCierre(ctx, year - 1)
}
