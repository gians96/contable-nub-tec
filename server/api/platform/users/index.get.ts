import { basePrisma } from '../../../database/client'

/** Todos los usuarios de la plataforma. Solo superadmin. */
export default defineEventHandler(async (event) => {
  requirePlatformAdmin(event)

  const users = await basePrisma.user.findMany({
    orderBy: [{ platformRole: 'asc' }, { username: 'asc' }],
    include: { _count: { select: { memberships: true } } },
  })

  return users.map(u => ({ ...publicUser(u), empresas: u._count.memberships }))
})
