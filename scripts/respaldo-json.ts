/**
 * Respaldo de la base a un JSON, tabla por tabla.
 *
 * No sustituye a `mysqldump` —no guarda el esquema ni los índices—, pero sí
 * permite reconstruir los datos si una migración sale mal, y no necesita el
 * cliente de MySQL instalado ni manipular la contraseña fuera del entorno.
 *
 * Uso:
 *   bun scripts/respaldo-json.ts <carpeta-destino>
 *
 * Solo lee: se puede ejecutar contra producción.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from '../server/utils/mariaAdapterOptions'

const destino = process.argv[2]
if (!destino) {
  console.error('Uso: bun scripts/respaldo-json.ts <carpeta-destino>')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!)),
})

const TABLAS = [
  'users', 'companies', 'memberships', 'audit_logs', 'tax_parameters',
  'parties', 'vouchers', 'inventory_assets', 'monthly_summaries', 'annual_closures',
]

mkdirSync(destino, { recursive: true })

const respaldo: Record<string, unknown[]> = {}
for (const tabla of TABLAS) {
  const filas = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM \`${tabla}\``)
  respaldo[tabla] = filas
  console.log(`  ${tabla}: ${filas.length} filas`)
}

// `Decimal` y `BigInt` no son serializables por JSON.stringify sin ayuda.
const json = JSON.stringify(respaldo, (_clave, valor) =>
  typeof valor === 'bigint' ? Number(valor) : valor, 1)

const archivo = join(destino, 'respaldo-contable.json')
writeFileSync(archivo, json, 'utf8')
console.log(`\nRespaldo escrito en ${archivo} (${(json.length / 1024).toFixed(0)} KB)`)

await prisma.$disconnect()
