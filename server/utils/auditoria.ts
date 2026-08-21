import type { H3Event } from 'h3'
import type { AuditAccion } from '@prisma/client'

/**
 * Rastro de escrituras sobre datos contables.
 *
 * Escribe con el cliente acotado, así que la fila queda atada a la empresa
 * activa sin que haya que pasarla. Es de mejor esfuerzo: si el registro falla,
 * la operación que lo motivó ya está hecha y no se deshace por no poder
 * anotarla.
 */
export async function registrarAuditoria(
  event: H3Event,
  accion: AuditAccion,
  entidad: string,
  entidadId: number | null,
  resumen?: string,
  datos?: unknown
): Promise<void> {
  const db = event.context.db
  if (!db) return

  try {
    await db.auditLog.create({
      data: {
        companyId: db.$companyId,
        userId: event.context.user?.id ?? null,
        accion,
        entidad,
        entidadId,
        resumen: resumen?.slice(0, 190) ?? null,
        datos: datos === undefined ? null : JSON.stringify(datos),
      },
    })
  } catch {
    // No interrumpir la petición por no poder anotar.
  }
}

// ─── RESÚMENES LEGIBLES ────────────────────────────────

function soles(valor: unknown): string {
  return 'S/ ' + Number(valor ?? 0).toFixed(2)
}

export function resumenVoucher(v: {
  tipoMovimiento: string
  tipoComprobante: string
  serie?: string | null
  numero?: string | null
  razonSocial?: string | null
  importeTotal: unknown
}): string {
  const doc = [v.serie, v.numero].filter(Boolean).join('-')
  return [
    v.tipoMovimiento,
    v.tipoComprobante,
    doc,
    v.razonSocial,
    soles(v.importeTotal),
  ].filter(Boolean).join(' · ')
}

export function resumenActivo(a: { descripcion: string; total: unknown }): string {
  return `${a.descripcion} · ${soles(a.total)}`
}

export function resumenParty(p: { numeroDocumento: string; razonSocial: string }): string {
  return `${p.numeroDocumento} · ${p.razonSocial}`
}
