import type { H3Event } from 'h3'
import type { PlanEmpresa } from '@prisma/client'
import type { RequestCtx } from './tenant'

/**
 * Cupos por plan.
 *
 * Los límites viven en la propia empresa (`limiteVouchersAnual`,
 * `limiteUsuarios`) para que el superadmin pueda ajustarlos caso por caso; estos
 * son los valores por defecto que se aplican al crearla. `null` = sin límite.
 */
export const CUPOS_POR_PLAN: Record<PlanEmpresa, { vouchersAnual: number | null; usuarios: number | null }> = {
  FREE: { vouchersAnual: 300, usuarios: 3 },
  PRO: { vouchersAnual: null, usuarios: null },
}

export const NOMBRES_PLAN: Record<PlanEmpresa, string> = {
  FREE: 'Gratuito',
  PRO: 'Pro',
}

/** Comprobantes del año frente al cupo de la empresa. */
export async function assertCupoVouchers(
  event: H3Event,
  ctx: RequestCtx,
  year: number,
  aAgregar = 1
): Promise<void> {
  const limite = ctx.company.limiteVouchersAnual
  if (limite == null) return

  const usados = await ctx.db.voucher.count({ where: { year } })
  if (usados + aAgregar > limite) {
    throw createError({
      statusCode: 402,
      message: `Alcanzaste el límite de ${limite} comprobantes para ${year} en el plan ${NOMBRES_PLAN[ctx.company.plan]}.`,
      data: { code: 'LIMITE_VOUCHERS', limite, usados },
    })
  }
}

/** Miembros activos frente al cupo de la empresa. */
export async function assertCupoUsuarios(ctx: RequestCtx): Promise<void> {
  const limite = ctx.company.limiteUsuarios
  if (limite == null) return

  const usados = await ctx.db.membership.count({ where: { activo: true } })
  if (usados >= limite) {
    throw createError({
      statusCode: 402,
      message: `Alcanzaste el límite de ${limite} usuarios en el plan ${NOMBRES_PLAN[ctx.company.plan]}.`,
      data: { code: 'LIMITE_USUARIOS', limite, usados },
    })
  }
}

/** Uso actual, para pintarlo en Configuración y en el panel de plataforma. */
export async function usoDeLaEmpresa(ctx: RequestCtx, year: number) {
  const [vouchers, usuarios] = await Promise.all([
    ctx.db.voucher.count({ where: { year } }),
    ctx.db.membership.count({ where: { activo: true } }),
  ])

  return {
    plan: ctx.company.plan,
    planLabel: NOMBRES_PLAN[ctx.company.plan],
    vouchers: { usados: vouchers, limite: ctx.company.limiteVouchersAnual },
    usuarios: { usados: usuarios, limite: ctx.company.limiteUsuarios },
  }
}
