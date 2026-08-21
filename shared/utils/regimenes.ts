/**
 * Regímenes tributarios peruanos y tasas de IGV.
 *
 * `REGIMENES` es una tabla de flags declarativos: las páginas y los endpoints
 * consultan capacidades (`aplicaIgv`, `aplicaDjAnual`, …) en vez de repartir
 * comparaciones `if (regimen === 'X')` por todo el código.
 */
import type {
  IrMensualInput,
  IrMensualResult,
  RegimenCode,
  RegimenIgvCode,
  RegimenSpec,
} from '../types/tax'
import { round2 } from './tax'

// ─── TASAS DE IGV ──────────────────────────────────────

export interface PresetIgv {
  regimen: RegimenIgvCode
  value: number
  label: string
  hint: string
}

/**
 * La Ley 31556 (modificada por la Ley 32219) fija 8% de IGV + 2% de IPM = 10%
 * para MYPE de restaurantes, hoteles y alojamientos turísticos durante 2025 y
 * 2026; sube a 12% desde el 1 de enero de 2027. Por eso la tasa se guarda como
 * número por comprobante y el régimen como enum: el cambio de 2027 es un dato,
 * no un refactor.
 */
export const PRESETS_IGV: PresetIgv[] = [
  {
    regimen: 'GENERAL',
    value: 18,
    label: 'General (18%)',
    hint: 'IGV 16% + IPM 2%. Casillas 100/101 en ventas y 107/108 en compras.',
  },
  {
    regimen: 'LEY_31556',
    value: 10,
    label: 'Restaurantes y hoteles (10%)',
    hint: 'Ley 31556 — IGV 8% + IPM 2%. Casillas 154/155 en ventas y 156/157 en compras.',
  },
  {
    regimen: 'EXONERADO',
    value: 0,
    label: 'Exonerado / Inafecto (0%)',
    hint: 'No genera débito ni crédito fiscal.',
  },
]

export const NOMBRES_REGIMEN_IGV: Record<string, string> = {
  GENERAL: 'General 18%',
  LEY_31556: 'Ley 31556 — 10%',
  EXONERADO: 'Exonerado',
  INAFECTO: 'Inafecto',
}

/** Preset cuyo valor coincide con la tasa, o `null` si es una tasa personalizada. */
export function presetPorTasa(igvPercent: number): PresetIgv | null {
  return PRESETS_IGV.find(p => p.value === Number(igvPercent)) ?? null
}

// ─── REGÍMENES TRIBUTARIOS ─────────────────────────────

export const REGIMENES: Record<RegimenCode, RegimenSpec> = {
  NRUS: {
    code: 'NRUS',
    label: 'Nuevo RUS',
    descripcion: 'Cuota fija mensual según categoría. No grava con IGV, no da crédito fiscal y no presenta declaración jurada anual de renta.',
    aplicaIgv: false,
    aplicaCreditoFiscal: false,
    aplicaDjAnual: false,
    aplicaTramosIr: false,
    aplicaIrAnualPlano: false,
    irMensualDefinitivo: true,
    usaCoeficiente: false,
    formularioMensual: 'F. 1611',
    formularioAnual: null,
    limiteIngresosUit: null,
  },
  RER: {
    code: 'RER',
    label: 'Régimen Especial (RER)',
    descripcion: 'Renta mensual del 1,5% de los ingresos netos, con carácter definitivo. Grava con IGV y da crédito fiscal, pero no presenta declaración jurada anual de renta.',
    aplicaIgv: true,
    aplicaCreditoFiscal: true,
    aplicaDjAnual: false,
    aplicaTramosIr: false,
    aplicaIrAnualPlano: false,
    irMensualDefinitivo: true,
    usaCoeficiente: false,
    formularioMensual: 'PDT 621',
    formularioAnual: null,
    limiteIngresosUit: null,
  },
  RMT: {
    code: 'RMT',
    label: 'MYPE Tributario (RMT)',
    descripcion: 'Pago a cuenta del 1% hasta 300 UIT de ingresos netos anuales; por encima, el mayor entre coeficiente y 1,5%. Renta anual por tramos: 10% hasta 15 UIT de renta neta y 29,5% sobre el exceso.',
    aplicaIgv: true,
    aplicaCreditoFiscal: true,
    aplicaDjAnual: true,
    aplicaTramosIr: true,
    aplicaIrAnualPlano: false,
    irMensualDefinitivo: false,
    usaCoeficiente: true,
    formularioMensual: 'PDT 621',
    formularioAnual: 'FV 710',
    limiteIngresosUit: 1700,
  },
  RG: {
    code: 'RG',
    label: 'Régimen General',
    descripcion: 'Pago a cuenta igual al mayor entre el coeficiente del ejercicio anterior y el 1,5%. Renta anual con tasa plana del 29,5% sobre la renta neta imponible.',
    aplicaIgv: true,
    aplicaCreditoFiscal: true,
    aplicaDjAnual: true,
    aplicaTramosIr: false,
    aplicaIrAnualPlano: true,
    irMensualDefinitivo: false,
    usaCoeficiente: true,
    formularioMensual: 'PDT 621',
    formularioAnual: 'FV 710',
    limiteIngresosUit: null,
  },
}

export const REGIMENES_LISTA: RegimenSpec[] = [
  REGIMENES.NRUS,
  REGIMENES.RER,
  REGIMENES.RMT,
  REGIMENES.RG,
]

/** Spec del régimen; cae a RMT, que es el régimen por defecto del sistema. */
export function getRegimenSpec(code?: string | null): RegimenSpec {
  return REGIMENES[(code as RegimenCode) ?? 'RMT'] ?? REGIMENES.RMT
}

// ─── PAGO MENSUAL DE RENTA ─────────────────────────────

function tasaTexto(valor: number): string {
  return String(Math.round(valor * 10000) / 10000).replace('.', ',')
}

function solesTexto(valor: number): string {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(Math.round(valor))
}

/**
 * Pago mensual de renta según el régimen. Función pura: el coeficiente y los
 * ingresos acumulados los resuelve el servidor y se inyectan como dato.
 */
export function calcularIrMensual(input: IrMensualInput): IrMensualResult {
  const {
    regimen,
    baseVentas,
    totalVentasMes,
    totalComprasMes,
    ingresosNetosAcumAnio,
    uit,
    params,
    coeficiente,
  } = input
  const alertas: string[] = []

  if (regimen === 'NRUS') {
    const categoria = params.nrusCategoria === 2 ? 2 : 1
    const cuota = categoria === 2 ? params.nrusCuotaCat2 : params.nrusCuotaCat1
    const limite = categoria === 2 ? params.nrusLimiteCat2 : params.nrusLimiteCat1
    const mayorMovimiento = Math.max(totalVentasMes, totalComprasMes)

    if (limite > 0 && mayorMovimiento > limite) {
      alertas.push(
        'Los movimientos del mes (S/ ' + solesTexto(mayorMovimiento) + ') superan el límite de S/ ' +
        solesTexto(limite) + ' de la categoría ' + categoria + ' del NRUS.'
      )
    }

    return {
      monto: round2(cuota),
      concepto: 'Cuota NRUS categoría ' + categoria,
      tasaAplicada: 0,
      definitivo: true,
      alertas,
    }
  }

  if (regimen === 'RER') {
    return {
      monto: round2(baseVentas * params.rerRate / 100),
      concepto: 'Renta ' + tasaTexto(params.rerRate) + '% (definitiva)',
      tasaAplicada: params.rerRate,
      definitivo: true,
      alertas,
    }
  }

  const minRate = params.pagoCuentaMinRate
  const coeficienteRate = coeficiente != null ? coeficiente * 100 : null

  if (regimen === 'RMT') {
    const umbralSoles = params.rmtUmbralUit * uit
    const limiteSoles = params.rmtLimiteRegimenUit * uit

    if (limiteSoles > 0 && ingresosNetosAcumAnio > limiteSoles) {
      alertas.push(
        'Los ingresos netos acumulados superan las ' + params.rmtLimiteRegimenUit +
        ' UIT (S/ ' + solesTexto(limiteSoles) + '): corresponde pasar al Régimen General.'
      )
    }

    if (ingresosNetosAcumAnio <= umbralSoles) {
      return {
        monto: round2(baseVentas * params.irMonthlyPercent / 100),
        concepto: 'Pago a cuenta ' + tasaTexto(params.irMonthlyPercent) + '%',
        tasaAplicada: params.irMonthlyPercent,
        definitivo: false,
        alertas,
      }
    }

    alertas.push(
      'Los ingresos netos acumulados superan las ' + params.rmtUmbralUit + ' UIT (S/ ' +
      solesTexto(umbralSoles) + '): el pago a cuenta pasa al mayor entre coeficiente y ' +
      tasaTexto(minRate) + '%.'
    )
  }

  // RG siempre, y RMT por encima del umbral: el mayor entre coeficiente y el mínimo.
  const tasa = coeficienteRate != null ? Math.max(coeficienteRate, minRate) : minRate
  const usoCoeficiente = coeficienteRate != null && coeficienteRate >= minRate

  if (coeficienteRate == null) {
    alertas.push(
      'Sin datos del ejercicio anterior para calcular el coeficiente: se aplica el mínimo de ' +
      tasaTexto(minRate) + '%.'
    )
  }

  return {
    monto: round2(baseVentas * tasa / 100),
    concepto: usoCoeficiente
      ? 'Pago a cuenta por coeficiente ' + tasaTexto(coeficiente as number)
      : 'Pago a cuenta ' + tasaTexto(minRate) + '% (mínimo)',
    tasaAplicada: round2(tasa),
    definitivo: false,
    alertas,
  }
}
