import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

const url = new URL(process.env.DATABASE_URL!)
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database con datos reales...')

  // ─── Limpiar datos existentes ───────────────────────────
  await prisma.inventoryAsset.deleteMany()
  await prisma.voucher.deleteMany()
  await prisma.monthlySummary.deleteMany()
  await prisma.annualClosure.deleteMany()
  await prisma.party.deleteMany()
  console.log('  ✓ Datos anteriores eliminados')

  // ─── Usuario admin ────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash },
  })
  console.log('  ✓ Usuario: admin / admin123')

  // ─── Empresa ──────────────────────────────────────────
  const existing = await prisma.companySettings.findFirst()
  if (!existing) {
    await prisma.companySettings.create({
      data: {
        ruc: '20605555153',
        razonSocial: 'NUBE TECNOLOGICA SOCIEDAD ANONIMA CERRADA',
        nombreComercial: 'NUBETEC S.A.',
        direccion: 'Lima, Perú',
      },
    })
  }
  console.log('  ✓ Empresa configurada')

  // ─── Parámetros tributarios ───────────────────────────
  for (const p of [
    { year: 2024, uit: 5150 },
    { year: 2025, uit: 5350 },
    { year: 2026, uit: 5350 },
  ]) {
    await prisma.taxParameter.upsert({
      where: { year: p.year },
      update: {},
      create: {
        year: p.year,
        uit: p.uit,
        igvPercent: 18,
        irMonthlyPercent: 1,
        irAnnualTramo1Limit: 15,
        irAnnualTramo1Rate: 10,
        irAnnualTramo2Rate: 29.5,
      },
    })
  }
  console.log('  ✓ Parámetros tributarios 2024-2026')

  // ─── Parties (clientes y proveedores reales) ──────────
  const parties: { tipoDocumento: 'RUC' | 'DNI'; numeroDocumento: string; razonSocial: string }[] = [
    // Clientes
    { tipoDocumento: 'RUC', numeroDocumento: '20607431419', razonSocial: 'MAGIC CRAFTS E.I.R.L.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20162086716', razonSocial: 'DIRECCION REGIONAL DE SALUD DE LIMA' },
    { tipoDocumento: 'RUC', numeroDocumento: '10760791259', razonSocial: 'YATACO ORE ESTEFANI CELESTE' },
    { tipoDocumento: 'DNI', numeroDocumento: '41774206', razonSocial: 'CLIENTE PARTICULAR' },
    // Proveedores
    { tipoDocumento: 'RUC', numeroDocumento: '20606062339', razonSocial: 'COMPAÑIA DE INVERSIONES AMERICANAS SOCIEDAD ANONIMA CERRADA' },
    { tipoDocumento: 'RUC', numeroDocumento: '20523612141', razonSocial: 'GRUPO DE CORPORACIONES PERUANAS ASOCIADAS SOCIEDAD ANONIMA CERRADA' },
    { tipoDocumento: 'RUC', numeroDocumento: '20100049181', razonSocial: 'TAI LOY S.A.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20550442010', razonSocial: 'EN 1 CLIC S.A.C.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20112273922', razonSocial: 'TIENDAS DEL MEJORAMIENTO DEL HOGAR S.A.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20512528458', razonSocial: 'SHALOM EMPRESARIAL S.A.C.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20601355761', razonSocial: 'Liderman Servicios SAC' },
    { tipoDocumento: 'RUC', numeroDocumento: '20603030045', razonSocial: 'JPSYSTEMS S.A.C.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20515381024', razonSocial: 'YACHAY TELECOMUNICACIONES SAC' },
    { tipoDocumento: 'RUC', numeroDocumento: '20565816269', razonSocial: 'Centinela Sistemas de Seguridad SAC' },
    { tipoDocumento: 'RUC', numeroDocumento: '20601011809', razonSocial: 'ISAM CONSULTING S.A.C.' },
    // Feb 2026 — nuevos
    { tipoDocumento: 'RUC', numeroDocumento: '10154091021', razonSocial: 'GONZALES VDA DE FERNANDEZ ENCARNACION ESMERALDA' },
    { tipoDocumento: 'RUC', numeroDocumento: '20100128056', razonSocial: 'SAGA FALABELLA S.A.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20613185161', razonSocial: 'LONG STORE S.A.C.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20612248908', razonSocial: 'ACTION BRANDS S.A.C.' },
    { tipoDocumento: 'RUC', numeroDocumento: '20610401032', razonSocial: 'INFOCOM BUSSINESS S.A.C.' },
  ]

  for (const p of parties) {
    await prisma.party.upsert({
      where: { tipoDocumento_numeroDocumento: { tipoDocumento: p.tipoDocumento, numeroDocumento: p.numeroDocumento } },
      update: {},
      create: p,
    })
  }
  console.log(`  ✓ ${parties.length} clientes/proveedores`)

  // ─── VENTAS ────────────────────────────────────────────
  const ventas: {
    y: number; m: number; dia: number
    serie: string; num: string
    ruc: string; razon: string
    bi: number; igv: number; total: number
    comp?: 'BOLETA'
    sub?: 'SAAS' | 'PRODUCTO'
    obs?: string
  }[] = [
    // ── 2025 ──
    { y: 2025, m: 1,  dia: 5,  serie: 'F001', num: '63', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 1,  dia: 28, serie: 'F001', num: '64', ruc: '20162086716', razon: 'DIRECCION REGIONAL DE SALUD DE LIMA',    bi: 84.75,  igv: 15.25,  total: 100 },
    { y: 2025, m: 3,  dia: 3,  serie: 'F001', num: '66', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 4,  dia: 1,  serie: 'F001', num: '67', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 4,  dia: 7,  serie: 'F001', num: '68', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 5,  dia: 3,  serie: 'F001', num: '69', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 6,  dia: 3,  serie: 'F001', num: '71', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 6,  dia: 3,  serie: 'F001', num: '72', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 6,  dia: 24, serie: 'B001', num: '28', ruc: '41774206',    razon: 'CLIENTE PARTICULAR',                    bi: 33.90,  igv: 6.10,   total: 40, comp: 'BOLETA' },
    { y: 2025, m: 7,  dia: 2,  serie: 'F001', num: '74', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 7,  dia: 2,  serie: 'F001', num: '73', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 8,  dia: 5,  serie: 'F001', num: '76', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 8,  dia: 5,  serie: 'F001', num: '75', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 9,  dia: 1,  serie: 'F001', num: '77', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 9,  dia: 1,  serie: 'F001', num: '78', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 10, dia: 7,  serie: 'F001', num: '79', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 10, dia: 7,  serie: 'F001', num: '80', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',           bi: 63.56,  igv: 11.44,  total: 75 },
    { y: 2025, m: 11, dia: 5,  serie: 'F001', num: '82', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    { y: 2025, m: 12, dia: 11, serie: 'F001', num: '84', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                bi: 55.08,  igv: 9.92,   total: 65 },
    // ── 2026 Enero ──
    { y: 2026, m: 1,  dia: 4,  serie: 'F001', num: '87', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',                          bi: 63.56,   igv: 11.44,  total: 75 },
    { y: 2026, m: 1,  dia: 4,  serie: 'F001', num: '86', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                                bi: 55.08,   igv: 9.92,   total: 65 },
    // ── 2026 Febrero ──
    { y: 2026, m: 2,  dia: 2,  serie: 'F001', num: '88', ruc: '10154091021', razon: 'GONZALES VDA DE FERNANDEZ ENCARNACION ESMERALDA',       bi: 3769.19, igv: 678.45, total: 4447.64, sub: 'PRODUCTO' as const, obs: 'Venta de cámaras e instalación' },
    { y: 2026, m: 2,  dia: 6,  serie: 'F001', num: '90', ruc: '10760791259', razon: 'YATACO ORE ESTEFANI CELESTE',                          bi: 63.56,   igv: 11.44,  total: 75 },
    { y: 2026, m: 2,  dia: 6,  serie: 'F001', num: '89', ruc: '20607431419', razon: 'MAGIC CRAFTS E.I.R.L.',                                bi: 55.08,   igv: 9.92,   total: 65 },
  ]

  for (const v of ventas) {
    await prisma.voucher.create({
      data: {
        year: v.y, month: v.m,
        fecha: new Date(v.y, v.m - 1, v.dia),
        tipoMovimiento: 'VENTA',
        tipoComprobante: v.comp ?? 'FACTURA',
        serie: v.serie, numero: v.num,
        rucDni: v.ruc, razonSocial: v.razon,
        afectoIgv: true,
        importeTotal: v.total, baseImponible: v.bi, igv: v.igv,
        destinoTributario: 'VENTA',
        subcategoria: v.sub ?? 'SAAS',
        deducibleIr: true,
        creditoFiscalIgv: false,
        observacion: v.obs ?? null,
      },
    })
  }
  console.log(`  ✓ ${ventas.length} ventas (${ventas.filter(v => v.y === 2025).length} de 2025, ${ventas.filter(v => v.y === 2026).length} de 2026)`)

  // ─── COMPRAS ───────────────────────────────────────────
  type Dest = 'GASTO_ADMIN' | 'COSTO_VENTAS' | 'NO_DEDUCIBLE'
  type Sub = 'OTRO' | 'UTILES' | 'FLETE' | 'MOVILIDAD' | 'EQUIPO_PRUEBAS' | 'SERVIDOR' | 'PRODUCTO'

  const compras: {
    y: number; m: number; dia: number
    serie: string; num: string
    ruc: string; razon: string
    bi: number; igv: number; total: number
    dest: Dest; sub: Sub
    obs?: string
  }[] = [
    // ── Ene 2025 ──
    // Cia Inversiones Americanas — ropa, gasto admin
    { y: 2025, m: 1,  dia: 25, serie: 'FS01', num: '3269',   ruc: '20606062339', razon: 'COMPAÑIA DE INVERSIONES AMERICANAS SOCIEDAD ANONIMA CERRADA', bi: 84.75,  igv: 15.25, total: 100,    dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Grupo Corporaciones Peruanas — ropa, gasto admin
    { y: 2025, m: 1,  dia: 31, serie: 'FFI2', num: '8644',   ruc: '20523612141', razon: 'GRUPO DE CORPORACIONES PERUANAS ASOCIADAS SOCIEDAD ANONIMA CERRADA', bi: 12.71, igv: 2.29, total: 15, dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },

    // ── Feb 2025 ──
    // Tai Loy — útiles de escritorio
    { y: 2025, m: 2,  dia: 28, serie: 'F310', num: '94362',  ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 152.83, igv: 27.51, total: 180.34, dest: 'GASTO_ADMIN', sub: 'UTILES' },

    // ── Abr 2025 ──
    // En 1 Clic — repuesto para computadoras
    { y: 2025, m: 4,  dia: 12, serie: 'FB01', num: '9583',   ruc: '20550442010', razon: 'EN 1 CLIC S.A.C.',                   bi: 148.31, igv: 26.69, total: 175,    dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Repuesto para computadoras' },

    // ── May 2025 ──
    // Tai Loy — útiles
    { y: 2025, m: 5,  dia: 3,  serie: 'F310', num: '96267',  ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 15.93,  igv: 2.87,  total: 18.80,  dest: 'GASTO_ADMIN', sub: 'UTILES' },
    // Tiendas Mejoramiento del Hogar — uso personal, NO deducible
    { y: 2025, m: 5,  dia: 3,  serie: 'F809', num: '29642',  ruc: '20112273922', razon: 'TIENDAS DEL MEJORAMIENTO DEL HOGAR S.A.', bi: 12.71, igv: 2.29, total: 15,   dest: 'NO_DEDUCIBLE', sub: 'OTRO',          obs: 'Mejoramiento del hogar - uso personal' },

    // ── Jun 2025 ──
    // Cia Inversiones Americanas — ropa
    { y: 2025, m: 6,  dia: 11, serie: 'FS01', num: '3943',   ruc: '20606062339', razon: 'COMPAÑIA DE INVERSIONES AMERICANAS SOCIEDAD ANONIMA CERRADA', bi: 23.73, igv: 4.27, total: 28,      dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Shalom — flete
    { y: 2025, m: 6,  dia: 18, serie: 'F282', num: '24424',  ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 13.56,  igv: 2.44,  total: 16,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    { y: 2025, m: 6,  dia: 18, serie: 'F820', num: '5296',   ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 6.78,   igv: 1.22,  total: 8,      dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // Cia Inversiones Americanas — ropa
    { y: 2025, m: 6,  dia: 19, serie: 'FS01', num: '3998',   ruc: '20606062339', razon: 'COMPAÑIA DE INVERSIONES AMERICANAS SOCIEDAD ANONIMA CERRADA', bi: 6.78, igv: 1.22, total: 8,        dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },

    // ── Ago 2025 ──
    // Shalom — flete
    { y: 2025, m: 8,  dia: 25, serie: 'F243', num: '239938', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 10.17,  igv: 1.83,  total: 12,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },

    // ── Sep 2025 ──
    // Grupo Corporaciones Peruanas — ropa
    { y: 2025, m: 9,  dia: 1,  serie: 'FFI2', num: '9789',   ruc: '20523612141', razon: 'GRUPO DE CORPORACIONES PERUANAS ASOCIADAS SOCIEDAD ANONIMA CERRADA', bi: 25.42, igv: 4.58, total: 30, dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Liderman — parqueo de moto
    { y: 2025, m: 9,  dia: 11, serie: 'F624', num: '110',    ruc: '20601355761', razon: 'Liderman Servicios SAC',              bi: 5.08,   igv: 0.92,  total: 6,      dest: 'GASTO_ADMIN', sub: 'MOVILIDAD',      obs: 'Parqueo de moto' },
    // Tai Loy — útiles
    { y: 2025, m: 9,  dia: 20, serie: 'F310', num: '99743',  ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 8.47,   igv: 1.53,  total: 10,     dest: 'GASTO_ADMIN', sub: 'UTILES' },
    { y: 2025, m: 9,  dia: 21, serie: 'F310', num: '99759',  ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 6.77,   igv: 1.23,  total: 8,      dest: 'GASTO_ADMIN', sub: 'UTILES' },

    // ── Oct 2025 ──
    // Shalom — flete
    { y: 2025, m: 10, dia: 23, serie: 'F205', num: '132634', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 11.86,  igv: 2.14,  total: 14,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    { y: 2025, m: 10, dia: 28, serie: 'F205', num: '132828', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 11.86,  igv: 2.14,  total: 14,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // Grupo Corporaciones Peruanas — ropa
    { y: 2025, m: 10, dia: 28, serie: 'FFI2', num: '10095',  ruc: '20523612141', razon: 'GRUPO DE CORPORACIONES PERUANAS ASOCIADAS SOCIEDAD ANONIMA CERRADA', bi: 59.32, igv: 10.68, total: 70, dest: 'GASTO_ADMIN', sub: 'OTRO',          obs: 'Ropa - gasto administrativo' },

    // ── Nov 2025 ──
    // Tai Loy — útiles
    { y: 2025, m: 11, dia: 15, serie: 'F310', num: '101125', ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 5.59,   igv: 1.01,  total: 6.60,   dest: 'GASTO_ADMIN', sub: 'UTILES' },
    { y: 2025, m: 11, dia: 22, serie: 'F310', num: '101309', ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 16.61,  igv: 2.99,  total: 19.60,  dest: 'GASTO_ADMIN', sub: 'UTILES' },

    // ── Dic 2025 ──
    // Shalom — flete
    { y: 2025, m: 12, dia: 1,  serie: 'F204', num: '447953', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 11.86,  igv: 2.14,  total: 14,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // JPSystems — ticketera para pruebas
    { y: 2025, m: 12, dia: 10, serie: 'FPP3', num: '1521',   ruc: '20603030045', razon: 'JPSYSTEMS S.A.C.',                    bi: 182.20, igv: 32.80, total: 215,    dest: 'GASTO_ADMIN', sub: 'EQUIPO_PRUEBAS', obs: 'Ticketera para pruebas de sistemas' },
    // Shalom — flete
    { y: 2025, m: 12, dia: 12, serie: 'F204', num: '450229', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 11.02,  igv: 1.98,  total: 13,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    { y: 2025, m: 12, dia: 12, serie: 'F204', num: '450231', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 6.78,   igv: 1.22,  total: 8,      dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // JPSystems — lector código de barra para pruebas
    { y: 2025, m: 12, dia: 15, serie: 'FPP1', num: '7096',   ruc: '20603030045', razon: 'JPSYSTEMS S.A.C.',                    bi: 305.00, igv: 54.90, total: 359.90, dest: 'GASTO_ADMIN', sub: 'EQUIPO_PRUEBAS', obs: 'Lector de código de barra para pruebas de sistemas' },
    // Yachay — alquiler de servidor
    { y: 2025, m: 12, dia: 16, serie: 'FYEL', num: '13545',  ruc: '20515381024', razon: 'YACHAY TELECOMUNICACIONES SAC',       bi: 508.47, igv: 91.53, total: 600,    dest: 'GASTO_ADMIN', sub: 'SERVIDOR',       obs: 'Alquiler de servidor para despliegue de aplicaciones' },

    // ── Ene 2026 ──
    // Centinela — cámaras, NVR, SSD, cable UTP para venta
    { y: 2026, m: 1,  dia: 20, serie: 'F001', num: '7741',   ruc: '20565816269', razon: 'Centinela Sistemas de Seguridad SAC', bi: 902.37, igv: 162.43, total: 1064.80, dest: 'COSTO_VENTAS', sub: 'PRODUCTO',     obs: 'Cámaras, NVR, SSD, cable UTP para venta' },
    // ISAM — cámaras, NVR, SSD, cable UTP para venta
    { y: 2026, m: 1,  dia: 21, serie: 'F003', num: '2003',   ruc: '20601011809', razon: 'ISAM CONSULTING S.A.C.',              bi: 426.69, igv: 76.81, total: 503.50,  dest: 'COSTO_VENTAS', sub: 'PRODUCTO',     obs: 'Cámaras, NVR, SSD, cable UTP para venta' },
    // Shalom — flete
    { y: 2026, m: 1,  dia: 23, serie: 'F849', num: '2862',   ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 11.86,  igv: 2.14,  total: 14,     dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // Grupo Corporaciones Peruanas — ropa
    { y: 2026, m: 1,  dia: 24, serie: 'FFI2', num: '10520',  ruc: '20523612141', razon: 'GRUPO DE CORPORACIONES PERUANAS ASOCIADAS SOCIEDAD ANONIMA CERRADA', bi: 21.19, igv: 3.81, total: 25,  dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Centinela — más equipo para venta
    { y: 2026, m: 1,  dia: 26, serie: 'F001', num: '7767',   ruc: '20565816269', razon: 'Centinela Sistemas de Seguridad SAC', bi: 195.34, igv: 35.16, total: 230.50,  dest: 'COSTO_VENTAS', sub: 'PRODUCTO',     obs: 'Cámaras y accesorios para venta' },
    // Shalom — flete
    { y: 2026, m: 1,  dia: 27, serie: 'F243', num: '253651', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 10.17,  igv: 1.83,  total: 12,      dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },

    // ── Feb 2026 ──
    // Saga Falabella — ropa (gasto admin)
    { y: 2026, m: 2,  dia: 4,  serie: 'FBAR', num: '4522',   ruc: '20100128056', razon: 'SAGA FALABELLA S.A.',                 bi: 144.71, igv: 26.04, total: 170.75,  dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Long Store — ropa
    { y: 2026, m: 2,  dia: 5,  serie: 'FX02', num: '331',    ruc: '20613185161', razon: 'LONG STORE S.A.C.',                   bi: 53.31,  igv: 9.59,  total: 62.90,   dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // Action Brands — ropa
    { y: 2026, m: 2,  dia: 5,  serie: 'F052', num: '83',     ruc: '20612248908', razon: 'ACTION BRANDS S.A.C.',                bi: 135.42, igv: 24.38, total: 159.80,  dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
    // En 1 Clic — teclado repuesto computadora
    { y: 2026, m: 2,  dia: 9,  serie: 'FB01', num: '17921',  ruc: '20550442010', razon: 'EN 1 CLIC S.A.C.',                   bi: 101.69, igv: 18.31, total: 120,     dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Teclado - repuesto para computadora' },
    // Tai Loy — útiles de escritorio
    { y: 2026, m: 2,  dia: 9,  serie: 'F310', num: '103554', ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 242.03, igv: 43.57, total: 285.60,  dest: 'GASTO_ADMIN', sub: 'UTILES',         obs: 'Útiles de escritorio' },
    // Infocom — antena wifi 2km (equipamiento de conexión)
    { y: 2026, m: 2,  dia: 11, serie: 'F002', num: '7397',   ruc: '20610401032', razon: 'INFOCOM BUSSINESS S.A.C.',            bi: 306.10, igv: 55.10, total: 361.20,  dest: 'GASTO_ADMIN', sub: 'INTERNET',       obs: 'Antena wifi para conexión 2km' },
    // Shalom — flete
    { y: 2026, m: 2,  dia: 21, serie: 'F205', num: '138039', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 8.47,   igv: 1.53,  total: 10,      dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // Tai Loy — útiles de escritorio
    { y: 2026, m: 2,  dia: 24, serie: 'F310', num: '104018', ruc: '20100049181', razon: 'TAI LOY S.A.',                       bi: 22.88,  igv: 4.12,  total: 27,      dest: 'GASTO_ADMIN', sub: 'UTILES',         obs: 'Útiles de escritorio' },
    // Centinela — cámaras de seguridad para venta
    { y: 2026, m: 2,  dia: 26, serie: 'F001', num: '7959',   ruc: '20565816269', razon: 'Centinela Sistemas de Seguridad SAC', bi: 173.06, igv: 31.15, total: 204.21,  dest: 'COSTO_VENTAS', sub: 'PRODUCTO',      obs: 'Cámaras de seguridad para venta' },
    // Shalom — flete
    { y: 2026, m: 2,  dia: 27, serie: 'F243', num: '256095', ruc: '20512528458', razon: 'SHALOM EMPRESARIAL S.A.C.',           bi: 8.47,   igv: 1.53,  total: 10,      dest: 'GASTO_ADMIN', sub: 'FLETE',          obs: 'Flete de mercadería' },
    // Saga Falabella — ropa (segunda compra)
    { y: 2026, m: 2,  dia: 27, serie: 'FFWH', num: '675',    ruc: '20100128056', razon: 'SAGA FALABELLA S.A.',                 bi: 33.81,  igv: 6.09,  total: 39.90,   dest: 'GASTO_ADMIN', sub: 'OTRO',           obs: 'Ropa - gasto administrativo' },
  ]

  for (const c of compras) {
    const noDeducible = c.dest === 'NO_DEDUCIBLE'
    await prisma.voucher.create({
      data: {
        year: c.y, month: c.m,
        fecha: new Date(c.y, c.m - 1, c.dia),
        tipoMovimiento: 'COMPRA',
        tipoComprobante: 'FACTURA',
        serie: c.serie, numero: c.num,
        rucDni: c.ruc, razonSocial: c.razon,
        afectoIgv: true,
        importeTotal: c.total, baseImponible: c.bi, igv: c.igv,
        destinoTributario: c.dest,
        subcategoria: c.sub,
        deducibleIr: !noDeducible,
        creditoFiscalIgv: !noDeducible,
        observacion: c.obs ?? null,
      },
    })
  }
  console.log(`  ✓ ${compras.length} compras (${compras.filter(c => c.y === 2025).length} de 2025, ${compras.filter(c => c.y === 2026).length} de 2026)`)

  // ─── Activos de inventario ─────────────────────────────
  // Equipos de prueba (JPSystems) — no son para venta
  await prisma.inventoryAsset.create({
    data: {
      year: 2025, fecha: new Date(2025, 11, 10),
      comprobante: 'FPP3-1521',
      descripcion: 'Ticketera térmica para pruebas de sistema POS',
      categoria: 'TICKETERA',
      base: 182.20, igv: 32.80, total: 215,
      destinoTributario: 'GASTO_ADMIN',
      estadoCierre: 'EN_USO',
    },
  })
  await prisma.inventoryAsset.create({
    data: {
      year: 2025, fecha: new Date(2025, 11, 15),
      comprobante: 'FPP1-7096',
      descripcion: 'Lector de código de barra para pruebas de sistema POS',
      categoria: 'LECTOR',
      base: 305.00, igv: 54.90, total: 359.90,
      destinoTributario: 'GASTO_ADMIN',
      estadoCierre: 'EN_USO',
    },
  })
  // Mercadería para venta (Centinela / ISAM)
  await prisma.inventoryAsset.create({
    data: {
      year: 2026, fecha: new Date(2026, 0, 20),
      comprobante: 'F001-7741',
      descripcion: 'Cámaras, NVR, SSD, cable UTP (Centinela)',
      categoria: 'CAMARA',
      base: 902.37, igv: 162.43, total: 1064.80,
      destinoTributario: 'COSTO_VENTAS',
      estadoCierre: 'EN_USO',
    },
  })
  await prisma.inventoryAsset.create({
    data: {
      year: 2026, fecha: new Date(2026, 0, 21),
      comprobante: 'F003-2003',
      descripcion: 'Cámaras, NVR, SSD, cable UTP (ISAM)',
      categoria: 'CAMARA',
      base: 426.69, igv: 76.81, total: 503.50,
      destinoTributario: 'COSTO_VENTAS',
      estadoCierre: 'EN_USO',
    },
  })
  await prisma.inventoryAsset.create({
    data: {
      year: 2026, fecha: new Date(2026, 0, 26),
      comprobante: 'F001-7767',
      descripcion: 'Cámaras y accesorios de seguridad (Centinela)',
      categoria: 'CAMARA',
      base: 195.34, igv: 35.16, total: 230.50,
      destinoTributario: 'COSTO_VENTAS',
      estadoCierre: 'EN_USO',
    },
  })
  // Feb 2026 — cámaras para venta (Centinela)
  await prisma.inventoryAsset.create({
    data: {
      year: 2026, fecha: new Date(2026, 1, 26),
      comprobante: 'F001-7959',
      descripcion: 'Cámaras de seguridad para venta (Centinela)',
      categoria: 'CAMARA',
      base: 173.06, igv: 31.15, total: 204.21,
      destinoTributario: 'COSTO_VENTAS',
      estadoCierre: 'EN_USO',
    },
  })
  console.log('  ✓ 6 activos de inventario')

  console.log('\n✅ Seed completado con datos reales!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
