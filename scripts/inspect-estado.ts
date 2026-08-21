/**
 * Radiografía de solo lectura de una empresa: comprobantes por periodo, IGV del
 * mes, detracciones y proveedores.
 *
 * Uso: bun scripts/inspect-estado.ts [RUC]
 *
 * Solo lee: se puede ejecutar contra producción.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { mariaPoolConfigFromDatabaseUrl } from '../server/utils/mariaAdapterOptions'
import { round2 } from '../shared/utils/tax'

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariaPoolConfigFromDatabaseUrl(process.env.DATABASE_URL!)),
})

const ruc = process.argv[2]
const soles = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const empresas = await prisma.company.findMany({
  where: ruc ? { ruc } : {},
  select: { id: true, ruc: true, razonSocial: true, estado: true, plan: true },
})

for (const empresa of empresas) {
  console.log(`\n=== #${empresa.id} ${empresa.razonSocial} (${empresa.ruc}) — ${empresa.estado} / ${empresa.plan} ===`)

  const params = await prisma.taxParameter.findMany({
    where: { companyId: empresa.id },
    select: { year: true, regimen: true, igvPercent: true, uit: true },
  })
  console.log('Parámetros:', params.map(p => `${p.year}: ${p.regimen}, IGV ${p.igvPercent}%, UIT ${p.uit}`).join(' | ') || '(ninguno)')

  const vouchers = await prisma.voucher.findMany({
    where: { companyId: empresa.id },
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { fecha: 'asc' }],
    include: { party: { select: { razonSocial: true } } },
  })
  if (!vouchers.length) { console.log('Sin comprobantes.'); continue }

  let periodo = ''
  for (const v of vouchers) {
    const clave = `${v.year}-${String(v.month).padStart(2, '0')}`
    if (clave !== periodo) {
      periodo = clave
      const mes = vouchers.filter(x => x.year === v.year && x.month === v.month)
      const igvVentas = round2(mes.filter(x => x.tipoMovimiento === 'VENTA').reduce((s, x) => s + Number(x.igv), 0))
      const igvCompras = round2(mes.filter(x => x.tipoMovimiento === 'COMPRA' && x.creditoFiscalIgv).reduce((s, x) => s + Number(x.igv), 0))
      console.log(`\n${clave} — IGV ventas ${soles(igvVentas)} · crédito fiscal ${soles(igvCompras)} · neto ${soles(round2(igvVentas - igvCompras))}`)
    }
    console.log(
      `  ${v.fecha.toISOString().slice(0, 10)} ${v.tipoMovimiento.padEnd(6)} ${v.tipoComprobante.padEnd(13)} ` +
      `${(v.serie ?? '').padEnd(4)}-${(v.numero ?? '').padEnd(8)} ${(v.razonSocial ?? '').slice(0, 30).padEnd(30)} ` +
      `total ${soles(Number(v.importeTotal)).padStart(10)} base ${soles(Number(v.baseImponible)).padStart(10)} ` +
      `IGV ${soles(Number(v.igv)).padStart(8)} ${v.igvPercent}% ${v.destinoTributario}` +
      (v.detraccion ? ` [DETR ${v.detraccionCodigo} ${v.detraccionPorcentaje}% S/ ${soles(Number(v.detraccionMonto))}]` : '') +
      (v.party ? '' : '  (sin proveedor enlazado)')
    )
  }

  const total = (tipo: string, campo: 'baseImponible' | 'igv' | 'importeTotal') =>
    round2(vouchers.filter(v => v.tipoMovimiento === tipo).reduce((s, v) => s + Number(v[campo]), 0))
  console.log(
    `\nAcumulado: ventas base ${soles(total('VENTA', 'baseImponible'))} · IGV ${soles(total('VENTA', 'igv'))} | ` +
    `compras base ${soles(total('COMPRA', 'baseImponible'))} · IGV ${soles(total('COMPRA', 'igv'))}`
  )
  const conDetraccion = vouchers.filter(v => v.detraccion)
  console.log(`Detracciones: ${conDetraccion.length} comprobante(s), S/ ${soles(round2(conDetraccion.reduce((s, v) => s + Number(v.detraccionMonto), 0)))}`)
}

await prisma.$disconnect()
