
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { year } = body

  if (!year) {
    throw createError({ statusCode: 400, message: 'Año es obligatorio' })
  }

  const closure = await prisma.annualClosure.upsert({
    where: { year: Number(year) },
    update: {
      descuentos: body.descuentos != null ? Number(body.descuentos) : 0,
      otrosIngresos: body.otrosIngresos != null ? Number(body.otrosIngresos) : 0,
      otrosGastos: body.otrosGastos != null ? Number(body.otrosGastos) : 0,
      adiciones: body.adiciones != null ? Number(body.adiciones) : 0,
      deducciones: body.deducciones != null ? Number(body.deducciones) : 0,
      retenciones: body.retenciones != null ? Number(body.retenciones) : 0,
      saldoFavorAnterior: body.saldoFavorAnterior != null ? Number(body.saldoFavorAnterior) : 0,
      observaciones: body.observaciones || null,
    },
    create: {
      year: Number(year),
      descuentos: body.descuentos != null ? Number(body.descuentos) : 0,
      otrosIngresos: body.otrosIngresos != null ? Number(body.otrosIngresos) : 0,
      otrosGastos: body.otrosGastos != null ? Number(body.otrosGastos) : 0,
      adiciones: body.adiciones != null ? Number(body.adiciones) : 0,
      deducciones: body.deducciones != null ? Number(body.deducciones) : 0,
      retenciones: body.retenciones != null ? Number(body.retenciones) : 0,
      saldoFavorAnterior: body.saldoFavorAnterior != null ? Number(body.saldoFavorAnterior) : 0,
      observaciones: body.observaciones || null,
    },
  })

  return closure
})
