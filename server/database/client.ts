import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from '../utils/mariaAdapterOptions'

/**
 * Cliente Prisma sin acotar por empresa.
 *
 * Vive fuera de `server/utils/` **a propósito**: esa es la única carpeta que
 * Nitro escanea para auto-importar, así que antes bastaba escribir `prisma.` en
 * cualquier archivo del servidor para saltarse el aislamiento sin dejar rastro
 * en el diff. Ahora usarlo exige un import explícito con ruta relativa.
 *
 * Reservado para lo que es de plataforma y no pertenece a ninguna empresa:
 * autenticación, usuarios, empresas y el panel de superadmin. Todo dato
 * contable va por el cliente acotado (`requireDb(event)`).
 */
function createAdapter() {
  return new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!))
}

// Singleton para evitar múltiples conexiones en dev
const globalForPrisma = globalThis as unknown as { basePrisma: PrismaClient }

export const basePrisma = globalForPrisma.basePrisma || new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma
}
