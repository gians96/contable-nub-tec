/**
 * Guarda los campos manuales del cierre anual.
 *
 * El body es parcial por diseño: /cierre-anual envía un campo por vez. Antes el
 * update reescribía a 0 todo campo ausente, de modo que cada edición borraba las
 * otras seis.
 */

const CAMPOS_NUMERICOS = [
  'descuentos',
  'otrosIngresos',
  'otrosGastos',
  'adiciones',
  'deducciones',
  'retenciones',
  'saldoFavorAnterior',
] as const

export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const body = await readBody(event)
  const { year } = body

  if (!year) {
    throw createError({ statusCode: 400, message: 'Año es obligatorio' })
  }

  const cambios: Record<string, number | string | null> = {}

  for (const campo of CAMPOS_NUMERICOS) {
    const valor = body[campo]
    if (valor == null || valor === '') continue

    const numero = Number(valor)
    if (!Number.isFinite(numero)) {
      throw createError({ statusCode: 400, message: `${campo} debe ser un número válido` })
    }
    cambios[campo] = numero
  }

  if ('observaciones' in body) {
    cambios.observaciones = body.observaciones || null
  }

  const defaults = Object.fromEntries(CAMPOS_NUMERICOS.map(c => [c, 0]))

  const closure = await db.annualClosure.upsert({
    where: { companyId_year: { companyId: db.$companyId, year: Number(year) } },
    update: cambios,
    create: { companyId: db.$companyId, year: Number(year), ...defaults, ...cambios } as any,
  })

  await registrarAuditoria(event, 'ACTUALIZAR', 'AnnualClosure', closure.id, `Cierre ${year}`)

  return closure
})
