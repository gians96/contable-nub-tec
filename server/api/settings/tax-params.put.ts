/**
 * Guarda los parámetros tributarios de un año.
 *
 * El body puede ser parcial: solo se actualizan las claves presentes. Antes se
 * reescribía cada campo ausente con su default, así que guardar una sección de
 * /configuracion borraba silenciosamente las demás.
 */

const CAMPOS_NUMERICOS = [
  'igvPercent',
  'irMonthlyPercent',
  'uit',
  'irAnnualTramo1Limit',
  'irAnnualTramo1Rate',
  'irAnnualTramo2Rate',
  'irAnnualFlatRate',
  'rerRate',
  'pagoCuentaMinRate',
  'rmtUmbralUit',
  'rmtLimiteRegimenUit',
  'nrusCategoria',
  'nrusCuotaCat1',
  'nrusCuotaCat2',
  'nrusLimiteCat1',
  'nrusLimiteCat2',
] as const

const DEFAULTS: Record<(typeof CAMPOS_NUMERICOS)[number], number> = {
  igvPercent: 18,
  irMonthlyPercent: 1,
  uit: 5150,
  irAnnualTramo1Limit: 15,
  irAnnualTramo1Rate: 10,
  irAnnualTramo2Rate: 29.5,
  irAnnualFlatRate: 29.5,
  rerRate: 1.5,
  pagoCuentaMinRate: 1.5,
  rmtUmbralUit: 300,
  rmtLimiteRegimenUit: 1700,
  nrusCategoria: 1,
  nrusCuotaCat1: 20,
  nrusCuotaCat2: 50,
  nrusLimiteCat1: 5000,
  nrusLimiteCat2: 8000,
}

const REGIMENES_VALIDOS = new Set(['NRUS', 'RER', 'RMT', 'RG'])

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.year) {
    throw createError({ statusCode: 400, message: 'Año es obligatorio' })
  }

  const cambios: Record<string, unknown> = {}

  for (const campo of CAMPOS_NUMERICOS) {
    const valor = body[campo]
    if (valor == null || valor === '') continue

    const numero = Number(valor)
    if (!Number.isFinite(numero) || numero < 0) {
      throw createError({ statusCode: 400, message: `${campo} debe ser un número válido` })
    }
    cambios[campo] = numero
  }

  if (cambios.igvPercent != null && (cambios.igvPercent as number) > 100) {
    throw createError({ statusCode: 400, message: 'El IGV debe estar entre 0 y 100' })
  }

  if (body.regimen != null) {
    if (!REGIMENES_VALIDOS.has(body.regimen)) {
      throw createError({ statusCode: 400, message: 'Régimen tributario no válido' })
    }
    cambios.regimen = body.regimen
  }

  // Nullable a propósito: vaciar el campo devuelve el coeficiente al cálculo
  // automático desde el ejercicio anterior.
  if ('coeficienteManual' in body) {
    const valor = body.coeficienteManual
    cambios.coeficienteManual = valor == null || valor === '' ? null : Number(valor)
  }

  const params = await prisma.taxParameter.upsert({
    where: { year: Number(body.year) },
    update: cambios,
    create: { year: Number(body.year), ...DEFAULTS, ...cambios } as any,
  })

  return params
})
