import type { Company, CompanyRole, User } from '@prisma/client'
import type { TenantDb } from '../database/tenant'
import type { RequestCtx } from '../utils/tenant'

/**
 * Tipado de `event.context`.
 *
 * Va en `server/types/` porque `.nuxt/tsconfig.server.json` incluye
 * `../server/**` y lo recoge solo; un `.d.ts` en la raíz del proyecto no
 * entraría en el proyecto de TypeScript del servidor.
 *
 * Ojo: `H3EventContext` extiende `Record<string, any>`, así que esta ampliación
 * da tipo y autocompletado pero no detecta erratas — `event.context.dbb`
 * seguiría siendo `any`. Por eso el acceso va siempre por `requireDb(event)`.
 */
declare module 'h3' {
  interface H3EventContext {
    auth?: { userId: number; username: string }
    user?: User
    company?: Company
    membershipRole?: CompanyRole
    db?: TenantDb
    ctx?: RequestCtx
  }
}

export {}
