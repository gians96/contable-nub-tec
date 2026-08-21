/**
 * Formateo de importes y fechas. Compartido por `app/` y `server/`.
 */

/**
 * Fecha de un comprobante en dd/mm/aaaa.
 *
 * **En UTC a propósito.** Las fechas se guardan a medianoche UTC (la aplicación
 * y los importadores construyen `Date` desde un `aaaa-mm-dd` sin hora), así que
 * formatearlas en la zona local resta un día en todo el continente americano:
 * una factura del 1 de julio se veía como 30 de junio, y podía parecer que
 * estaba en el periodo anterior. Es la misma fecha que usa el formulario de
 * edición, que lee el `aaaa-mm-dd` del ISO tal cual.
 */
export function formatDate(fecha: string | Date): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Importe con 2 decimales, separadores es-PE. No incluye el símbolo.
 */
export function formatMoney(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

/**
 * Importe en soles enteros, como los pide SUNAT en sus formularios.
 */
export function formatMoneyInt(valor: number): string {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(valor))
}
