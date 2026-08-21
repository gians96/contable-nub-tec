/**
 * Formateo de importes en soles. Compartido por `app/` y `server/`.
 */

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
