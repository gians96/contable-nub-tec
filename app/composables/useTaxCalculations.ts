/**
 * Cálculos tributarios en el frontend (preview en tiempo real en formularios).
 * La verdad del dato siempre es el servidor.
 */
export function useTaxCalculations() {
  /**
   * Calcula base imponible e IGV desde el importe total.
   */
  function calcularBaseEIGV(total: number, afectoIgv: boolean, igvPercent: number = 18) {
    if (!afectoIgv || total === 0) {
      return { baseImponible: round2(total), igv: 0 }
    }
    const factor = 1 + igvPercent / 100
    const baseImponible = round2(total / factor)
    const igv = round2(total - baseImponible)
    return { baseImponible, igv }
  }

  function round2(valor: number): number {
    return Math.round(valor * 100) / 100
  }

  function redondeoSunat(valor: number): number {
    return Math.round(valor)
  }

  function formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  }

  function formatMoneyInt(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(valor))
  }

  /**
   * Subcategorías sugeridas según destino tributario.
   */
  function getSubcategoriasPorDestino(destino: string): string[] {
    const map: Record<string, string[]> = {
      VENTA: ['SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'LICENCIA', 'OTRO'],
      COSTO_VENTAS: ['PRODUCTO', 'FLETE', 'OTRO'],
      GASTO_ADMIN: ['SERVIDOR', 'HOSTING', 'INTERNET', 'MOVILIDAD', 'FLETE', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO'],
      GASTO_VENTA: ['MOVILIDAD', 'FLETE', 'OTRO'],
      ACTIVO_FIJO: ['SERVIDOR', 'EQUIPO_PRUEBAS', 'CAMARAS', 'OTRO'],
      NO_DEDUCIBLE: ['OTRO'],
    }
    return map[destino] || ['OTRO']
  }

  const NOMBRES_DESTINO: Record<string, string> = {
    VENTA: 'Venta',
    COSTO_VENTAS: 'Costo de Ventas',
    GASTO_ADMIN: 'Gasto Administrativo',
    GASTO_VENTA: 'Gasto de Venta',
    ACTIVO_FIJO: 'Activo Fijo',
    NO_DEDUCIBLE: 'No Deducible',
  }

  const NOMBRES_SUBCATEGORIA: Record<string, string> = {
    SAAS: 'SaaS',
    FACTURACION_ELECTRONICA: 'Facturación Electrónica',
    HOSTING: 'Hosting',
    SOFTWARE: 'Software',
    CAMARAS: 'Cámaras',
    PRODUCTO: 'Producto',
    FLETE: 'Flete',
    MOVILIDAD: 'Movilidad',
    SERVIDOR: 'Servidor',
    INTERNET: 'Internet',
    UTILES: 'Útiles',
    EQUIPO_PRUEBAS: 'Equipo de Pruebas',
    LICENCIA: 'Licencia',
    DOMINIO: 'Dominio',
    OTRO: 'Otro',
  }

  const NOMBRES_COMPROBANTE: Record<string, string> = {
    FACTURA: 'Factura',
    BOLETA: 'Boleta',
    NOTA_CREDITO: 'Nota de Crédito',
    NOTA_DEBITO: 'Nota de Débito',
    RECIBO_HONORARIOS: 'Recibo por Honorarios',
    TICKET: 'Ticket',
    OTRO: 'Otro',
  }

  const NOMBRES_MEDIO_PAGO: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
    TARJETA: 'Tarjeta',
    DEPOSITO: 'Depósito',
    CHEQUE: 'Cheque',
    OTRO: 'Otro',
  }

  const NOMBRES_ESTADO_PAGO: Record<string, string> = {
    PAGADO: 'Pagado',
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Parcial',
  }

  const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

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
