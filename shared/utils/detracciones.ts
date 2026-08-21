/**
 * Detracciones — SPOT (Sistema de Pago de Obligaciones Tributarias).
 *
 * En una operación sujeta a detracción el *comprador* no paga el 100% del
 * comprobante: deposita un porcentaje en la cuenta de detracciones del
 * proveedor en el Banco de la Nación y le paga solo el saldo. El proveedor
 * usa ese fondo únicamente para pagar sus tributos.
 *
 * Consecuencias que este módulo modela:
 *
 * - **No toca la base imponible ni el IGV.** La detracción es una forma de
 *   pago, no un tributo: las casillas 100/101 y 107/108 del 0621 se declaran
 *   por el importe completo. Por eso vive aparte del cálculo de `tax.ts`.
 * - **Sí cambia la caja.** El neto a cobrar (venta) o a pagar (compra) es el
 *   total menos la detracción.
 * - **Condiciona el crédito fiscal de las compras.** Sin constancia de
 *   depósito no se puede usar el crédito fiscal del comprobante hasta el
 *   periodo en que se acredite el depósito.
 *
 * Las tasas son **referenciales**: SUNAT las modifica por resolución de
 * superintendencia, así que el porcentaje se guarda por comprobante y el
 * catálogo solo sugiere el valor inicial.
 *
 * Auto-importado en `app/` y `server/` por la convención `shared/utils/`.
 */
import { round2, redondeoSunat } from './tax'

// ─── CATÁLOGO DE BIENES Y SERVICIOS SUJETOS AL SPOT ────

export interface CodigoDetraccion {
  /** Código del anexo de la R.S. 183-2004/SUNAT. */
  codigo: string
  label: string
  /** Tasa sugerida, en porcentaje. Editable por comprobante. */
  tasa: number
  /** 2 = bienes, 3 = servicios y contratos de construcción. */
  anexo: 2 | 3
}

/**
 * Importe a partir del cual la operación queda sujeta a detracción.
 * Referencial: algunos bienes del Anexo 2 no tienen mínimo.
 */
export const UMBRAL_DETRACCION = 700

/**
 * Los más usados por una MYPE. No pretende ser el anexo completo: quien
 * necesite un código que no está aquí escribe la tasa a mano.
 */
export const CODIGOS_DETRACCION: CodigoDetraccion[] = [
  // Anexo 3 — servicios
  { codigo: '012', label: 'Intermediación laboral y tercerización', tasa: 12, anexo: 3 },
  { codigo: '019', label: 'Arrendamiento de bienes', tasa: 10, anexo: 3 },
  { codigo: '020', label: 'Mantenimiento y reparación de bienes muebles', tasa: 12, anexo: 3 },
  { codigo: '021', label: 'Movimiento de carga', tasa: 10, anexo: 3 },
  { codigo: '022', label: 'Otros servicios empresariales', tasa: 12, anexo: 3 },
  { codigo: '024', label: 'Comisión mercantil', tasa: 10, anexo: 3 },
  { codigo: '025', label: 'Fabricación de bienes por encargo', tasa: 10, anexo: 3 },
  { codigo: '026', label: 'Servicio de transporte de personas', tasa: 10, anexo: 3 },
  { codigo: '027', label: 'Transporte de bienes por vía terrestre', tasa: 4, anexo: 3 },
  { codigo: '030', label: 'Contratos de construcción', tasa: 4, anexo: 3 },
  { codigo: '037', label: 'Demás servicios gravados con el IGV', tasa: 12, anexo: 3 },
  // Anexo 2 — bienes
  { codigo: '004', label: 'Recursos hidrobiológicos', tasa: 4, anexo: 2 },
  { codigo: '005', label: 'Maíz amarillo duro', tasa: 4, anexo: 2 },
  { codigo: '008', label: 'Madera', tasa: 4, anexo: 2 },
  { codigo: '009', label: 'Arena y piedra', tasa: 10, anexo: 2 },
  { codigo: '010', label: 'Residuos, subproductos, desechos y desperdicios', tasa: 15, anexo: 2 },
  { codigo: '013', label: 'Bienes gravados con IGV por renuncia a la exoneración', tasa: 10, anexo: 2 },
  { codigo: '014', label: 'Carnes y despojos comestibles', tasa: 4, anexo: 2 },
  { codigo: '023', label: 'Leche', tasa: 4, anexo: 2 },
  { codigo: '031', label: 'Oro gravado con el IGV', tasa: 10, anexo: 2 },
  { codigo: '034', label: 'Minerales metálicos no auríferos', tasa: 10, anexo: 2 },
  { codigo: '039', label: 'Minerales no metálicos', tasa: 10, anexo: 2 },
]

/** Código por defecto cuando SUNAT solo informa «operación sujeta a detracción». */
export const CODIGO_DETRACCION_GENERICO = '037'

export function getCodigoDetraccion(codigo?: string | null): CodigoDetraccion | null {
  if (!codigo) return null
  const normalizado = String(codigo).trim().padStart(3, '0')
  return CODIGOS_DETRACCION.find(c => c.codigo === normalizado) ?? null
}

/** Tasa sugerida del código, o `null` si el código no está en el catálogo. */
export function tasaDetraccionSugerida(codigo?: string | null): number | null {
  return getCodigoDetraccion(codigo)?.tasa ?? null
}

export function nombreCodigoDetraccion(codigo?: string | null): string {
  const item = getCodigoDetraccion(codigo)
  return item ? `${item.codigo} — ${item.label}` : (codigo ? String(codigo) : '—')
}

// ─── CÁLCULO ───────────────────────────────────────────

export interface DetraccionResult {
  /** Importe exacto de la detracción, con el mismo signo que el total. */
  monto: number
  /**
   * Importe a depositar en el Banco de la Nación. El depósito se hace en
   * soles enteros, así que puede diferir del exacto en algunos céntimos.
   */
  deposito: number
  /** Lo que realmente se cobra (venta) o se paga (compra) al proveedor. */
  neto: number
}

/**
 * Detracción de un comprobante.
 *
 * El signo sigue al del importe total para que una nota de crédito que anula
 * una operación con detracción reste también su detracción.
 */
export function calcularDetraccion(importeTotal: number, porcentaje: number): DetraccionResult {
  const total = Number(importeTotal) || 0
  const tasa = Number(porcentaje) || 0

  if (!total || tasa <= 0) {
    return { monto: 0, deposito: 0, neto: round2(total) }
  }

  const monto = round2(total * tasa / 100)
  return {
    monto,
    deposito: redondeoSunat(monto),
    neto: round2(total - monto),
  }
}

/** Neto a cobrar o pagar de un comprobante ya guardado. */
export function netoDeDetraccion(voucher: any): number {
  const total = Number(voucher?.importeTotal ?? 0)
  if (!voucher?.detraccion) return round2(total)
  return round2(total - Number(voucher.detraccionMonto ?? 0))
}

/**
 * ¿El importe llega al mínimo que obliga a detraer?
 *
 * Solo orienta: los bienes del Anexo 2 pueden no tener mínimo, y el umbral se
 * mide sobre el importe de la operación, no sobre la base imponible.
 */
export function superaUmbralDetraccion(importeTotal: number): boolean {
  return Math.abs(Number(importeTotal) || 0) > UMBRAL_DETRACCION
}

// ─── TIPO DE OPERACIÓN DEL REGISTRO DE VENTAS SUNAT ────

/**
 * Códigos del catálogo 51 de SUNAT que marcan una venta sujeta a detracción,
 * con el código del anexo que les corresponde.
 *
 * Es lo único que trae el archivo de propuesta del registro de ventas: avisa
 * de que hay detracción, pero no de cuánto, así que la tasa entra como
 * sugerencia del catálogo y queda a confirmar contra la constancia.
 */
export const TIPOS_OPERACION_DETRACCION: Record<string, string> = {
  '1001': CODIGO_DETRACCION_GENERICO,
  '1002': '004', // recursos hidrobiológicos
  '1003': '026', // transporte de personas
  '1004': '027', // transporte de carga
  '0200': CODIGO_DETRACCION_GENERICO,
  '0201': '004',
  '0202': '026',
  '0203': '027',
}

/**
 * Código de detracción que sugiere un «Tipo Operación» del registro de ventas,
 * o `null` si ese tipo no corresponde a una operación detraída.
 */
export function detraccionPorTipoOperacion(tipoOperacion: unknown): string | null {
  const codigo = String(tipoOperacion ?? '').trim()
  if (!codigo) return null
  // El export a veces recorta el cero de la izquierda ("101" por "0101").
  const normalizado = codigo.length < 4 ? codigo.padStart(4, '0') : codigo
  return TIPOS_OPERACION_DETRACCION[normalizado] ?? null
}
