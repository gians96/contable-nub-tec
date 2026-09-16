/**
 * Guía de llenado del Formulario Virtual 0621 (IGV – Renta Mensual).
 *
 * Traduce el resumen de un mes a las casillas exactas del formulario y replica
 * las validaciones de SUNAT, para que los rechazos se vean aquí y no al final,
 * con el formulario ya a medio llenar.
 */
import type {
  CasillaGuia,
  DeterminacionDeuda,
  RegimenSpec,
  ResumenMensual,
  ValidacionCasilla,
} from '../types/tax'
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

  // El redondeo de la propia SUNAT puede quedar hasta medio sol por debajo del
  // piso teórico (1 506 × 18% = 271,08 y ella declara 271), así que un sol de
  // holgura evita avisar de algo que el formulario acepta sin chistar.
  if (tributoEntero < lo - 1 || tributoEntero > hi + 1) {
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
  /** Deuda del período calculada como la calcula SUNAT: sobre soles enteros. */
  determinacion: DeterminacionDeuda
}

/**
 * Tributo con el que SUNAT llena la casilla: débito (101, 155), crédito (108,
 * 157) y pago a cuenta de renta (302, sobre la 301).
 *
 * **No es el redondeo del IGV exacto, es la tasa sobre la base ya redondeada.**
 * Reconstruyendo declaraciones reales, es el único criterio que reproduce lo
 * que trae el formulario: con una base de 2 330,51 y un IGV de 419,49, SUNAT
 * no pone 419 sino 420, porque liquida 2 331 × 18% = 419,58. Y con una base de
 * 1 505,52 pone 271, aunque 1 506 × 18% = 271,08 quede un céntimo por encima.
 *
 * El orden importa porque de él salen el impuesto resultante, el saldo que se
 * arrastra y, al final, el importe a pagar: hacerlo al revés se desvía un sol.
 */
function tributoDeclarado(base: number, tasa: number): number {
  const baseEntera = redondeoSunat(base)
  if (!baseEntera || !tasa) return 0
  return redondeoSunat(baseEntera * tasa / 100)
}

/** Aviso cuando lo que liquida SUNAT no coincide con el IGV de los comprobantes. */
function notaTributo(exacto: number, declarado: number): string | undefined {
  if (redondeoSunat(exacto) === declarado) return undefined
  return 'SUNAT liquida esta casilla sobre la base ya redondeada, así que sale S/ ' +
    declarado + ' aunque el IGV exacto de tus comprobantes sea S/ ' + exacto.toFixed(2) + '.'
}

export interface OpcionesGuia {
  /** Tasa general vigente en el año (normalmente 18). */
  tasaGeneral?: number
  /** Tasa de la Ley 31556 vigente en el año (10 en 2025-2026, 12 desde 2027). */
  tasaLey31556?: number
  /** Texto del porcentaje o coeficiente de renta, para la casilla 315. */
  porcentajeRentaTexto?: string
  /**
   * Saldo a favor con el que SUNAT precarga la casilla 145: el que arrastra su
   * propia determinación del mes anterior, no el de la contabilidad exacta.
   * Sin él, la cadena de meses se desvía de la declaración real.
   */
  saldoFavorAnteriorSunat?: number
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

    const cuota = redondeoSunat(resumen.pagoIrSugerido)
    return {
      formulario: spec.formularioMensual,
      aplicaFormulario0621: false,
      casillas,
      bloqueos: [],
      determinacion: {
        igvResultante: 0,
        saldoFavorAnterior: 0,
        igvAPagar: 0,
        ingresosNetos: redondeoSunat(resumen.baseVentas),
        rentaAPagar: cuota,
        totalAPagar: cuota,
      },
    }
  }

  // ── IGV — Ventas ────────────────────────────────────
  const c101 = tributoDeclarado(resumen.baseVentasGravadas, tasaGeneral)
  const validacion101 = validarBandaTributo(
    resumen.baseVentasGravadas,
    c101,
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
    valor: c101,
    tab: 'IGV — Ventas',
    editable: true,
    nota: notaTributo(resumen.igvVentasGravadas, c101),
    validacion: validacion101,
  })

  let c155 = 0
  if (resumen.baseVentasLey31556 > 0 || resumen.igvVentasLey31556 > 0) {
    c155 = tributoDeclarado(resumen.baseVentasLey31556, tasaLey)
    const validacion155 = validarBandaTributo(
      resumen.baseVentasLey31556,
      c155,
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
      valor: c155,
      tab: 'IGV — Ventas',
      editable: true,
      nota: notaTributo(resumen.igvVentasLey31556, c155),
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
  //
  // El formulario liquida el crédito igual que el débito: la tasa sobre la base
  // ya redondeada. Con una compra de 8,47 y un IGV de 1,53, SUNAT propone
  // 107 = 8 y 108 = 1 (8 × 18% = 1,44), no 2, y con ese 1 opera la casilla 140.
  // Redondear el IGV de los comprobantes dejaba el saldo a favor un sol por
  // encima del de SUNAT, y el desfase se arrastraba a los meses siguientes.
  //
  // Sin banda: la del 18%–18,5% vale para el **débito** fiscal, no para el
  // crédito, que es el IGV que te cargaron tus proveedores. Si el crédito real
  // es menor que el propuesto, la nota lo avisa y la casilla se corrige a mano:
  // el formulario la deja editar.
  const c108 = tributoDeclarado(resumen.baseComprasGravadas, tasaGeneral)
  const c157 = tributoDeclarado(resumen.baseComprasLey31556, tasaLey)

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
    valor: c108,
    tab: 'IGV — Compras',
    editable: true,
    nota: notaTributo(resumen.igvComprasGravadas, c108),
  })

  if (resumen.baseComprasLey31556 > 0 || resumen.igvComprasLey31556 > 0) {
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
      valor: c157,
      tab: 'IGV — Compras',
      editable: true,
      nota: notaTributo(resumen.igvComprasLey31556, c157),
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
  //
  // Aquí se opera con los enteros de las casillas, no con los céntimos del
  // resumen. SUNAT redondea primero y suma después, y por ese orden su importe
  // a pagar puede diferir en un sol del que sale de la contabilidad exacta.
  // Manda el de SUNAT, que es el que se acaba pagando.
  const c145 = opts.saldoFavorAnteriorSunat != null
    ? redondeoSunat(opts.saldoFavorAnteriorSunat)
    : redondeoSunat(resumen.saldoIgvMesAnterior < 0 ? Math.abs(resumen.saldoIgvMesAnterior) : 0)
  const c140 = c101 + c155 - c108 - c157
  const c184 = c140 - c145

  casillas.push({
    casilla: '140',
    label: c140 >= 0 ? 'Impuesto resultante del período' : 'Saldo a favor del período',
    valor: Math.abs(c140),
    tab: 'Determinación',
    editable: false,
    nota: 'Casillas 101 y 155 menos 108 y 157, con los importes ya redondeados.',
  })

  if (c145 > 0) {
    casillas.push({
      casilla: '145',
      label: 'Saldo a favor del período anterior',
      valor: c145,
      tab: 'Determinación',
      editable: true,
      // SUNAT no siempre la precarga: con 0 el formulario cobra IGV que el saldo
      // a favor ya cubría, y el importe a pagar no cuadra con el de la app.
      nota: 'Debe coincidir con el saldo a favor (casilla 184) que declaraste el mes anterior. ' +
        'Si SUNAT la muestra en 0, escribe S/ ' + c145 + ': con 0 el formulario te cobra IGV que tu saldo a favor ya cubre.',
    })
  }

  casillas.push({
    casilla: '184',
    label: c184 >= 0 ? 'Tributo a pagar (IGV)' : 'Saldo a favor que se arrastra',
    valor: Math.abs(c184),
    tab: 'Determinación',
    editable: false,
    nota: c184 >= 0
      ? 'Casilla 140 menos la 145. Es el IGV que se paga este mes.'
      : 'No se paga IGV: este saldo pasa a la casilla 145 del mes siguiente.',
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
  // Como en la 312: la 301 ya redondeada por la 315 (691 × 1% = 6,91 → 7), y no
  // el pago a cuenta al céntimo redondeado, que en el borde del medio sol se
  // separa del de SUNAT.
  const tasaRenta = resumen.irMensual?.tasaAplicada ?? 0
  const c302 = tasaRenta > 0
    ? Math.max(0, tributoDeclarado(resumen.baseVentas, tasaRenta))
    : redondeoSunat(resumen.pagoIrSugerido)
  casillas.push({
    casilla: '302',
    label: spec.irMensualDefinitivo ? 'Renta del período (definitiva)' : 'Pago a cuenta del período',
    valor: c302,
    tab: 'Renta',
    editable: false,
    nota: 'Resulta de aplicar la casilla 315 sobre la 301.',
  })

  // Casillas 189 y 307. Se devuelve aparte y no como fila: es la cifra que
  // SUNAT enseña en la cabecera del formulario, y la guía la muestra igual.
  const totalAPagar = Math.max(0, c184) + c302

  const bloqueos = casillas
    .filter(c => c.validacion && !c.validacion.ok)
    .map(c => 'Casilla ' + c.casilla + ': ' + c.validacion!.mensaje)

  return {
    formulario: spec.formularioMensual,
    aplicaFormulario0621: true,
    casillas,
    bloqueos,
    determinacion: {
      igvResultante: c140,
      saldoFavorAnterior: c145,
      igvAPagar: c184,
      ingresosNetos: redondeoSunat(resumen.baseVentas),
      rentaAPagar: c302,
      totalAPagar,
    },
  }
}
