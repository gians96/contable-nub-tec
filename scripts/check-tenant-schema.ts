/**
 * Todo modelo de datos de negocio tiene que declarar `companyId`.
 *
 * Sin esto, añadir una tabla nueva dentro de seis meses la dejaría fuera del
 * aislamiento sin que nada avisara.
 */
import { readFileSync } from 'node:fs'

/** Modelos de plataforma: no pertenecen a ninguna empresa. */
const SIN_EMPRESA = new Set(['User', 'Company'])

const schema = readFileSync('prisma/schema.prisma', 'utf-8')
const modelos = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]

let fallos = 0

for (const [, nombre, cuerpo] of modelos) {
  if (SIN_EMPRESA.has(nombre!)) continue

  const tieneColumna = /^\s*companyId\s+Int\b/m.test(cuerpo!)
  const tieneRelacion = /^\s*company\s+Company\b/m.test(cuerpo!)

  if (tieneColumna && tieneRelacion) {
    console.log(`  ✓ ${nombre}`)
  } else {
    console.log(`  ✗ ${nombre}: falta ${!tieneColumna ? 'companyId Int' : 'la relación company Company'}`)
    fallos++
  }
}

if (fallos > 0) {
  console.error(`\n${fallos} modelo(s) sin acotar por empresa.`)
  process.exit(1)
}
console.log('\nTodos los modelos de negocio están acotados por empresa.')
