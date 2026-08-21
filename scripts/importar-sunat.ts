/**
 * Importa los archivos de propuesta del Registro de Ventas y Compras de SUNAT
 * (SIRE) a los comprobantes de una empresa.
 *
 * Uso:
 *   bun scripts/importar-sunat.ts --ruc 10765096133 archivo1.xlsx archivo2.xlsx
 *   bun scripts/importar-sunat.ts --ruc 10765096133 archivo.xlsx --apply
 *
 * Sin `--apply` no escribe nada: imprime lo que haría. **Ejecuta siempre el
 * ensayo primero**, porque `DATABASE_URL` apunta a la contabilidad real.
 *
 * Por qué un script y no el importador de `/importar-exportar`: ese espera el
 * formato que exporta la propia aplicación. Los archivos de SUNAT traen otro
 * juego de columnas, notas de crédito en negativo, comprobantes dados de baja y
 * —en algunos exports— los datos desplazados una columna respecto de la
 * cabecera. Todo eso se resuelve aquí y no ensuciando el importador general.
 *
 * Decisiones que conviene conocer antes de leer el código:
 *
 * - **El importe total se reconstruye como base + IGV**, no se copia de
 *   «Total CP». SUNAT incluye ahí el ICBPER (la bolsa plástica), que esta
 *   aplicación no modela; copiarlo descuadraría base + IGV = total, que es la
 *   invariante que sostiene el resumen mensual y el 0621. La diferencia queda
 *   anotada en la observación del comprobante.
 * - **`modoManual = true`.** La base y el IGV son los que SUNAT ya tiene
 *   declarados; recalcularlos desde el total mueve céntimos (una factura de
 *   este lote se desvía en S/ 0,01).
 * - **Los comprobantes dados de baja se omiten**: importe 0 y sin efecto.
 */
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from '../server/utils/mariaAdapterOptions'
import { round2 } from '../shared/utils/tax'
import {
  calcularDetraccion,
  detraccionPorTipoOperacion,
  tasaDetraccionSugerida,
  nombreCodigoDetraccion,
} from '../shared/utils/detracciones'

// ─── ARGUMENTOS ────────────────────────────────────────

const args = process.argv.slice(2)
const apply = args.includes('--apply')
/**
 * Vuelve a escribir importes y detracción sobre los comprobantes que ya
 * existan, en vez de saltárselos. Para re-sincronizar cuando SUNAT corrige la
 * propuesta. No toca la clasificación tributaria, que se ajusta a mano.
 */
const actualizar = args.includes('--actualizar')
const rucIdx = args.indexOf('--ruc')
const ruc = rucIdx >= 0 ? args[rucIdx + 1] : undefined
const archivos = args.filter((a, i) =>
  !a.startsWith('--') && i !== rucIdx + 1
)

if (!ruc || archivos.length === 0) {
  console.error('Uso: bun scripts/importar-sunat.ts --ruc <RUC> <archivo.xlsx> [...] [--apply]')
  process.exit(1)
}

// ─── CLASIFICACIÓN POR PROVEEDOR ───────────────────────

/**
 * Destino tributario y subcategoría por RUC de proveedor.
 *
 * SUNAT no dice para qué se compró: solo quien lleva el negocio lo sabe. Esta
 * tabla evita que todo caiga en «Gasto administrativo» y deje el costo de
 * ventas en cero. Lo que no esté aquí usa `CLASIFICACION_POR_DEFECTO`.
 */
const CLASIFICACION_COMPRAS: Record<string, { destino: string; subcategoria: string }> = {
  '20610599991': { destino: 'COSTO_VENTAS', subcategoria: 'PRODUCTO' },   // FARMASI S.A.C.
  '10258342874': { destino: 'COSTO_VENTAS', subcategoria: 'PRODUCTO' },   // CHIPANA CARRASCO WILMAN
  '20512528458': { destino: 'GASTO_ADMIN', subcategoria: 'FLETE' },       // SHALOM EMPRESARIAL (courier)
  '20602868495': { destino: 'GASTO_ADMIN', subcategoria: 'LICENCIA' },    // DIGITALZ PERU (facturación electrónica)
  '20605555153': { destino: 'GASTO_ADMIN', subcategoria: 'LICENCIA' },    // NUBE TECNOLOGICA (SaaS)
  '20611842920': { destino: 'GASTO_ADMIN', subcategoria: 'EQUIPO_PRUEBAS' }, // KREAR3D.COM
}

const CLASIFICACION_POR_DEFECTO = { destino: 'GASTO_ADMIN', subcategoria: 'OTRO' }

// ─── PARÁMETROS TRIBUTARIOS ────────────────────────────

/** Régimen con el que se dan de alta los años que aún no tengan parámetros. */
const REGIMEN = 'RMT' as const

/** UIT por año (D.S. del MEF). Se amplía cuando el MEF publique la siguiente. */
const UIT_POR_ANIO: Record<number, number> = {
  2024: 5150,
  2025: 5350,
  2026: 5350,
}

// ─── CATÁLOGOS SUNAT ───────────────────────────────────

/** Catálogo 01 de SUNAT → enum `TipoComprobante`. */
const TIPO_COMPROBANTE: Record<string, string> = {
  '01': 'FACTURA',
  '02': 'RECIBO_HONORARIOS',
  '03': 'BOLETA',
  '07': 'NOTA_CREDITO',
  '08': 'NOTA_DEBITO',
  '12': 'TICKET',
}

/** Catálogo 06 de SUNAT → enum `TipoDocumento`. */
const TIPO_DOCUMENTO: Record<string, string> = {
  '1': 'DNI',
  '4': 'CE',
  '6': 'RUC',
}

// ─── UTILIDADES ────────────────────────────────────────

/** Normaliza un encabezado para poder comparar «Razón Social» con «Razon Social». */
function norm(valor: unknown): string {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function nreal(valor: unknown): number {
  if (valor == null || valor === '') return 0
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

/** Serial de Excel (o Date) → fecha UTC a medianoche, como guarda la aplicación. */
function aFecha(valor: unknown): Date | null {
  if (valor instanceof Date) {
    return new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()))
  }
  const serial = Number(valor)
  if (!Number.isFinite(serial) || serial <= 0) return null
  const d = XLSX.SSF.parse_date_code(serial)
  if (!d) return null
  return new Date(Date.UTC(d.y, d.m - 1, d.d))
}

/** El correlativo se guarda como lo imprime el comprobante: F001-00000003. */
function correlativo(valor: unknown): string | null {
  const texto = String(valor ?? '').trim()
  if (!texto) return null
  return /^\d+$/.test(texto) ? texto.padStart(8, '0') : texto
}

/** El export de SUNAT antepone «DE: » a algunos nombres. */
function limpiarRazonSocial(valor: unknown): string {
  return String(valor ?? '').trim().replace(/^DE:\s*/i, '').trim()
}

/** Tasas de ley a las que se pega el porcentaje deducido. */
const TASAS_DE_LEY = [
  { tasa: 18, regimen: 'GENERAL' },
  { tasa: 10, regimen: 'LEY_31556' },
]

/**
 * Tasa de IGV deducida de los importes ya declarados.
 *
 * El cociente `igv / base` no basta: en una factura de S/ 0,50 el redondeo a
 * céntimos lo desvía hasta el 19,05%. Por eso se compara también en soles —si
 * aplicar la tasa de ley reproduce el IGV declarado con un céntimo de holgura,
 * la tasa es esa—, y el cociente queda como red de seguridad para importes
 * grandes con céntimos raros.
 */
function deducirIgv(base: number, igv: number) {
  if (!base || !igv) return { afectoIgv: false, igvPercent: 0, regimenIgv: 'EXONERADO' }

  const pct = igv / base * 100
  for (const { tasa, regimen } of TASAS_DE_LEY) {
    const reproduce = Math.abs(round2(base * tasa / 100) - igv) <= 0.01
    if (reproduce || Math.abs(pct - tasa) <= 0.5) {
      return { afectoIgv: true, igvPercent: tasa, regimenIgv: regimen }
    }
  }
  return { afectoIgv: true, igvPercent: round2(pct), regimenIgv: 'GENERAL' }
}

// ─── LECTURA DE UNA HOJA ───────────────────────────────

interface Hoja {
  nombre: string
  columna: (nombre: string) => number
  filas: any[][]
  /**
   * Desplazamiento de los datos respecto de la cabecera. La propuesta del SIRE
   * a veces sale con los datos corridos una columna a la derecha, y leerla sin
   * corregirlo mete la serie en «Tipo CP» y la fecha en «Des. Per.».
   */
  shift: number
}

function leerHoja(ws: XLSX.WorkSheet, nombre: string): Hoja | null {
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as any[][]
  if (filas.length < 2) return null

  const cabecera = filas[0]!.map(norm)
  const datos = filas.slice(1)

  const idxSerie = cabecera.indexOf('seriedelcdp')
  if (idxSerie < 0) return null

  // La serie es la firma más reconocible: 3 o 4 caracteres alfanuméricos que
  // empiezan por letra (F001, E001, FC01, F243).
  let shift = 0
  let mejor = -1
  for (const candidato of [0, 1, -1, 2]) {
    const aciertos = datos.filter(f =>
      /^[A-Z][A-Z0-9]{2,3}$/i.test(String(f[idxSerie + candidato] ?? '').trim())
    ).length
    if (aciertos > mejor) { mejor = aciertos; shift = candidato }
  }
  if (mejor <= 0) {
    console.warn(`  ! ${nombre}: no se reconoció ninguna serie; se lee sin desplazamiento`)
    shift = 0
  }

  return {
    nombre,
    filas: datos,
    shift,
    columna: (buscado: string) => {
      const i = cabecera.indexOf(norm(buscado))
      return i < 0 ? -1 : i + shift
    },
  }
}

// ─── CONVERSIÓN DE FILAS A COMPROBANTES ────────────────

interface Comprobante {
  origen: string
  year: number
  month: number
  fecha: Date
  tipoMovimiento: 'VENTA' | 'COMPRA'
  tipoComprobante: string
  serie: string | null
  numero: string | null
  tipoDocumento: string
  rucDni: string | null
  razonSocial: string | null
  afectoIgv: boolean
  igvPercent: number
  regimenIgv: string
  importeTotal: number
  baseImponible: number
  igv: number
  destinoTributario: string
  subcategoria: string
  creditoFiscalIgv: boolean
  detraccion: boolean
  detraccionCodigo: string | null
  detraccionPorcentaje: number
  detraccionMonto: number
  observacion: string
}

const omitidos: string[] = []
const avisos: string[] = []

/** El periodo declarado manda sobre la fecha de emisión cuando SUNAT lo informa. */
function periodoDe(hoja: Hoja, fila: any[], fecha: Date): { year: number; month: number } {
  const idx = hoja.columna('Periodo')
  const texto = idx >= 0 ? String(fila[idx] ?? '').trim() : ''
  const m = texto.match(/^(\d{4})-?(\d{2})$/)
  if (m) return { year: Number(m[1]), month: Number(m[2]) }
  return { year: fecha.getUTCFullYear(), month: fecha.getUTCMonth() + 1 }
}

function estaDeBaja(hoja: Hoja, fila: any[]): boolean {
  for (const nombre of ['Desc. Comp', 'Est. Comp', 'Est. Comp.']) {
    const idx = hoja.columna(nombre)
    if (idx < 0) continue
    const valor = String(fila[idx] ?? '').trim().toUpperCase()
    if (valor === 'BAJA' || valor === '2') return true
  }
  return false
}

function convertirVenta(hoja: Hoja, fila: any[], nFila: number): Comprobante | null {
  const col = hoja.columna.bind(hoja)
  const fecha = aFecha(fila[col('Fecha de emisión')])
  const serie = String(fila[col('Serie del CDP')] ?? '').trim() || null
  const numero = correlativo(fila[col('Nro CP o Doc. Nro Inicial (Rango)')])
  const etiqueta = `${hoja.nombre} fila ${nFila} (${serie ?? '?'}-${numero ?? '?'})`

  if (!fecha) { omitidos.push(`${etiqueta}: sin fecha de emisión`); return null }
  if (estaDeBaja(hoja, fila)) { omitidos.push(`${etiqueta}: comprobante dado de baja`); return null }

  // Una nota de crédito trae sus importes en «BI Gravada» o en «Dscto BI»,
  // según cómo la haya emitido el sistema de facturación. Se suman los dos.
  const gravada = nreal(fila[col('BI Gravada')]) + nreal(fila[col('Dscto BI')])
  const igv = nreal(fila[col('IGV / IPM')]) + nreal(fila[col('Dscto IGV / IPM')])
  const noGravada = nreal(fila[col('Mto Exonerado')]) + nreal(fila[col('Mto Inafecto')])
  const base = round2(gravada + noGravada)
  const total = round2(base + igv)

  if (total === 0) { omitidos.push(`${etiqueta}: importe 0`); return null }

  const tipoCp = String(fila[col('Tipo CP/Doc.')] ?? '').trim().padStart(2, '0')
  const tipoComprobante = TIPO_COMPROBANTE[tipoCp] ?? 'OTRO'
  const { year, month } = periodoDe(hoja, fila, fecha)

  const notas: string[] = []
  const car = String(fila[col('CAR SUNAT')] ?? '').trim()
  notas.push(`Importado del registro de ventas SUNAT${car ? ` · CAR ${car}` : ''}`)

  // ICBPER y otros tributos van dentro del «Total CP» de SUNAT pero no se
  // modelan aquí; se anota la diferencia para que el descuadre no sea mudo.
  const totalSunat = round2(nreal(fila[col('Total CP')]))
  const diferencia = round2(totalSunat - total)
  if (totalSunat !== 0 && Math.abs(diferencia) >= 0.01) {
    notas.push(`Total SUNAT S/ ${totalSunat.toFixed(2)} (incluye S/ ${diferencia.toFixed(2)} de ICBPER u otros tributos no registrados)`)
    avisos.push(`${etiqueta}: total SUNAT S/ ${totalSunat.toFixed(2)} vs base+IGV S/ ${total.toFixed(2)} (dif. S/ ${diferencia.toFixed(2)})`)
  }

  // Lo único que el archivo dice sobre la detracción es el tipo de operación:
  // avisa de que la hay, no de cuánto. La tasa entra como sugerencia.
  const codigoDetraccion = detraccionPorTipoOperacion(fila[col('Tipo Operación')])
  const tasaDetraccion = codigoDetraccion ? (tasaDetraccionSugerida(codigoDetraccion) ?? 0) : 0
  const montoDetraccion = codigoDetraccion ? calcularDetraccion(total, tasaDetraccion).monto : 0
  if (codigoDetraccion) {
    notas.push(`Detracción sugerida ${tasaDetraccion}% (${nombreCodigoDetraccion(codigoDetraccion)}); confirmar contra la constancia de depósito`)
    avisos.push(`${etiqueta}: sujeta a detracción según SUNAT; tasa ${tasaDetraccion}% asumida del catálogo`)
  }

  const igvInfo = deducirIgv(gravada, igv)

  return {
    origen: etiqueta,
    year, month, fecha,
    tipoMovimiento: 'VENTA',
    tipoComprobante,
    serie,
    numero,
    tipoDocumento: TIPO_DOCUMENTO[String(fila[col('Tipo Doc Identidad')] ?? '').trim()] ?? 'OTRO',
    rucDni: String(fila[col('Nro Doc Identidad')] ?? '').trim() || null,
    razonSocial: limpiarRazonSocial(fila[col('Apellidos Nombres/ Razón Social')]) || null,
    ...igvInfo,
    importeTotal: total,
    baseImponible: base,
    igv: round2(igv),
    destinoTributario: 'VENTA',
    subcategoria: 'OTRO',
    creditoFiscalIgv: false,
    detraccion: !!codigoDetraccion,
    detraccionCodigo: codigoDetraccion,
    detraccionPorcentaje: tasaDetraccion,
    detraccionMonto: montoDetraccion,
    observacion: notas.join('. '),
  }
}

function convertirCompra(hoja: Hoja, fila: any[], nFila: number): Comprobante | null {
  const col = hoja.columna.bind(hoja)
  const fecha = aFecha(fila[col('Fecha de emisión')])
  const serie = String(fila[col('Serie del CDP')] ?? '').trim() || null
  const numero = correlativo(fila[col('Nro CP o Doc. Nro Inicial (Rango)')])
  const etiqueta = `${hoja.nombre} fila ${nFila} (${serie ?? '?'}-${numero ?? '?'})`

  if (!fecha) { omitidos.push(`${etiqueta}: sin fecha de emisión`); return null }
  if (estaDeBaja(hoja, fila)) { omitidos.push(`${etiqueta}: comprobante dado de baja`); return null }

  // DG = destinado a operaciones gravadas, DGNG = a gravadas y no gravadas,
  // DNG = solo a no gravadas. Únicamente las dos primeras dan crédito fiscal.
  const baseDg = nreal(fila[col('BI Gravado DG')])
  const igvDg = nreal(fila[col('IGV/IPM DG')])
  const baseDgng = nreal(fila[col('BI Gravado DGNG')])
  const igvDgng = nreal(fila[col('IGV/IPM DGNG')])
  const baseDng = nreal(fila[col('BI Gravado DNG')])
  const igvDng = nreal(fila[col('IGV/IPM DNG')])
  const adqNg = nreal(fila[col('Valor Adq. NG')])

  const base = round2(baseDg + baseDgng + baseDng + adqNg)
  const igv = round2(igvDg + igvDgng + igvDng)
  const total = round2(base + igv)

  if (total === 0) { omitidos.push(`${etiqueta}: importe 0`); return null }

  const tipoCp = String(fila[col('Tipo CP/Doc')] ?? '').trim().padStart(2, '0')
  const tipoComprobante = TIPO_COMPROBANTE[tipoCp] ?? 'OTRO'
  const { year, month } = periodoDe(hoja, fila, fecha)

  const rucDni = String(fila[col('Nro Doc Identidad')] ?? '').trim() || null
  const clasificacion = (rucDni && CLASIFICACION_COMPRAS[rucDni]) || CLASIFICACION_POR_DEFECTO

  const notas: string[] = []
  const car = String(fila[col('CAR SUNAT')] ?? '').trim()
  notas.push(`Importado del registro de compras SUNAT${car ? ` · CAR ${car}` : ''}`)

  const totalSunat = round2(nreal(fila[col('Total CP')]))
  const diferencia = round2(totalSunat - total)
  if (totalSunat !== 0 && Math.abs(diferencia) >= 0.01) {
    notas.push(`Total SUNAT S/ ${totalSunat.toFixed(2)} (incluye S/ ${diferencia.toFixed(2)} de ICBPER u otros tributos no registrados)`)
    avisos.push(`${etiqueta}: total SUNAT S/ ${totalSunat.toFixed(2)} vs base+IGV S/ ${total.toFixed(2)} (dif. S/ ${diferencia.toFixed(2)})`)
  }

  // En el registro de compras la columna «Detracción» trae la constancia o una
  // marca, nunca el porcentaje: se deja señalado y a completar a mano.
  const marcaDetraccion = String(fila[col('Detracción')] ?? '').trim()
  const detraccion = marcaDetraccion !== '' && marcaDetraccion !== '0'
  if (detraccion) {
    notas.push(`Detracción informada por SUNAT (${marcaDetraccion}); falta código, tasa y constancia`)
    avisos.push(`${etiqueta}: compra con detracción "${marcaDetraccion}"; completar tasa y constancia a mano`)
  }

  const igvInfo = deducirIgv(baseDg + baseDgng, igv)
  if (!CLASIFICACION_COMPRAS[rucDni ?? '']) {
    avisos.push(`${etiqueta}: proveedor ${rucDni} sin clasificación; entra como ${CLASIFICACION_POR_DEFECTO.destino}`)
  }

  return {
    origen: etiqueta,
    year, month, fecha,
    tipoMovimiento: 'COMPRA',
    tipoComprobante,
    serie,
    numero,
    tipoDocumento: TIPO_DOCUMENTO[String(fila[col('Tipo Doc Identidad')] ?? '').trim()] ?? 'OTRO',
    rucDni,
    razonSocial: limpiarRazonSocial(fila[col('Apellidos Nombres/ Razon Social')]) || null,
    ...igvInfo,
    importeTotal: total,
    baseImponible: base,
    igv,
    destinoTributario: clasificacion.destino,
    subcategoria: clasificacion.subcategoria,
    // Lo destinado solo a operaciones no gravadas no da crédito fiscal.
    creditoFiscalIgv: igvInfo.afectoIgv && igvDng === 0,
    detraccion,
    detraccionCodigo: null,
    detraccionPorcentaje: 0,
    detraccionMonto: 0,
    observacion: notas.join('. '),
  }
}

// ─── LECTURA DE LOS ARCHIVOS ───────────────────────────

const comprobantes: Comprobante[] = []

for (const archivo of archivos) {
  const wb = XLSX.readFile(archivo)
  console.log(`\n=== ${archivo.split(/[\\/]/).pop()} ===`)

  for (const nombreHoja of wb.SheetNames) {
    const hoja = leerHoja(wb.Sheets[nombreHoja]!, nombreHoja)
    if (!hoja) { console.log(`  - ${nombreHoja}: sin datos reconocibles, se omite`); continue }

    const esVenta = norm(nombreHoja).includes('venta')
    const antes = comprobantes.length

    hoja.filas.forEach((fila, i) => {
      const c = esVenta ? convertirVenta(hoja, fila, i + 2) : convertirCompra(hoja, fila, i + 2)
      if (c) comprobantes.push(c)
    })

    console.log(
      `  - ${nombreHoja}: ${hoja.filas.length} filas → ${comprobantes.length - antes} comprobantes` +
      (hoja.shift ? ` (datos desplazados ${hoja.shift} columna)` : '')
    )
  }
}

// ─── RESUMEN ───────────────────────────────────────────

const soles = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

console.log('\n=== COMPROBANTES A IMPORTAR ===')
const porPeriodo = new Map<string, Comprobante[]>()
for (const c of comprobantes) {
  const clave = `${c.year}-${String(c.month).padStart(2, '0')}`
  porPeriodo.set(clave, [...(porPeriodo.get(clave) ?? []), c])
}

for (const [periodo, lista] of [...porPeriodo.entries()].sort()) {
  console.log(`\n${periodo}`)
  for (const c of lista.sort((a, b) => +a.fecha - +b.fecha)) {
    console.log(
      `  ${c.fecha.toISOString().slice(0, 10)}  ${c.tipoMovimiento.padEnd(6)} ` +
      `${(c.serie ?? '').padEnd(4)}-${(c.numero ?? '').padEnd(8)} ` +
      `${(c.razonSocial ?? '').slice(0, 32).padEnd(32)} ` +
      `base ${soles(c.baseImponible).padStart(10)}  IGV ${soles(c.igv).padStart(9)}  ` +
      `total ${soles(c.importeTotal).padStart(10)}  ${c.destinoTributario}` +
      (c.detraccion ? `  [detracción ${c.detraccionPorcentaje}% = S/ ${soles(c.detraccionMonto)}]` : '')
    )
  }
  const ventas = lista.filter(c => c.tipoMovimiento === 'VENTA')
  const compras = lista.filter(c => c.tipoMovimiento === 'COMPRA')
  const suma = (l: Comprobante[], f: (c: Comprobante) => number) => round2(l.reduce((s, c) => s + f(c), 0))
  console.log(
    `  → ventas: base ${soles(suma(ventas, c => c.baseImponible))} · IGV ${soles(suma(ventas, c => c.igv))} | ` +
    `compras: base ${soles(suma(compras, c => c.baseImponible))} · IGV ${soles(suma(compras, c => c.igv))} | ` +
    `IGV del mes ${soles(round2(suma(ventas, c => c.igv) - suma(compras, c => c.igv)))}`
  )
}

if (avisos.length) {
  console.log('\n=== AVISOS (revisar) ===')
  for (const a of avisos) console.log('  ! ' + a)
}
if (omitidos.length) {
  console.log('\n=== FILAS OMITIDAS ===')
  for (const o of omitidos) console.log('  - ' + o)
}

// ─── ESCRITURA ─────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!)),
})

const empresa = await prisma.company.findFirst({ where: { ruc } })
if (!empresa) {
  console.error(`\nNo existe ninguna empresa con RUC ${ruc}.`)
  await prisma.$disconnect()
  process.exit(1)
}
console.log(`\nEmpresa destino: #${empresa.id} ${empresa.razonSocial} (${empresa.ruc})`)

if (!apply) {
  console.log('\nEnsayo: no se escribió nada. Añade --apply para importar de verdad.')
  await prisma.$disconnect()
  process.exit(0)
}

// Sin fila en `tax_parameters` la aplicación cae a los valores por defecto
// (UIT 5 150, RMT), que no son los del año que se está importando. Se crea lo
// que falte y no se toca lo que ya exista: los parámetros son del contribuyente.
for (const year of [...new Set(comprobantes.map(c => c.year))].sort()) {
  const existe = await prisma.taxParameter.findFirst({ where: { companyId: empresa.id, year } })
  if (existe) {
    console.log(`  = parámetros ${year} ya definidos (${existe.regimen}, UIT S/ ${existe.uit})`)
    continue
  }
  const uit = UIT_POR_ANIO[year]
  if (!uit) {
    console.warn(`  ! sin UIT conocida para ${year}: define los parámetros en /configuracion`)
    continue
  }
  await prisma.taxParameter.create({
    data: { companyId: empresa.id, year, regimen: REGIMEN, uit, igvPercent: 18 },
  })
  console.log(`  + parámetros ${year} creados (${REGIMEN}, UIT S/ ${uit})`)
}

let creados = 0
let repetidos = 0
let actualizados = 0

for (const c of comprobantes) {
  // Idempotencia: el mismo documento del mismo emisor no se duplica, así que
  // relanzar el script tras un fallo a medias es seguro.
  const yaExiste = await prisma.voucher.findFirst({
    where: {
      companyId: empresa.id,
      tipoMovimiento: c.tipoMovimiento as any,
      serie: c.serie,
      numero: c.numero,
      rucDni: c.rucDni,
    },
  })
  if (yaExiste) {
    if (!actualizar) {
      repetidos++
      console.log(`  = ya existía: ${c.origen}`)
      continue
    }
    // Solo los importes y la detracción: la clasificación tributaria y las
    // notas pueden haberse ajustado a mano desde la aplicación.
    await prisma.voucher.update({
      where: { id: yaExiste.id },
      data: {
        fecha: c.fecha,
        year: c.year,
        month: c.month,
        afectoIgv: c.afectoIgv,
        igvPercent: c.igvPercent,
        regimenIgv: c.regimenIgv as any,
        importeTotal: c.importeTotal,
        baseImponible: c.baseImponible,
        igv: c.igv,
        detraccion: c.detraccion,
        detraccionCodigo: c.detraccionCodigo,
        detraccionPorcentaje: c.detraccionPorcentaje,
        detraccionMonto: c.detraccionMonto,
      },
    })
    actualizados++
    console.log(`  ~ actualizado: ${c.origen}`)
    continue
  }

  let partyId: number | null = null
  if (c.rucDni && c.razonSocial) {
    const party = await prisma.party.upsert({
      where: {
        companyId_tipoDocumento_numeroDocumento: {
          companyId: empresa.id,
          tipoDocumento: c.tipoDocumento as any,
          numeroDocumento: c.rucDni,
        },
      },
      create: {
        companyId: empresa.id,
        tipoDocumento: c.tipoDocumento as any,
        numeroDocumento: c.rucDni,
        razonSocial: c.razonSocial,
      },
      update: {},
    })
    partyId = party.id
  }

  await prisma.voucher.create({
    data: {
      companyId: empresa.id,
      year: c.year,
      month: c.month,
      fecha: c.fecha,
      tipoMovimiento: c.tipoMovimiento as any,
      tipoComprobante: c.tipoComprobante as any,
      serie: c.serie,
      numero: c.numero,
      partyId,
      rucDni: c.rucDni,
      razonSocial: c.razonSocial,
      afectoIgv: c.afectoIgv,
      igvPercent: c.igvPercent,
      regimenIgv: c.regimenIgv as any,
      importeTotal: c.importeTotal,
      baseImponible: c.baseImponible,
      igv: c.igv,
      // Los importes son los que SUNAT ya tiene declarados: recalcularlos desde
      // el total movería céntimos.
      modoManual: true,
      medioPago: 'TRANSFERENCIA',
      estadoPago: 'PAGADO',
      destinoTributario: c.destinoTributario as any,
      subcategoria: c.subcategoria as any,
      deducibleIr: c.destinoTributario !== 'NO_DEDUCIBLE',
      creditoFiscalIgv: c.creditoFiscalIgv,
      detraccion: c.detraccion,
      detraccionCodigo: c.detraccionCodigo,
      detraccionPorcentaje: c.detraccionPorcentaje,
      detraccionMonto: c.detraccionMonto,
      observacion: c.observacion,
    },
  })
  creados++
}

console.log(
  `\nImportados ${creados} comprobantes` +
  (actualizados ? `, actualizados ${actualizados}` : '') +
  (repetidos ? `, ${repetidos} ya existían` : '') + '.'
)
await prisma.$disconnect()
