/**
 * Tipos del motor tributario, compartidos por `app/` y `server/`.
 *
 * Nuxt 4 auto-importa `shared/types/` y `shared/utils/` en ambos bundles.
 * Este directorio no puede importar nada de Vue ni de Nitro.
 */

// ─── BASE E IGV ────────────────────────────────────────

export interface BaseIgvResult {
  baseImponible: number
  igv: number
}

// ─── CLASIFICACIÓN DE OPERACIÓN ────────────────────────

export interface ClasificacionSugerida {
  subcategorias: string[]
  deducibleIr: boolean
  creditoFiscalIgv: boolean
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

  // Desglose por régimen de IGV. Cada par alimenta un juego de casillas
  // distinto del Formulario Virtual 0621, y por eso no se pueden sumar.
  baseVentasGravadas: number
  igvVentasGravadas: number
  baseVentasLey31556: number
  igvVentasLey31556: number
  baseVentasNoGravadas: number
  baseComprasGravadas: number
  igvComprasGravadas: number
  baseComprasLey31556: number
  igvComprasLey31556: number
  comprasNoGravadas: number
  totalComprasMes: number

  // Detracciones (SPOT). No van a ninguna casilla del 0621: la operación se
  // declara completa. Miden caja: cuánto se depositó en la cuenta del Banco de
  // la Nación (ventas) o cuánto hay que depositar (compras).
  detraccionVentas: number
  detraccionCompras: number
  netoCobradoVentas: number
  netoPagadoCompras: number

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
  /** Detalle del pago mensual de renta segun el regimen vigente. */
  irMensual?: IrMensualResult
}

export interface IGVNetoResult {
  igvNetoMes: number
  saldoIgvMes: number
}

// ─── CIERRE ANUAL ──────────────────────────────────────

export interface CierreAnualInput {
  regimen: RegimenCode
  /** NRUS y RER no presentan DJ anual: el impuesto anual sale 0. */
  aplicaTramosIr: boolean
  aplicaIrAnualPlano: boolean
  /** Ventas brutas: los descuentos se restan dentro (casillas 461 y 462). */
  ventasNetas: number
  descuentos?: number
  costoVentas: number
  gastosVentas: number
  gastosAdministracion: number
  /** Depreciacion del ejercicio, tomada de los activos fijos registrados. */
  depreciacion?: number
  otrosIngresos?: number
  otrosGastos?: number
  adiciones?: number
  deducciones?: number
  pagosCuentaAcumulados?: number
  retenciones?: number
  saldoFavorAnterior?: number
  uit: number
  tramo1Limit: number
  tramo1Rate: number
  tramo2Rate: number
  /** Tasa plana anual del Regimen General. */
  flatRate: number
}

export interface CierreAnualResult {
  regimen: RegimenCode
  aplicaDjAnual: boolean
  ventasNetas: number
  descuentos: number
  costoVentas: number
  gastosVentas: number
  gastosAdministracion: number
  depreciacion: number
  otrosIngresos: number
  otrosGastos: number
  utilidadBruta: number
  utilidadOperativa: number
  utilidadContable: number
  adiciones: number
  deducciones: number
  rentaNetaImponible: number
  limiteTramo1: number
  irTramo1: number
  irTramo2: number
  impuestoAnual: number
  pagosCuentaAcumulados: number
  retenciones: number
  saldoFavorAnterior: number
  saldoPorPagar: number
  saldoAFavor: number
}

// ─── RÉGIMEN DE IGV (por comprobante) ──────────────────

export type RegimenIgvCode = 'GENERAL' | 'LEY_31556' | 'EXONERADO' | 'INAFECTO'

// ─── RÉGIMEN TRIBUTARIO (por año) ──────────────────────

export type RegimenCode = 'NRUS' | 'RER' | 'RMT' | 'RG'

export interface RegimenSpec {
  code: RegimenCode
  label: string
  descripcion: string
  /** NRUS no grava con IGV: no hay débito ni crédito fiscal. */
  aplicaIgv: boolean
  aplicaCreditoFiscal: boolean
  /** NRUS y RER no presentan declaración jurada anual de renta empresarial. */
  aplicaDjAnual: boolean
  /** Solo RMT liquida el IR anual por tramos. */
  aplicaTramosIr: boolean
  /** Solo RG aplica una tasa anual plana. */
  aplicaIrAnualPlano: boolean
  /** En RER el pago mensual es definitivo, no un pago a cuenta. */
  irMensualDefinitivo: boolean
  /** RG siempre; RMT solo por encima del umbral de 300 UIT. */
  usaCoeficiente: boolean
  formularioMensual: string
  formularioAnual: string | null
  /** Tope de ingresos netos anuales del régimen, en UIT. */
  limiteIngresosUit: number | null
}

export interface IrMensualParams {
  irMonthlyPercent: number
  rerRate: number
  pagoCuentaMinRate: number
  rmtUmbralUit: number
  rmtLimiteRegimenUit: number
  nrusCategoria: number
  nrusCuotaCat1: number
  nrusCuotaCat2: number
  nrusLimiteCat1: number
  nrusLimiteCat2: number
}

export interface IrMensualInput {
  regimen: RegimenCode
  /** Base imponible de ventas del mes. */
  baseVentas: number
  /** Importe total de ventas del mes (test de categoría NRUS). */
  totalVentasMes: number
  /** Importe total de compras del mes (test de categoría NRUS). */
  totalComprasMes: number
  /** Ingresos netos acumulados del año hasta este mes inclusive. */
  ingresosNetosAcumAnio: number
  uit: number
  params: IrMensualParams
  /** Coeficiente del ejercicio anterior, ya resuelto por el servidor. */
  coeficiente: number | null
}

export interface IrMensualResult {
  monto: number
  concepto: string
  /** Tasa efectiva aplicada, en %. 0 para la cuota fija de NRUS. */
  tasaAplicada: number
  definitivo: boolean
  alertas: string[]
}

// ─── GUÍA DE CASILLAS DEL FORMULARIO 0621 ──────────────

export interface ValidacionCasilla {
  ok: boolean
  mensaje: string
  sugerencias?: string[]
}

export interface CasillaGuia {
  casilla: string
  label: string
  valor: number
  tab: 'IGV — Ventas' | 'IGV — Compras' | 'Renta' | 'Determinación'
  /** false cuando SUNAT la calcula sola y no debe tipearse. */
  editable: boolean
  nota?: string
  validacion?: ValidacionCasilla
}
