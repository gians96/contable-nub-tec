import type { PrismaClient } from '@prisma/client'
import type { CierreAnualResult, ResumenMensual } from '../../shared/types/tax'
import { calcularCierreAnual, resumirMes, round2 } from '../../shared/utils/tax'
import { loadTaxContext, type TaxContext, type TaxContextCache } from './taxContext'

/**
 * Meses que un activo se deprecia dentro de un ejercicio, respetando su vida
 * útil restante. La depreciación arranca el mes en que el bien entra en uso.
 */
function mesesDeUsoEnEjercicio(fecha: Date, vidaUtilMeses: number | null, year: number): number {
  const inicio = new Date(fecha)
  const anioInicio = inicio.getFullYear()

  if (anioInicio > year) return 0

  const mesInicioEnAnio = anioInicio === year ? inicio.getMonth() : 0
  const mesesPrevios = anioInicio < year ? (year - anioInicio) * 12 - inicio.getMonth() : 0
  const vida = vidaUtilMeses ?? Number.POSITIVE_INFINITY
  const restantes = Math.max(0, vida - mesesPrevios)
  const disponibles = 12 - mesInicioEnAnio

  return Math.max(0, Math.min(disponibles, restantes))
}

/**
 * Depreciación de los activos fijos imputable al ejercicio.
 *
 * Es la primera vez que el cierre anual consulta `inventory_assets`: hasta ahora
 * la fila "Depreciación" de /cierre-anual estaba fija en 0 mientras /inventario
 * afirmaba que se sumaba automáticamente.
 */
export async function depreciacionDelEjercicio(
  prisma: PrismaClient,
  year: number
): Promise<number> {
  const activos = await prisma.inventoryAsset.findMany({
    where: {
      destinoTributario: 'ACTIVO_FIJO',
      estadoCierre: { not: 'DADO_BAJA' },
      year: { lte: year },
    },
  })

  let total = 0
  for (const a of activos) {
    if (a.depreciacionMensual == null) continue
    const meses = mesesDeUsoEnEjercicio(a.fecha, a.vidaUtilMeses, year)
    if (meses <= 0) continue
    total += Number(a.depreciacionMensual) * meses
  }

  return round2(total)
}

export interface CierreAnualComputado {
  ctx: TaxContext
  cierre: CierreAnualResult
  resumenes: ResumenMensual[]
  totales: {
    ventasBrutas: number
    costoVentas: number
    gastosAdministracion: number
    gastosVentas: number
    depreciacion: number
    pagosCuentaAcumulados: number
  }
  manuales: {
    descuentos: number
    otrosIngresos: number
    otrosGastos: number
    adiciones: number
    deducciones: number
    retenciones: number
    saldoFavorAnterior: number
    observaciones: string
  }
}

/** Cache por request, para no recomputar el cierre de un año varias veces. */
export type CierreCache = Map<number, CierreAnualComputado>

/**
 * Cierre anual completo de un ejercicio. Lo usan tanto `/api/annual-closure`
 * como el cálculo del coeficiente de pagos a cuenta, que necesita el impuesto
 * anual del ejercicio anterior.
 *
 * Ojo: `AnnualClosure.impuestoAnual` existe como columna pero nunca se escribe,
 * así que no sirve como fuente; hay que recomputar.
 */
export async function computeCierreAnual(
  prisma: PrismaClient,
  year: number,
  caches?: { tax?: TaxContextCache; cierre?: CierreCache }
): Promise<CierreAnualComputado> {
  const cached = caches?.cierre?.get(year)
  if (cached) return cached

  const ctx = await loadTaxContext(prisma, year, caches?.tax)

  const vouchers = await prisma.voucher.findMany({ where: { year } })
  const saved = await prisma.annualClosure.findUnique({ where: { year } })
  const savedSummaries = await prisma.monthlySummary.findMany({ where: { year } })

  const resumenes: ResumenMensual[] = []
  let ventasBrutas = 0
  let costoVentas = 0
  let gastosAdministracion = 0
  let gastosVentas = 0
  let saldoAnterior = 0

  for (let month = 1; month <= 12; month++) {
    const resumen = resumirMes(vouchers.filter(v => v.month === month), year, month, {
      saldoIgvMesAnterior: saldoAnterior,
      aplicaIgv: ctx.spec.aplicaIgv,
      aplicaCreditoFiscal: ctx.spec.aplicaCreditoFiscal,
      irMonthlyPercent: ctx.irParams.irMonthlyPercent,
    })
    resumenes.push(resumen)
    ventasBrutas += resumen.baseVentas
    costoVentas += resumen.costoVentas
    gastosAdministracion += resumen.gastoAdministracion
    gastosVentas += resumen.gastoVentas
    saldoAnterior = resumen.saldoIgvMes
  }

  let pagosCuentaAcumulados = 0
  for (const s of savedSummaries) pagosCuentaAcumulados += Number(s.pagoIrEfectuado)

  const depreciacion = await depreciacionDelEjercicio(prisma, year)

  const manuales = {
    descuentos: Number(saved?.descuentos ?? 0),
    otrosIngresos: Number(saved?.otrosIngresos ?? 0),
    otrosGastos: Number(saved?.otrosGastos ?? 0),
    adiciones: Number(saved?.adiciones ?? 0),
    deducciones: Number(saved?.deducciones ?? 0),
    retenciones: Number(saved?.retenciones ?? 0),
    saldoFavorAnterior: Number(saved?.saldoFavorAnterior ?? 0),
    observaciones: saved?.observaciones ?? '',
  }

  const cierre = calcularCierreAnual({
    regimen: ctx.spec.code,
    aplicaTramosIr: ctx.spec.aplicaTramosIr,
    aplicaIrAnualPlano: ctx.spec.aplicaIrAnualPlano,
    ventasNetas: round2(ventasBrutas),
    descuentos: manuales.descuentos,
    costoVentas: round2(costoVentas),
    gastosVentas: round2(gastosVentas),
    gastosAdministracion: round2(gastosAdministracion),
    depreciacion,
    otrosIngresos: manuales.otrosIngresos,
    otrosGastos: manuales.otrosGastos,
    adiciones: manuales.adiciones,
    deducciones: manuales.deducciones,
    pagosCuentaAcumulados: round2(pagosCuentaAcumulados),
    retenciones: manuales.retenciones,
    saldoFavorAnterior: manuales.saldoFavorAnterior,
    uit: ctx.uit,
    tramo1Limit: ctx.tramo1Limit,
    tramo1Rate: ctx.tramo1Rate,
    tramo2Rate: ctx.tramo2Rate,
    flatRate: ctx.flatRate,
  })

  const resultado: CierreAnualComputado = {
    ctx,
    cierre,
    resumenes,
    totales: {
      ventasBrutas: round2(ventasBrutas),
      costoVentas: round2(costoVentas),
      gastosAdministracion: round2(gastosAdministracion),
      gastosVentas: round2(gastosVentas),
      depreciacion,
      pagosCuentaAcumulados: round2(pagosCuentaAcumulados),
    },
    manuales,
  }

  caches?.cierre?.set(year, resultado)
  return resultado
}
