/**
 * Coherencia de tenants: ninguna clave foránea puede cruzar empresas.
 *
 * La extensión del cliente Prisma acota `where` y `data`, pero no puede filtrar
 * un `include` ni validar un id escalar que llega en el body. La aplicación lo
 * comprueba al escribir; esto lo verifica sobre los datos ya guardados.
 *
 * Solo lee: se puede ejecutar contra producción.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from '../server/utils/mariaAdapterOptions'

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!)),
})

const COMPROBACIONES: { nombre: string; sql: string }[] = [
  {
    nombre: 'comprobantes enlazados a un proveedor de otra empresa',
    sql: `SELECT COUNT(*) AS n FROM vouchers v
          JOIN parties p ON p.id = v.partyId
          WHERE p.companyId <> v.companyId`,
  },
  {
    nombre: 'activos enlazados a un comprobante de otra empresa',
    sql: `SELECT COUNT(*) AS n FROM inventory_assets a
          JOIN vouchers v ON v.id = a.voucherId
          WHERE v.companyId <> a.companyId`,
  },
  {
    nombre: 'membresías huérfanas',
    sql: `SELECT COUNT(*) AS n FROM memberships m
          LEFT JOIN companies c ON c.id = m.companyId
          WHERE c.id IS NULL`,
  },
  {
    nombre: 'empresas sin ningún propietario activo',
    sql: `SELECT COUNT(*) AS n FROM companies c
          WHERE NOT EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.companyId = c.id AND m.role = 'OWNER' AND m.activo = 1
          )`,
  },
  {
    nombre: 'plataforma sin superadmin activo',
    sql: `SELECT CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END AS n FROM users
          WHERE platformRole = 'SUPERADMIN' AND activo = 1`,
  },
]

let fallos = 0

for (const { nombre, sql } of COMPROBACIONES) {
  const filas = await prisma.$queryRawUnsafe<{ n: bigint | number }[]>(sql)
  const n = Number(filas[0]?.n ?? 0)
  if (n === 0) {
    console.log(`  ✓ ${nombre}: 0`)
  } else {
    console.log(`  ✗ ${nombre}: ${n}`)
    fallos++
  }
}

await prisma.$disconnect()

if (fallos > 0) {
  console.error(`\n${fallos} invariante(s) rotos.`)
  process.exit(1)
}
console.log('\nTodos los invariantes se cumplen.')
