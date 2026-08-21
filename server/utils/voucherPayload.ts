import type { RegimenIgv } from '@prisma/client'
import { assertPertenece } from '../database/tenant'
import { PRESETS_IGV } from '../../shared/utils/regimenes'
import { calcularBaseEIGV, round2 } from '../../shared/utils/tax'
import { loadTaxContext } from './taxContext'
import type { RequestCtx } from './tenant'

/**
 * Construye el payload de un comprobante para crear o editar.
 *
 * Vivía duplicado entre POST y PUT, y en ninguno de los dos se pasaba la tasa a
 * `calcularBaseEIGV`, así que el `igvPercent` configurado nunca llegaba a
 * aplicarse: todo salía al 18%.
 */
export async function buildVoucherData(ctx: RequestCtx, body: any) {
  const fecha = new Date(body.fecha)
  const year = Number(body.year) || fecha.getFullYear()
  const month = Number(body.month) || fecha.getMonth() + 1
  const total = Number(body.importeTotal)

  const taxContext = await loadTaxContext(ctx, year)

  const { afectoIgv, igvPercent, regimenIgv } = resolverTasaIgv(body, taxContext.igvPercent)

  // El `partyId` llega como número suelto en el body: la extensión del cliente
  // solo ve el primer nivel de `where`/`data`, así que sin esto se podría
  // enlazar un comprobante con un proveedor de otra empresa.
  const partyId = await assertPertenece(ctx.db, 'party', body.partyId || null)

  let baseImponible: number
  let igv: number

  if (body.modoManual && body.baseImponible != null) {
    baseImponible = round2(Number(body.baseImponible))
    igv = round2(Number(body.igv || 0))
  } else {
    const calc = calcularBaseEIGV(total, afectoIgv, igvPercent)
    baseImponible = calc.baseImponible
    igv = calc.igv
  }

  const esVenta = body.tipoMovimiento === 'VENTA'
  const noDeducible = body.destinoTributario === 'NO_DEDUCIBLE'

  const deducibleIr = body.deducibleIr ?? !noDeducible
  const creditoFiscalIgv = afectoIgv && !esVenta && !noDeducible
    ? (body.creditoFiscalIgv ?? true)
    : false

  return {
    // Explícito para satisfacer el tipo de Prisma; la extensión del cliente lo
    // sobrescribe con la empresa activa, así que no puede apuntar a otra.
    companyId: ctx.companyId,
    year,
    month,
    fecha,
    tipoMovimiento: body.tipoMovimiento,
    tipoComprobante: body.tipoComprobante || 'FACTURA',
    serie: body.serie || null,
    numero: body.numero || null,
    partyId,
    rucDni: body.rucDni || null,
    razonSocial: body.razonSocial || null,
    afectoIgv,
    igvPercent,
    regimenIgv,
    importeTotal: total,
    baseImponible,
    igv,
    modoManual: body.modoManual || false,
    medioPago: body.medioPago || 'TRANSFERENCIA',
    estadoPago: body.estadoPago || 'PAGADO',
    destinoTributario: body.destinoTributario,
    subcategoria: body.subcategoria || 'OTRO',
    deducibleIr,
    creditoFiscalIgv,
    inventarioFinal: body.inventarioFinal || false,
    activoFijo: body.activoFijo || false,
    vidaUtilMeses: body.vidaUtilMeses || null,
    observacion: body.observacion || null,
  }
}

/**
 * Normaliza tasa y régimen de IGV para que no puedan contradecirse: una tasa 0
 * implica operación no gravada, y un régimen exonerado implica tasa 0.
 */
export function resolverTasaIgv(body: any, igvPercentPorDefecto: number) {
  let regimenIgv: RegimenIgv = body.regimenIgv || (body.afectoIgv === false ? 'EXONERADO' : 'GENERAL')
  let afectoIgv = body.afectoIgv !== false

  if (regimenIgv === 'EXONERADO' || regimenIgv === 'INAFECTO') afectoIgv = false

  let igvPercent: number
  if (!afectoIgv) {
    igvPercent = 0
  } else if (body.igvPercent != null && body.igvPercent !== '') {
    igvPercent = Number(body.igvPercent)
  } else {
    const preset = PRESETS_IGV.find(p => p.regimen === regimenIgv)
    igvPercent = preset && preset.regimen !== 'GENERAL' ? preset.value : igvPercentPorDefecto
  }

  if (!Number.isFinite(igvPercent) || igvPercent <= 0) {
    igvPercent = 0
    afectoIgv = false
    if (regimenIgv === 'GENERAL' || regimenIgv === 'LEY_31556') regimenIgv = 'EXONERADO'
  }

  return { afectoIgv, igvPercent, regimenIgv }
}
