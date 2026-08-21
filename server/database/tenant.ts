import type { CompanyRole } from '@prisma/client'
import { basePrisma } from './client'

/**
 * Cliente Prisma acotado a una empresa.
 *
 * El aislamiento no depende de que nadie olvide un `where`: la extensión inyecta
 * `companyId` en cada operación y **lanza** ante cualquier cosa que no sepa
 * acotar. Si Prisma añade una operación nueva, salta un error en vez de abrirse
 * una fuga en silencio.
 */

/** Modelos cuyas filas pertenecen a una empresa. */
const MODELOS_TENANT = new Set([
  'Party',
  'Voucher',
  'InventoryAsset',
  'TaxParameter',
  'MonthlySummary',
  'AnnualClosure',
  'AuditLog',
  'Membership',
])

/** Operaciones cuyo `where` hay que acotar. */
const OPS_CON_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'delete',
  'updateMany',
  'deleteMany',
])

const OPS_ESCRITURA = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
])

/** Operadores de escritura anidada: la extensión no puede acotarlos. */
const OPERADORES_ANIDADOS = new Set([
  'connect',
  'connectOrCreate',
  'disconnect',
  'set',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
])

function error(statusCode: number, message: string): never {
  throw createError({ statusCode, message })
}

/**
 * Las escrituras anidadas viajan dentro de `data` y la extensión solo ve el
 * primer nivel, así que un `connect: { id }` enlazaría con otra empresa sin que
 * nadie se entere. Se prohíben: las FK se resuelven con `assertPertenece`.
 */
function rechazarEscriturasAnidadas(data: unknown, modelo: string): void {
  if (!data || typeof data !== 'object') return

  for (const valor of Object.values(data as Record<string, unknown>)) {
    if (!valor || typeof valor !== 'object' || valor instanceof Date || Array.isArray(valor)) continue
    const claves = Object.keys(valor as Record<string, unknown>)
    if (claves.some(c => OPERADORES_ANIDADOS.has(c))) {
      error(500, `Escritura anidada no permitida en ${modelo}: usa el id escalar y valida la pertenencia`)
    }
  }
}

function inyectarEnData(data: unknown, companyId: number): unknown {
  if (Array.isArray(data)) return data.map(d => ({ ...(d as object), companyId }))
  return { ...(data as object), companyId }
}

function buildTenantClient(companyId: number, role: CompanyRole) {
  const soloLectura = role === 'LECTOR'

  return basePrisma
    .$extends({
      query: {
        async $allOperations({ model, operation, args, query }) {
          // Sin modelo = consulta cruda ($queryRaw / $executeRaw y variantes).
          // No hay forma de acotarlas: se cierran para el cliente por empresa.
          if (!model) {
            error(500, `Consulta cruda '${operation}' no permitida en el cliente por empresa`)
          }

          if (soloLectura && OPS_ESCRITURA.has(operation)) {
            error(403, 'Tu rol en esta empresa es de solo lectura')
          }

          // La propia empresa se acota por su id, no por `companyId`.
          if (model === 'Company') {
            if (OPS_ESCRITURA.has(operation) && operation !== 'update') {
              error(500, `Operación '${operation}' sobre Company no permitida desde el cliente por empresa`)
            }
            const a = args as Record<string, any>
            a.where = { ...(a.where ?? {}), id: companyId }
            if (a.data) delete a.data.id
            return query(a)
          }

          if (!MODELOS_TENANT.has(model)) {
            error(500, `El modelo ${model} no pertenece a ninguna empresa: usa basePrisma con su propio guard`)
          }

          const a = args as Record<string, any>

          if (OPS_CON_WHERE.has(operation)) {
            a.where = { ...(a.where ?? {}), companyId }
          }

          if (operation === 'create' || operation === 'createMany') {
            rechazarEscriturasAnidadas(a.data, model)
            a.data = inyectarEnData(a.data, companyId)
          }

          if (operation === 'update' || operation === 'updateMany') {
            rechazarEscriturasAnidadas(a.data, model)
            // Nadie mueve una fila de empresa.
            if (a.data) delete a.data.companyId
          }

          if (operation === 'upsert') {
            // `where` lleva el selector único compuesto, que ya incluye
            // companyId; se verifica en vez de adivinar el nombre del selector.
            const selector = Object.values(a.where ?? {}).find(
              v => v && typeof v === 'object' && 'companyId' in (v as object)
            ) as { companyId?: number } | undefined

            if (selector && selector.companyId !== companyId) {
              error(403, `upsert sobre ${model} con una empresa distinta de la activa`)
            }
            if (!selector) {
              a.where = { ...(a.where ?? {}), companyId }
            }

            rechazarEscriturasAnidadas(a.create, model)
            rechazarEscriturasAnidadas(a.update, model)
            a.create = inyectarEnData(a.create, companyId)
            if (a.update) delete a.update.companyId
          }

          return query(a)
        },
      },
    })
    .$extends({
      client: {
        get $companyId() {
          return companyId
        },
        get $companyRole() {
          return role
        },
      },
    })
}

declare const tenantBrand: unique symbol

/**
 * Cliente acotado. La marca existe porque la extensión `query` no cambia la
 * forma de los tipos: sin ella, `PrismaClient` sería estructuralmente asignable
 * y se podría pasar el cliente sin acotar donde se espera el acotado.
 */
export type TenantDb = ReturnType<typeof buildTenantClient> & { readonly [tenantBrand]: true }

/**
 * `$extends` es un `Object.create` sobre el cliente original más un Proxy: el
 * engine, el adapter y el pool de conexiones se comparten, así que construirlo
 * por petición no abre conexiones.
 */
export function createTenantClient(companyId: number, role: CompanyRole): TenantDb {
  return buildTenantClient(companyId, role) as TenantDb
}

/** Modelos con `companyId` sobre los que se puede comprobar pertenencia. */
type ModeloConEmpresa = 'party' | 'voucher' | 'inventoryAsset'

/**
 * Comprueba que una FK escalar apunte a una fila de la empresa activa.
 *
 * Es el agujero que la extensión no puede tapar: `partyId` y `voucherId` llegan
 * como números sueltos en el body y sin esto un usuario podría enlazar sus
 * comprobantes con datos de otra empresa.
 */
export async function assertPertenece(
  db: TenantDb,
  modelo: ModeloConEmpresa,
  id: number | null | undefined
): Promise<number | null> {
  if (id == null) return null

  const fila = await (db[modelo] as any).findFirst({ where: { id: Number(id) }, select: { id: true } })
  if (!fila) {
    throw createError({ statusCode: 404, message: `El registro referenciado no existe en esta empresa` })
  }
  return fila.id
}
