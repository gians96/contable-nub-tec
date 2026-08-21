import type { H3Event } from 'h3'
import type { Company, CompanyRole } from '@prisma/client'
import type { TenantDb } from '../database/tenant'
// Reexportado para que los handlers lo tengan por auto-import: `server/database/`
// queda fuera del escaneo de Nitro a propósito.
export { assertPertenece } from '../database/tenant'
import type { TaxContextCache } from './taxContext'
import type { CierreCache } from './cierreAnual'
import type { IgvDebtCache } from './monthlyIgvDebt'

/**
 * Contexto de la petición: el cliente acotado más las cachés de cálculo.
 *
 * Las cachés se indexan solo por año. Mientras vivan aquí, atadas a una
 * petición y a una empresa, no hay fuga posible; si alguien las subiera a
 * ámbito de módulo "para optimizar", pasarían a servir datos de una empresa a
 * otra sin que nada lo delatara.
 */
export interface RequestCtx {
  db: TenantDb
  companyId: number
  role: CompanyRole
  company: Company
  tax: TaxContextCache
  cierre: CierreCache
  debt: IgvDebtCache
}

/** Cliente acotado a la empresa activa. Lo prepara `server/middleware/1.tenant.ts`. */
export function requireDb(event: H3Event): TenantDb {
  const db = event.context.db
  if (!db) {
    throw createError({ statusCode: 500, message: 'No hay empresa activa resuelta para esta petición' })
  }
  return db
}

export function requireCompany(event: H3Event): Company {
  const company = event.context.company
  if (!company) {
    throw createError({ statusCode: 409, message: 'No hay empresa activa' })
  }
  return company
}

export function requireCompanyId(event: H3Event): number {
  return requireCompany(event).id
}

/**
 * Contexto de cálculo, memoizado por petición: los endpoints construían a mano
 * `{ tax: new Map(), cierre: new Map(), debt: new Map() }` y algunos llamaban a
 * `loadTaxContext` sin caché ninguna.
 */
export function requireCtx(event: H3Event): RequestCtx {
  if (event.context.ctx) return event.context.ctx

  const company = requireCompany(event)
  const ctx: RequestCtx = {
    db: requireDb(event),
    companyId: company.id,
    role: event.context.membershipRole ?? 'LECTOR',
    company,
    tax: new Map(),
    cierre: new Map(),
    debt: new Map(),
  }

  event.context.ctx = ctx
  return ctx
}
