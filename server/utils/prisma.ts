import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from './mariaAdapterOptions'

function createAdapter() {
  return new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!))
}

// Singleton de Prisma para evitar múltiples conexiones en dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
