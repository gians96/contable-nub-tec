/**
 * Guía de llenado del Formulario Virtual 0621 (IGV – Renta Mensual).
 *
 * Traduce el resumen de un mes a las casillas exactas del formulario y replica
 * las validaciones de SUNAT, para que los rechazos se vean aquí y no al final,
 * con el formulario ya a medio llenar.
 */
import type { CasillaGuia, RegimenSpec, ResumenMensual, ValidacionCasilla } from '../types/tax'
import { redondeoSunat } from './tax'

/**
 * Tolerancia de SUNAT sobre el tributo declarado: debe caer entre la tasa y la
 * tasa + 0,5 puntos de su base. Es el margen que deja para el redondeo a soles
 * enteros (para el 18% la banda es 18%–18,5%; para la Ley 31556, 10%–10,5%).
 */
export const TOLERANCIA_BANDA_PP = 0.5

function enterosEnRango(min: number, max: number): { lo: number; hi: number; hay: boolean } {
  const lo = Math.ceil(min - 1e-9)
  const hi = Math.floor(max + 1e-9)
  return { lo, hi, hay: lo <= hi }
}

/**
 * Comprueba que el tributo declarado caiga en la banda que exige SUNAT.
 *
 * El caso que rompe el formulario es el de bases pequeñas: con una base de 46 al
 * 10%, la banda es 4,60–4,83 y **no existe ningún entero dentro**, así que el
 * formulario no deja avanzar por más que se pruebe (4 da 8,7% y 5 da 10,87%).
 */
export function validarBandaTributo(
  base: number,
  tributo: number,
  tasa: number,
  opts: { casillaBase: string; casillaTributo: string; ley31556?: boolean } = {
    casillaBase: '',
    casillaTributo: '',
  }
): ValidacionCasilla | undefined {
  const baseEntera = redondeoSunat(base)
  const tributoEntero = redondeoSunat(tributo)

  if (baseEntera <= 0 || !tasa) return undefined

  const min = baseEntera * tasa / 100
  const max = baseEntera * (tasa + TOLERANCIA_BANDA_PP) / 100
  const { lo, hi, hay } = enterosEnRango(min, max)

  const banda = 'S/ ' + min.toFixed(2) + ' – S/ ' + max.toFixed(2)

  if (!hay) {
    // Base demasiado pequeña: ningún importe en soles enteros satisface la banda.
    const baseMin = Math.ceil(tributoEntero / ((tasa + TOLERANCIA_BANDA_PP) / 100))
    const baseMax = Math.floor(tributoEntero / (tasa / 100))

    const sugerencias = [
      'Acumula en la casilla ' + opts.casillaBase + ' todas las compras del período con esta tasa: con una base mayor el redondeo sí cae dentro de la banda.',
      'O no tomes el crédito fiscal de ese comprobante: deja ' + opts.casillaBase + ' y ' + opts.casillaTributo +
        ' en 0 y marca el comprobante como sin crédito fiscal. El gasto sigue siendo deducible para renta.',
    ]

    if (opts.ley31556) {
      sugerencias.push(
        'Verifica que el proveedor esté inscrito como MYPE beneficiaria de la Ley 31556. Si no lo está, la operación va al 18% (casillas 107 y 108), no al 10%.'
      )
    }

    if (baseMin <= baseMax) {
      sugerencias.push(
        'Declarar S/ ' + tributoEntero + ' exigiría una base entre S/ ' + baseMin + ' y S/ ' + baseMax +
        ', que no corresponde a tus comprobantes: no es una salida recomendable.'
      )
    }

    return {
      ok: false,
      mensaje:
        'SUNAT exige que la casilla ' + opts.casillaTributo + ' esté entre el ' + tasa + '% y el ' +
        (tasa + TOLERANCIA_BANDA_PP) + '% de la ' + opts.casillaBase + ' (' + banda +
        '), pero el formulario solo acepta soles enteros y no hay ninguno en ese rango.',
      sugerencias,
    }
  }

  if (tributoEntero < lo || tributoEntero > hi) {
    return {
      ok: false,
      mensaje:
        'SUNAT rechazará S/ ' + tributoEntero + ': la casilla ' + opts.casillaTributo +
        ' debe estar entre S/ ' + lo + ' y S/ ' + hi + ' (' + tasa + '% – ' +
        (tasa + TOLERANCIA_BANDA_PP) + '% de la ' + opts.casillaBase + ').',
      sugerencias: ['Declara S/ ' + (tributoEntero < lo ? lo : hi) + ' en la casilla ' + opts.casillaTributo + '.'],
    }
  }

  return {
    ok: true,
    mensaje: 'Dentro de la banda que exige SUNAT (' + banda + ').',
  }
}

export interface Guia0621 {
  /** Formulario que corresponde al régimen. */
  formulario: string
  /** false en NRUS: no se declara IGV ni renta de tercera en el 0621. */
  aplicaFormulario0621: boolean
  casillas: CasillaGuia[]
  /** Problemas que impedirían enviar la declaración. */
  bloqueos: string[]
}

export interface OpcionesGuia {
  /** Tasa general vigente en el año (normalmente 18). */
  tasaGeneral?: number
  /** Tasa de la Ley 31556 vigente en el año (10 en 2025-2026, 12 desde 2027). */
  tasaLey31556?: number
  /** Texto del porcentaje o coeficiente de renta, para la casilla 315. */
  porcentajeRentaTexto?: string
}

/**
 * Traduce el resumen de un mes a las casillas del 0621, ya redondeadas a soles.
 */
export function generarGuia0621(
  resumen: ResumenMensual,
  spec: RegimenSpec,
  opts: OpcionesGuia = {}
): Guia0621 {
  const tasaGeneral = opts.tasaGeneral ?? 18
  const tasaLey = opts.tasaLey31556 ?? 10
  const casillas: CasillaGuia[] = []

  if (!spec.aplicaIgv) {
    // NRUS: cuota fija, sin IGV ni renta de tercera categoría.
    casillas.push({
      casilla: '—',
      label: 'Cuota mensual del Nuevo RUS',
      valor: redondeoSunat(resumen.pagoIrSugerido),
      tab: 'Renta',
      editable: true,
      nota: 'Se paga con la guía de pagos varios / ' + spec.formularioMensual + ', no con el 0621.',
    })

    return {
      formulario: spec.formularioMensual,
      aplicaFormulario0621: false,
      casillas,
      bloqueos: [],
    }
  }

  // ── IGV — Ventas ────────────────────────────────────
  const validacion101 = validarBandaTributo(
    resumen.baseVentasGravadas,
    resumen.igvVentasGravadas,
    tasaGeneral,
    { casillaBase: '100', casillaTributo: '101' }
  )

  casillas.push({
    casilla: '100',
    label: 'Ventas netas gravadas',
    valor: redondeoSunat(resumen.baseVentasGravadas),
    tab: 'IGV — Ventas',
    editable: true,
    nota: 'Base imponible de tus ventas al ' + tasaGeneral + '%, sin el IGV.',
  })
  casillas.push({
    casilla: '101',
    label: 'IGV de ventas gravadas',
    valor: redondeoSunat(resumen.igvVentasGravadas),
    tab: 'IGV — Ventas',
    editable: true,
    validacion: validacion101,
  })

  if (resumen.baseVentasLey31556 > 0 || resumen.igvVentasLey31556 > 0) {
    const validacion155 = validarBandaTributo(
      resumen.baseVentasLey31556,
      resumen.igvVentasLey31556,
      tasaLey,
      { casillaBase: '154', casillaTributo: '155', ley31556: true }
    )

    casillas.push({
      casilla: '154',
      label: 'Ventas netas gravadas Ley N° 31556',
      valor: redondeoSunat(resumen.baseVentasLey31556),
      tab: 'IGV — Ventas',
      editable: true,
      nota: 'Tus ventas al ' + tasaLey + '%, si tu empresa está acogida a la Ley 31556.',
    })
    casillas.push({
      casilla: '155',
      label: 'IGV de ventas Ley N° 31556',
      valor: redondeoSunat(resumen.igvVentasLey31556),
      tab: 'IGV — Ventas',
      editable: true,
      validacion: validacion155,
    })
  }

  if (resumen.baseVentasNoGravadas > 0) {
    casillas.push({
      casilla: '105',
      label: 'Ventas no gravadas',
      valor: redondeoSunat(resumen.baseVentasNoGravadas),
      tab: 'IGV — Ventas',
      editable: true,
      nota: 'Operaciones exoneradas o inafectas.',
    })
  }

  // ── IGV — Compras ───────────────────────────────────
  const validacion108 = validarBandaTributo(
    resumen.baseComprasGravadas,
    resumen.igvComprasGravadas,
    tasaGeneral,
    { casillaBase: '107', casillaTributo: '108' }
  )

  casillas.push({
    casilla: '107',
    label: 'Compras netas destinadas a ventas gravadas',
    valor: redondeoSunat(resumen.baseComprasGravadas),
    tab: 'IGV — Compras',
    editable: true,
    nota: 'Solo compras al ' + tasaGeneral + '% con derecho a crédito fiscal.',
  })
  casillas.push({
    casilla: '108',
    label: 'IGV de compras destinadas a ventas gravadas',
    valor: redondeoSunat(resumen.igvComprasGravadas),
    tab: 'IGV — Compras',
    editable: true,
    validacion: validacion108,
  })

  if (resumen.baseComprasLey31556 > 0 || resumen.igvComprasLey31556 > 0) {
    const validacion157 = validarBandaTributo(
      resumen.baseComprasLey31556,
      resumen.igvComprasLey31556,
      tasaLey,
      { casillaBase: '156', casillaTributo: '157', ley31556: true }
    )

    casillas.push({
      casilla: '156',
      label: 'Compras netas destinadas a ventas gravadas Ley N° 31556',
      valor: redondeoSunat(resumen.baseComprasLey31556),
      tab: 'IGV — Compras',
      editable: true,
      nota: 'Compras en las que el proveedor facturó al ' + tasaLey + '% por estar acogido a la Ley 31556.',
    })
    casillas.push({
      casilla: '157',
      label: 'IGV de compras Ley N° 31556',
      valor: redondeoSunat(resumen.igvComprasLey31556),
      tab: 'IGV — Compras',
      editable: true,
      validacion: validacion157,
    })
  }

  if (resumen.comprasNoGravadas > 0) {
    casillas.push({
      casilla: '113',
      label: 'Compras netas destinadas a ventas no gravadas',
      valor: redondeoSunat(resumen.comprasNoGravadas),
      tab: 'IGV — Compras',
      editable: true,
      nota: 'Compras sin derecho a crédito fiscal. Si son operaciones no gravadas del proveedor, van a la casilla 120.',
    })
  }

  // ── Determinación del IGV ───────────────────────────
  const saldoAFavorAnterior = resumen.saldoIgvMesAnterior < 0 ? Math.abs(resumen.saldoIgvMesAnterior) : 0

  if (saldoAFavorAnterior > 0) {
    casillas.push({
      casilla: '145',
      label: 'Saldo a favor del período anterior',
      valor: redondeoSunat(saldoAFavorAnterior),
      tab: 'Determinación',
      editable: true,
      nota: 'Crédito fiscal arrastrado del mes anterior.',
    })
  }

  casillas.push({
    casilla: '140',
    label: resumen.igvNetoMes > 0 ? 'IGV resultante del período' : 'Saldo a favor del período',
    valor: redondeoSunat(resumen.igvNetoMes > 0 ? resumen.igvNetoMes : Math.abs(resumen.saldoIgvMes)),
    tab: 'Determinación',
    editable: false,
    nota: 'Lo calcula SUNAT a partir de las casillas anteriores; verifica que coincida.',
  })

  // ── Renta ───────────────────────────────────────────
  casillas.push({
    casilla: '301',
    label: 'Ingresos netos del mes',
    valor: redondeoSunat(resumen.baseVentas),
    tab: 'Renta',
    editable: true,
    nota: 'Ingresos netos de tercera categoría, sin IGV.',
  })
  casillas.push({
    casilla: '315',
    label: spec.usaCoeficiente ? 'Coeficiente o porcentaje' : 'Porcentaje',
    valor: resumen.irMensual?.tasaAplicada ?? 0,
    tab: 'Renta',
    editable: true,
    nota: opts.porcentajeRentaTexto ?? resumen.irMensual?.concepto,
  })
  casillas.push({
    casilla: '302',
    label: spec.irMensualDefinitivo ? 'Renta del período (definitiva)' : 'Pago a cuenta del período',
    valor: redondeoSunat(resumen.pagoIrSugerido),
    tab: 'Renta',
    editable: false,
    nota: 'Resulta de aplicar la casilla 315 sobre la 301.',
  })

  const bloqueos = casillas
    .filter(c => c.validacion && !c.validacion.ok)
    .map(c => 'Casilla ' + c.casilla + ': ' + c.validacion!.mensaje)

  return {
    formulario: spec.formularioMensual,
    aplicaFormulario0621: true,
    casillas,
    bloqueos,
  }
}
