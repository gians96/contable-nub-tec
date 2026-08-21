import { basePrisma } from '../../../database/client'

const ESTADOS = new Set(['ACTIVA', 'SUSPENDIDA'])
const PLANES = new Set(['FREE', 'PRO'])

/** Suspender, reactivar o cambiar el plan y los cupos de una empresa. */
export default defineEventHandler(async (event) => {
  requirePlatformAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const company = await basePrisma.company.findUnique({ where: { id } })
  if (!company) {
    throw createError({ statusCode: 404, message: 'Empresa no encontrada' })
  }

  const data: Record<string, unknown> = {}

  if (body?.estado != null) {
    if (!ESTADOS.has(body.estado)) throw createError({ statusCode: 400, message: 'Estado no válido' })
    data.estado = body.estado
  }

  if (body?.plan != null) {
    if (!PLANES.has(body.plan)) throw createError({ statusCode: 400, message: 'Plan no válido' })
    data.plan = body.plan
    // Cambiar de plan reajusta los cupos, salvo que vengan explícitos.
    const cupos = CUPOS_POR_PLAN[body.plan as 'FREE' | 'PRO']
    data.limiteVouchersAnual = cupos.vouchersAnual
    data.limiteUsuarios = cupos.usuarios
  }

  if ('limiteVouchersAnual' in (body ?? {})) {
    data.limiteVouchersAnual = body.limiteVouchersAnual == null || body.limiteVouchersAnual === ''
      ? null
      : Number(body.limiteVouchersAnual)
  }
  if ('limiteUsuarios' in (body ?? {})) {
    data.limiteUsuarios = body.limiteUsuarios == null || body.limiteUsuarios === ''
      ? null
      : Number(body.limiteUsuarios)
  }

  const actualizada = await basePrisma.company.update({ where: { id }, data })

  return actualizada
})
