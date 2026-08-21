/**
 * Adaptador del motor tributario compartido para las páginas.
 *
 * La lógica vive en `shared/utils/` (auto-importada en cliente y servidor);
 * este composable solo la reexpone bajo las claves que ya usan las páginas.
 * La verdad del dato siempre es el servidor.
 */
export function useTaxCalculations() {
  return {
    calcularBaseEIGV,
    round2,
    redondeoSunat,
    formatMoney,
    formatMoneyInt,
    getSubcategoriasPorDestino,
    NOMBRES_DESTINO,
    NOMBRES_SUBCATEGORIA,
    NOMBRES_COMPROBANTE,
    NOMBRES_MEDIO_PAGO,
    NOMBRES_ESTADO_PAGO,
    MESES,
  }
}
