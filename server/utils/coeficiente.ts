import { computeCierreAnual } from './cierreAnual'
import type { TaxContext } from './taxContext'
import type { RequestCtx } from './tenant'

export interface CoeficienteResuelto {
  valor: number | null
  origen: 'manual' | 'calculado' | 'sin-datos' | 'no-aplica'
  detalle: string
}

/**
 * Coeficiente para el pago a cuenta del RG (y del RMT por encima de 300 UIT):
 * impuesto calculado del ejercicio anterior / ingresos netos del ejercicio anterior.
 *
 * Un valor en `coeficienteManual` manda sobre el cálculo; es la palanca para el
 * caso en que la empresa ya tiene el dato de su declaración anual presentada.
 */
export async function resolverCoeficiente(
  ctx: RequestCtx,
  taxContext: TaxContext
): Promise<CoeficienteResuelto> {
  if (!taxContext.spec.usaCoeficiente) {
    return {
      valor: null,
      origen: 'no-aplica',
      detalle: 'El régimen ' + taxContext.spec.label + ' no usa coeficiente.',
    }
  }

  if (taxContext.coeficienteManual != null) {
    return {
      valor: taxContext.coeficienteManual,
      origen: 'manual',
      detalle: 'Coeficiente ingresado manualmente en Configuración.',
    }
  }

  const prevYear = taxContext.year - 1

  const ingresos = await ctx.db.voucher.aggregate({
    where: { year: prevYear, tipoMovimiento: 'VENTA' },
    _sum: { baseImponible: true },
  })
  const ingresosNetos = Number(ingresos._sum.baseImponible ?? 0)

  if (ingresosNetos <= 0) {
    return {
      valor: null,
      origen: 'sin-datos',
      detalle: 'No hay ventas registradas en ' + prevYear + ' para calcular el coeficiente.',
    }
  }

  const { cierre } = await computeCierreAnual(ctx, prevYear)
  const impuestoAnual = cierre.impuestoAnual

  if (impuestoAnual <= 0) {
    return {
      valor: 0,
      origen: 'calculado',
      detalle: 'El ejercicio ' + prevYear + ' no arrojó impuesto calculado: el coeficiente es 0 y se aplica la tasa mínima.',
    }
  }

  const valor = Math.round((impuestoAnual / ingresosNetos) * 10000) / 10000

  return {
    valor,
    origen: 'calculado',
    detalle:
      'Calculado del ejercicio ' + prevYear + ': impuesto S/ ' + impuestoAnual +
      ' entre ingresos netos S/ ' + Math.round(ingresosNetos) + '.',
  }
}
