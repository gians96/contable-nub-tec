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

  const closure = await prisma.annualClosure.upsert({
    where: { year: Number(year) },
    update: cambios,
    create: { year: Number(year), ...defaults, ...cambios },
  })

  return closure
})
