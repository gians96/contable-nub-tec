import { basePrisma } from '../../database/client'

/**
 * Fija la empresa activa.
 *
 * Uno de los tres únicos sitios donde se escribe `cp_company`: el middleware no
 * puede hacerlo porque en SSR su Set-Cookie no llega al navegador.
 */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)
  const body = await readBody(event)
  const companyId = Number(body?.companyId)

  if (!companyId) {
    throw createError({ statusCode: 400, message: 'Falta la empresa' })
  }

  const membership = await basePrisma.membership.findFirst({
    where: { userId: user.id, companyId, activo: true },
    include: { company: true },
  })

  // Un superadmin puede entrar a cualquier empresa aunque no sea miembro.
  const company = membership?.company
    ?? (user.platformRole === 'SUPERADMIN'
      ? await basePrisma.company.findUnique({ where: { id: companyId } })
      : null)

  if (!company) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a esa empresa' })
  }

  setCookie(event, 'cp_company', String(company.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { id: company.id, razonSocial: company.razonSocial }
})
