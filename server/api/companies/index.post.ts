import { basePrisma } from '../../database/client'

/**
 * Alta de empresa en autoservicio: quien la crea queda como propietario.
 *
 * No exige empresa activa a propósito — es justo lo que hace un usuario recién
 * llegado que todavía no pertenece a ninguna.
 */
export default defineEventHandler(async (event) => {
  const user = currentUser(event)
  const body = await readBody(event)

  const ruc = String(body?.ruc ?? '').trim()
  const razonSocial = String(body?.razonSocial ?? '').trim()

  if (!razonSocial) {
    throw createError({ statusCode: 400, message: 'La razón social es obligatoria' })
  }
  if (ruc && !/^\d{11}$/.test(ruc)) {
    throw createError({ statusCode: 400, message: 'El RUC debe tener 11 dígitos' })
  }

  if (ruc) {
    const repetida = await basePrisma.company.findFirst({ where: { ruc } })
    if (repetida) {
      throw createError({ statusCode: 409, message: `Ya existe una empresa registrada con el RUC ${ruc}` })
    }
  }

  const cupos = CUPOS_POR_PLAN.FREE

  const company = await basePrisma.company.create({
    data: {
      ruc,
      razonSocial,
      nombreComercial: body?.nombreComercial?.trim() || null,
      direccion: body?.direccion?.trim() || null,
      limiteVouchersAnual: cupos.vouchersAnual,
      limiteUsuarios: cupos.usuarios,
      memberships: {
        create: { userId: user.id, role: 'OWNER', activo: true },
      },
    },
  })

  // Se pasa a la empresa recién creada: aquí sí hay una respuesta que el
  // navegador ve, así que la cookie llega.
  setCookie(event, 'cp_company', String(company.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { id: company.id, razonSocial: company.razonSocial, ruc: company.ruc }
})
