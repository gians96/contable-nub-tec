/**
 * Etiquetas legibles de los enums de Prisma y reglas de clasificación.
 * Fuente única para `app/` y `server/`.
 */

// ─── SUBCATEGORÍAS POR DESTINO ─────────────────────────

export const SUBCATEGORIAS_POR_DESTINO: Record<string, string[]> = {
  VENTA: ['SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'LICENCIA', 'OTRO'],
  COSTO_VENTAS: ['PRODUCTO', 'FLETE', 'OTRO'],
  GASTO_ADMIN: ['SERVIDOR', 'HOSTING', 'INTERNET', 'MOVILIDAD', 'FLETE', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO'],
  GASTO_VENTA: ['MOVILIDAD', 'FLETE', 'OTRO'],
  ACTIVO_FIJO: ['SERVIDOR', 'EQUIPO_PRUEBAS', 'CAMARAS', 'OTRO'],
  NO_DEDUCIBLE: ['SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'FLETE', 'MOVILIDAD', 'SERVIDOR', 'INTERNET', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO'],
}

export function getSubcategoriasPorDestino(destino: string): string[] {
  return SUBCATEGORIAS_POR_DESTINO[destino] || ['OTRO']
}

// ─── NOMBRES DE ENUMS ──────────────────────────────────

export const NOMBRES_DESTINO: Record<string, string> = {
  VENTA: 'Venta',
  COSTO_VENTAS: 'Costo de Ventas',
  GASTO_ADMIN: 'Gasto Administrativo',
  GASTO_VENTA: 'Gasto de Venta',
  ACTIVO_FIJO: 'Activo Fijo',
  NO_DEDUCIBLE: 'No Deducible',
}

export const NOMBRES_SUBCATEGORIA: Record<string, string> = {
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

export const NOMBRES_COMPROBANTE: Record<string, string> = {
  FACTURA: 'Factura',
  BOLETA: 'Boleta',
  NOTA_CREDITO: 'Nota de Crédito',
  NOTA_DEBITO: 'Nota de Débito',
  RECIBO_HONORARIOS: 'Recibo por Honorarios',
  TICKET: 'Ticket',
  OTRO: 'Otro',
}

export const NOMBRES_MEDIO_PAGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  DEPOSITO: 'Depósito',
  CHEQUE: 'Cheque',
  OTRO: 'Otro',
}

export const NOMBRES_ESTADO_PAGO: Record<string, string> = {
  PAGADO: 'Pagado',
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Parcial',
}

// ─── MESES ─────────────────────────────────────────────

export const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Nombre del mes en español.
 */
export function nombreMes(month: number): string {
  return MESES[month] || ''
}
