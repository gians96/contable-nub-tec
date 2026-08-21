/**
 * Motor de cálculo tributario. Fuente única para `app/` y `server/`.
 *
 * Auto-importado en ambos bundles por la convención `shared/utils/` de Nuxt 4.
 */
import type {
  BaseIgvResult,
  CierreAnualInput,
  CierreAnualResult,
  ClasificacionSugerida,
  IGVNetoResult,
  IrMensualResult,
  ResumenMensual,
} from '../types/tax'
import { SUBCATEGORIAS_POR_DESTINO } from './labels'

// ─── UTILIDADES ────────────────────────────────────────

/**
 * Redondeo a 2 decimales.
 */
export function round2(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Redondeo referencial tipo SUNAT: sin decimales.
 */
export function redondeoSunat(valor: number): number {
  return Math.round(valor)
}

// ─── CÁLCULO BASE E IGV ────────────────────────────────

/**
 * Calcula base imponible e IGV a partir del importe total.
 * Si afectoIgv = true: base = total / (1 + igvPercent/100), igv = total - base
 * Si afectoIgv = false: base = total, igv = 0
 *
 * El IGV es residual (`total - base`) y no `base * tasa`, para que `base + igv`
 * cuadre siempre con el total del comprobante.
 */
export function calcularBaseEIGV(
  total: number,
  afectoIgv: boolean,
  igvPercent: number = 18
): BaseIgvResult {
  if (!afectoIgv || total === 0 || !igvPercent) {
    return { baseImponible: round2(total), igv: 0 }
  }
  const factor = 1 + igvPercent / 100
  const baseImponible = round2(total / factor)
  const igv = round2(total - baseImponible)
  return { baseImponible, igv }
}

// ─── CLASIFICACIÓN DE OPERACIÓN ─────────────────────────

/**
 * Sugiere subcategorías según el destino tributario.
 * NO_DEDUCIBLE no genera crédito fiscal ni es deducible para IR.
 */
export function clasificarOperacion(destinoTributario: string): ClasificacionSugerida {
  return {
    subcategorias: SUBCATEGORIAS_POR_DESTINO[destinoTributario] || ['OTRO'],
    deducibleIr: destinoTributario !== 'NO_DEDUCIBLE',
    creditoFiscalIgv: destinoTributario !== 'NO_DEDUCIBLE' && destinoTributario !== 'VENTA',
  }
}

/**
 * A qué juego de casillas del Formulario 0621 pertenece un comprobante.
 * Se decide por el enum `regimenIgv` y no por la tasa numérica: el 10% podría
 * venir de otra norma, y la propia Ley 31556 sube al 12% en 2027.
 */
export function grupoIgvDelVoucher(v: any): 'GENERAL' | 'LEY_31556' | 'NO_GRAVADA' {
  if (v.afectoIgv === false) return 'NO_GRAVADA'
  const regimen = v.regimenIgv ?? 'GENERAL'
  if (regimen === 'EXONERADO' || regimen === 'INAFECTO') return 'NO_GRAVADA'
  if (regimen === 'LEY_31556') return 'LEY_31556'
  return 'GENERAL'
}

// ─── RESUMEN MENSUAL ───────────────────────────────────

export interface ResumirMesOptions {
  saldoIgvMesAnterior?: number
  /** NRUS: sin débito ni crédito fiscal. */
  aplicaIgv?: boolean
  aplicaCreditoFiscal?: boolean
  /** Pago de renta ya calculado por el caller (necesita contexto anual). */
  irMensual?: IrMensualResult
  /** Fallback cuando no se inyecta `irMensual`. */
  irMonthlyPercent?: number
}

/**
 * Calcula el resumen mensual a partir de una lista de vouchers.
 * Todos los montos son base imponible (sin IGV), excepto totalVentas e igv*.
 */
export function resumirMes(
  vouchers: any[],
  year: number,
  month: number,
  opts: ResumirMesOptions = {}
): ResumenMensual {
  const saldoIgvMesAnterior = opts.saldoIgvMesAnterior ?? 0
  const aplicaIgv = opts.aplicaIgv !== false
  const aplicaCreditoFiscal = aplicaIgv && opts.aplicaCreditoFiscal !== false

  let baseVentas = 0
  let igvVentas = 0
  let totalVentas = 0
  let baseComprasCreditoFiscal = 0
  let igvComprasCreditoFiscal = 0
  let costoVentas = 0
  let gastoAdministracion = 0
  let gastoVentas = 0
  let activoFijo = 0
  let comprasNoDeducibles = 0
  let totalComprasMes = 0
  let detraccionVentas = 0
  let detraccionCompras = 0

  // Desglose por casilla del 0621
  let baseVentasGravadas = 0
  let igvVentasGravadas = 0
  let baseVentasLey31556 = 0
  let igvVentasLey31556 = 0
  let baseVentasNoGravadas = 0
  let baseComprasGravadas = 0
  let igvComprasGravadas = 0
  let baseComprasLey31556 = 0
  let igvComprasLey31556 = 0
  let comprasNoGravadas = 0

  for (const v of vouchers) {
    const base = Number(v.baseImponible)
    const igv = aplicaIgv ? Number(v.igv) : 0
    const total = Number(v.importeTotal)
    const grupo = grupoIgvDelVoucher(v)
    // La detracción no entra en ninguna casilla del 0621: se acumula aparte
    // porque afecta a la caja, no al impuesto.
    const detraccion = v.detraccion ? Number(v.detraccionMonto ?? 0) : 0

    if (v.tipoMovimiento === 'VENTA') {
      detraccionVentas += detraccion
      baseVentas += base
      igvVentas += igv
      totalVentas += total

      if (!aplicaIgv || grupo === 'NO_GRAVADA') {
        baseVentasNoGravadas += base
      } else if (grupo === 'LEY_31556') {
        baseVentasLey31556 += base
        igvVentasLey31556 += igv
      } else {
        baseVentasGravadas += base
        igvVentasGravadas += igv
      }
    } else {
      // COMPRA
      detraccionCompras += detraccion
      totalComprasMes += total

      const conCredito = aplicaCreditoFiscal && v.creditoFiscalIgv && grupo !== 'NO_GRAVADA'

      if (conCredito) {
        baseComprasCreditoFiscal += base
        igvComprasCreditoFiscal += igv

        if (grupo === 'LEY_31556') {
          baseComprasLey31556 += base
          igvComprasLey31556 += igv
        } else {
          baseComprasGravadas += base
          igvComprasGravadas += igv
        }
      } else {
        comprasNoGravadas += base
      }

      switch (v.destinoTributario) {
        case 'COSTO_VENTAS':
          costoVentas += base
          break
        case 'GASTO_ADMIN':
          gastoAdministracion += base
          break
        case 'GASTO_VENTA':
          gastoVentas += base
          break
        case 'ACTIVO_FIJO':
          activoFijo += base
          break
        case 'NO_DEDUCIBLE':
          comprasNoDeducibles += total
          break
      }
    }
  }

  const { igvNetoMes, saldoIgvMes } = aplicaIgv
    ? calcularIGVNetoMes(igvVentas, igvComprasCreditoFiscal, saldoIgvMesAnterior)
    : { igvNetoMes: 0, saldoIgvMes: 0 }

  const pagoIrSugerido = opts.irMensual
    ? opts.irMensual.monto
    : calcularIRMensualSugerido(baseVentas, opts.irMonthlyPercent ?? 1)
  const pagoIgvAPagar = igvNetoMes > 0 ? igvNetoMes : 0
  const pagoTotalSugerido = round2(pagoIgvAPagar + pagoIrSugerido)

  return {
    year,
    month,
    baseVentas: round2(baseVentas),
    igvVentas: round2(igvVentas),
    totalVentas: round2(totalVentas),
    baseComprasCreditoFiscal: round2(baseComprasCreditoFiscal),
    igvComprasCreditoFiscal: round2(igvComprasCreditoFiscal),

    baseVentasGravadas: round2(baseVentasGravadas),
    igvVentasGravadas: round2(igvVentasGravadas),
    baseVentasLey31556: round2(baseVentasLey31556),
    igvVentasLey31556: round2(igvVentasLey31556),
    baseVentasNoGravadas: round2(baseVentasNoGravadas),
    baseComprasGravadas: round2(baseComprasGravadas),
    igvComprasGravadas: round2(igvComprasGravadas),
    baseComprasLey31556: round2(baseComprasLey31556),
    igvComprasLey31556: round2(igvComprasLey31556),
    comprasNoGravadas: round2(comprasNoGravadas),
    totalComprasMes: round2(totalComprasMes),

    detraccionVentas: round2(detraccionVentas),
    detraccionCompras: round2(detraccionCompras),
    netoCobradoVentas: round2(totalVentas - detraccionVentas),
    netoPagadoCompras: round2(totalComprasMes - detraccionCompras),

    costoVentas: round2(costoVentas),
    gastoAdministracion: round2(gastoAdministracion),
    gastoVentas: round2(gastoVentas),
    activoFijo: round2(activoFijo),
    comprasNoDeducibles: round2(comprasNoDeducibles),
    igvNetoMes: round2(igvNetoMes),
    saldoIgvMesAnterior: round2(aplicaIgv ? saldoIgvMesAnterior : 0),
    saldoIgvMes: round2(saldoIgvMes),
    pagoIrSugerido: round2(pagoIrSugerido),
    pagoTotalSugerido: round2(pagoTotalSugerido),
    irMensual: opts.irMensual,
  }
}

// ─── IGV NETO DEL MES ──────────────────────────────────

/**
 * Calcula el IGV neto del mes considerando saldo anterior (crédito fiscal).
 * Si hay saldo a favor anterior, se descuenta del IGV neto.
 * Si el resultado es negativo, se arrastra como saldo a favor (meses sin ventas siguen arrastrando el crédito).
 * La deuda por IGV no pagado se acumula aparte en la API (desde 2026), ver `server/utils/monthlyIgvDebt.ts`.
 */
export function calcularIGVNetoMes(
  igvVentas: number,
  igvCompras: number,
  saldoAnterior: number = 0
): IGVNetoResult {
  const netoBase = igvVentas - igvCompras
  const netoConSaldo = netoBase + saldoAnterior // saldoAnterior es negativo si hay saldo a favor

  if (netoConSaldo >= 0) {
    return { igvNetoMes: round2(netoConSaldo), saldoIgvMes: 0 }
  } else {
    // Saldo a favor: se arrastra al siguiente mes (como valor negativo)
    return { igvNetoMes: 0, saldoIgvMes: round2(netoConSaldo) }
  }
}

// ─── IR MENSUAL SUGERIDO ───────────────────────────────

/**
 * Pago a cuenta simple = baseVentas * irPercent / 100.
 * Solo se usa como fallback; el cálculo por régimen vive en `calcularIrMensual`.
 */
export function calcularIRMensualSugerido(
  baseVentas: number,
  irPercent: number = 1
): number {
  return round2(baseVentas * irPercent / 100)
}

// ─── IMPUESTO ANUAL ────────────────────────────────────

export interface ImpuestoAnualResult {
  impuestoAnual: number
  irTramo1: number
  irTramo2: number
  limiteTramo1: number
}

/**
 * IR anual sobre la renta neta imponible, según el régimen.
 * RMT: por tramos. RG: tasa plana. RER y NRUS: no presentan DJ anual.
 */
export function calcularImpuestoAnual(
  rentaNetaImponible: number,
  opts: {
    aplicaTramosIr: boolean
    aplicaIrAnualPlano: boolean
    uit: number
    tramo1Limit: number
    tramo1Rate: number
    tramo2Rate: number
    flatRate: number
  }
): ImpuestoAnualResult {
  const limiteTramo1 = opts.tramo1Limit * opts.uit

  if (opts.aplicaTramosIr) {
    let irTramo1 = 0
    let irTramo2 = 0

    if (rentaNetaImponible <= limiteTramo1) {
      irTramo1 = rentaNetaImponible * opts.tramo1Rate / 100
    } else {
      irTramo1 = limiteTramo1 * opts.tramo1Rate / 100
      irTramo2 = (rentaNetaImponible - limiteTramo1) * opts.tramo2Rate / 100
    }

    return {
      impuestoAnual: round2(irTramo1 + irTramo2),
      irTramo1: round2(irTramo1),
      irTramo2: round2(irTramo2),
      limiteTramo1: round2(limiteTramo1),
    }
  }

  if (opts.aplicaIrAnualPlano) {
    const impuesto = round2(rentaNetaImponible * opts.flatRate / 100)
    return { impuestoAnual: impuesto, irTramo1: 0, irTramo2: impuesto, limiteTramo1: 0 }
  }

  return { impuestoAnual: 0, irTramo1: 0, irTramo2: 0, limiteTramo1: round2(limiteTramo1) }
}

// ─── CIERRE ANUAL ──────────────────────────────────────

/**
 * Cierre anual de la renta empresarial.
 * `ventasNetas` entra bruta; los descuentos se restan aquí (casillas 461 y 462).
 */
export function calcularCierreAnual(input: CierreAnualInput): CierreAnualResult {
  const descuentos = input.descuentos ?? 0
  const depreciacion = input.depreciacion ?? 0
  const otrosIngresos = input.otrosIngresos ?? 0
  const otrosGastos = input.otrosGastos ?? 0
  const adiciones = input.adiciones ?? 0
  const deducciones = input.deducciones ?? 0
  const pagosCuentaAcumulados = input.pagosCuentaAcumulados ?? 0
  const retenciones = input.retenciones ?? 0
  const saldoFavorAnterior = input.saldoFavorAnterior ?? 0

  const ventasNetas = input.ventasNetas - descuentos
  const utilidadBruta = ventasNetas - input.costoVentas
  const utilidadOperativa = utilidadBruta - input.gastosVentas - input.gastosAdministracion - depreciacion
  const utilidadContable = utilidadOperativa + otrosIngresos - otrosGastos

  // Renta neta imponible = utilidad contable + adiciones - deducciones
  let rentaNetaImponible = utilidadContable + adiciones - deducciones
  if (rentaNetaImponible < 0) rentaNetaImponible = 0

  const { impuestoAnual, irTramo1, irTramo2, limiteTramo1 } = calcularImpuestoAnual(
    rentaNetaImponible,
    {
      aplicaTramosIr: input.aplicaTramosIr,
      aplicaIrAnualPlano: input.aplicaIrAnualPlano,
      uit: input.uit,
      tramo1Limit: input.tramo1Limit,
      tramo1Rate: input.tramo1Rate,
      tramo2Rate: input.tramo2Rate,
      flatRate: input.flatRate,
    }
  )

  // Saldo
  const totalCreditos = pagosCuentaAcumulados + retenciones + saldoFavorAnterior
  const diferencia = impuestoAnual - totalCreditos

  return {
    regimen: input.regimen,
    aplicaDjAnual: input.aplicaTramosIr || input.aplicaIrAnualPlano,
    ventasNetas: round2(ventasNetas),
    descuentos: round2(descuentos),
    costoVentas: round2(input.costoVentas),
    gastosVentas: round2(input.gastosVentas),
    gastosAdministracion: round2(input.gastosAdministracion),
    depreciacion: round2(depreciacion),
    otrosIngresos: round2(otrosIngresos),
    otrosGastos: round2(otrosGastos),
    utilidadBruta: round2(utilidadBruta),
    utilidadOperativa: round2(utilidadOperativa),
    utilidadContable: round2(utilidadContable),
    adiciones: round2(adiciones),
    deducciones: round2(deducciones),
    rentaNetaImponible: round2(rentaNetaImponible),
    limiteTramo1,
    irTramo1,
    irTramo2,
    impuestoAnual,
    pagosCuentaAcumulados: round2(pagosCuentaAcumulados),
    retenciones: round2(retenciones),
    saldoFavorAnterior: round2(saldoFavorAnterior),
    saldoPorPagar: diferencia > 0 ? round2(diferencia) : 0,
    saldoAFavor: diferencia < 0 ? round2(Math.abs(diferencia)) : 0,
  }
}
