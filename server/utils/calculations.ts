/**
 * Helpers de cálculo tributario centralizados.
 * Toda la lógica tributaria del sistema pasa por aquí.
 * Régimen MYPE Tributario (RMT) - Perú
 */

// ─── CÁLCULO BASE E IGV ────────────────────────────────

export interface BaseIgvResult {
  baseImponible: number
  igv: number
}

/**
 * Calcula base imponible e IGV a partir del importe total.
 * Si afectoIgv = true: base = total / (1 + igvPercent/100), igv = total - base
 * Si afectoIgv = false: base = total, igv = 0
 */
export function calcularBaseEIGV(
  total: number,
  afectoIgv: boolean,
  igvPercent: number = 18
): BaseIgvResult {
  if (!afectoIgv || total === 0) {
    return { baseImponible: round2(total), igv: 0 }
  }
  const factor = 1 + igvPercent / 100
  const baseImponible = round2(total / factor)
  const igv = round2(total - baseImponible)
  return { baseImponible, igv }
}

// ─── CLASIFICACIÓN DE OPERACIÓN ─────────────────────────

export interface ClasificacionSugerida {
  subcategorias: string[]
  deducibleIr: boolean
  creditoFiscalIgv: boolean
}

const SUBCATEGORIAS_POR_DESTINO: Record<string, string[]> = {
  VENTA: ['SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'LICENCIA', 'OTRO'],
  COSTO_VENTAS: ['PRODUCTO', 'FLETE', 'OTRO'],
  GASTO_ADMIN: ['SERVIDOR', 'HOSTING', 'INTERNET', 'MOVILIDAD', 'FLETE', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO'],
  GASTO_VENTA: ['MOVILIDAD', 'FLETE', 'OTRO'],
  ACTIVO_FIJO: ['SERVIDOR', 'EQUIPO_PRUEBAS', 'CAMARAS', 'OTRO'],
  NO_DEDUCIBLE: ['SAAS', 'FACTURACION_ELECTRONICA', 'HOSTING', 'SOFTWARE', 'CAMARAS', 'PRODUCTO', 'FLETE', 'MOVILIDAD', 'SERVIDOR', 'INTERNET', 'UTILES', 'EQUIPO_PRUEBAS', 'LICENCIA', 'DOMINIO', 'OTRO'],
}

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

export function getSubcategoriasPorDestino(destino: string): string[] {
  return SUBCATEGORIAS_POR_DESTINO[destino] || ['OTRO']
}

// ─── RESUMEN MENSUAL ───────────────────────────────────

export interface ResumenMensual {
  year: number
  month: number
  baseVentas: number
  igvVentas: number
  totalVentas: number
  baseComprasCreditoFiscal: number
  igvComprasCreditoFiscal: number
  costoVentas: number
  gastoAdministracion: number
  gastoVentas: number
  activoFijo: number
  comprasNoDeducibles: number
  igvNetoMes: number
  saldoIgvMesAnterior: number
  saldoIgvMes: number
  pagoIrSugerido: number
  pagoTotalSugerido: number
}

/**
 * Calcula el resumen mensual a partir de una lista de vouchers.
 * Todos los montos son base imponible (sin IGV), excepto totalVentas e igv*.
 */
export function resumirMes(
  vouchers: any[],
  year: number,
  month: number,
  saldoIgvMesAnterior: number = 0,
  irMonthlyPercent: number = 1
): ResumenMensual {
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

  for (const v of vouchers) {
    const base = Number(v.baseImponible)
    const igv = Number(v.igv)
    const total = Number(v.importeTotal)

    if (v.tipoMovimiento === 'VENTA') {
      baseVentas += base
      igvVentas += igv
      totalVentas += total
    } else {
      // COMPRA
      if (v.creditoFiscalIgv) {
        baseComprasCreditoFiscal += base
        igvComprasCreditoFiscal += igv
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

  const igvNetoCalculado = igvVentas - igvComprasCreditoFiscal
  const { igvNetoMes, saldoIgvMes } = calcularIGVNetoMes(
    igvVentas,
    igvComprasCreditoFiscal,
    saldoIgvMesAnterior
  )

  const pagoIrSugerido = calcularIRMensualSugerido(baseVentas, irMonthlyPercent)
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
    costoVentas: round2(costoVentas),
    gastoAdministracion: round2(gastoAdministracion),
    gastoVentas: round2(gastoVentas),
    activoFijo: round2(activoFijo),
    comprasNoDeducibles: round2(comprasNoDeducibles),
    igvNetoMes: round2(igvNetoMes),
    saldoIgvMesAnterior: round2(saldoIgvMesAnterior),
    saldoIgvMes: round2(saldoIgvMes),
    pagoIrSugerido: round2(pagoIrSugerido),
    pagoTotalSugerido: round2(pagoTotalSugerido),
  }
}

// ─── IGV NETO DEL MES ──────────────────────────────────

export interface IGVNetoResult {
  igvNetoMes: number
  saldoIgvMes: number
}

/**
 * Calcula el IGV neto del mes considerando saldo anterior (crédito fiscal).
 * Si hay saldo a favor anterior, se descuenta del IGV neto.
 * Si el resultado es negativo, se arrastra como saldo a favor (meses sin ventas siguen arrastrando el crédito).
 * La deuda por IGV no pagado se acumula aparte en la API (desde 2026), ver `monthlyIgvDebt.ts`.
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
 * Pago a cuenta IR sugerido = baseVentas * irPercent / 100
 * Referencia práctica para RMT. Configurable.
 */
export function calcularIRMensualSugerido(
  baseVentas: number,
  irPercent: number = 1
): number {
  return round2(baseVentas * irPercent / 100)
}

// ─── CIERRE ANUAL ──────────────────────────────────────

export interface CierreAnualResult {
  ventasNetas: number
  costoVentas: number
  gastosVentas: number
  gastosAdministracion: number
  utilidadBruta: number
  utilidadOperativa: number
  utilidadContable: number
  rentaNetaImponible: number
  impuestoAnual: number
  pagosCuentaAcumulados: number
  saldoPorPagar: number
  saldoAFavor: number
}

/**
 * Calcula el cierre anual para la renta empresarial.
 * IR RMT: 10% hasta 15 UIT, 29.5% sobre el excedente.
 */
export function calcularCierreAnual(
  ventasNetas: number,
  costoVentas: number,
  gastosVentas: number,
  gastosAdministracion: number,
  otrosIngresos: number = 0,
  otrosGastos: number = 0,
  adiciones: number = 0,
  deducciones: number = 0,
  pagosCuentaAcumulados: number = 0,
  retenciones: number = 0,
  saldoFavorAnterior: number = 0,
  uit: number = 5150,
  tramo1Limit: number = 15,
  tramo1Rate: number = 10,
  tramo2Rate: number = 29.5
): CierreAnualResult {
  const utilidadBruta = ventasNetas - costoVentas
  const utilidadOperativa = utilidadBruta - gastosVentas - gastosAdministracion
  const utilidadContable = utilidadOperativa + otrosIngresos - otrosGastos

  // Renta neta imponible = utilidad contable + adiciones - deducciones
  let rentaNetaImponible = utilidadContable + adiciones - deducciones
  if (rentaNetaImponible < 0) rentaNetaImponible = 0

  // Cálculo IR anual RMT por tramos
  const limiteTramo1 = tramo1Limit * uit
  let impuestoAnual = 0

  if (rentaNetaImponible <= limiteTramo1) {
    impuestoAnual = rentaNetaImponible * tramo1Rate / 100
  } else {
    impuestoAnual = (limiteTramo1 * tramo1Rate / 100) +
      ((rentaNetaImponible - limiteTramo1) * tramo2Rate / 100)
  }
  impuestoAnual = round2(impuestoAnual)

  // Saldo
  const totalCreditos = pagosCuentaAcumulados + retenciones + saldoFavorAnterior
  const diferencia = impuestoAnual - totalCreditos

  return {
    ventasNetas: round2(ventasNetas),
    costoVentas: round2(costoVentas),
    gastosVentas: round2(gastosVentas),
    gastosAdministracion: round2(gastosAdministracion),
    utilidadBruta: round2(utilidadBruta),
    utilidadOperativa: round2(utilidadOperativa),
    utilidadContable: round2(utilidadContable),
    rentaNetaImponible: round2(rentaNetaImponible),
    impuestoAnual,
    pagosCuentaAcumulados: round2(pagosCuentaAcumulados),
    saldoPorPagar: diferencia > 0 ? round2(diferencia) : 0,
    saldoAFavor: diferencia < 0 ? round2(Math.abs(diferencia)) : 0,
  }
}

// ─── REDONDEO SUNAT ────────────────────────────────────

/**
 * Redondeo referencial tipo SUNAT: sin decimales.
 */
export function redondeoSunat(valor: number): number {
  return Math.round(valor)
}

// ─── UTILIDADES ────────────────────────────────────────

/**
 * Redondeo a 2 decimales.
 */
export function round2(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Nombres legibles para enums.
 */
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

/**
 * Nombre del mes en español.
 */
export function nombreMes(month: number): string {
  const meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return meses[month] || ''
}
