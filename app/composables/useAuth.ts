export type CompanyRole = 'OWNER' | 'ADMIN' | 'CONTADOR' | 'LECTOR'

export interface EmpresaDeSesion {
  id: number
  razonSocial: string
  ruc: string
  estado: 'ACTIVA' | 'SUSPENDIDA'
  role: CompanyRole
}

export interface SessionUser {
  id: number
  username: string
  email: string | null
  nombre: string | null
  debeCambiarPassword: boolean
  platformRole: 'SUPERADMIN' | 'USER'
  activo: boolean
  companyRole: CompanyRole | null
  company: { id: number; razonSocial: string; estado: string; plan: string } | null
  companies: EmpresaDeSesion[]
}

export const NOMBRES_ROL: Record<CompanyRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  CONTADOR: 'Contador',
  LECTOR: 'Solo lectura',
}

export const DESCRIPCION_ROL: Record<CompanyRole, string> = {
  OWNER: 'Manda en la empresa y puede transferirla o eliminarla.',
  ADMIN: 'Gestiona miembros y configuración, además de la contabilidad.',
  CONTADOR: 'Registra y edita comprobantes, cierres y pagos.',
  LECTOR: 'Consulta y exporta, sin modificar nada.',
}

/**
 * Sesión del usuario. Única fuente de verdad: el middleware global la rellena en
 * cada navegación y el layout la consume, en vez de hacer cada uno su propio
 * `useFetch('/api/auth/me')`.
 */
export function useAuth() {
  const user = useState<SessionUser | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)

  // El rol que manda para la interfaz es el de la EMPRESA activa, no uno global:
  // la misma persona puede ser propietaria de una y solo lectura en otra.
  const companyRole = computed(() => user.value?.companyRole ?? null)
  const isAdmin = computed(() => companyRole.value === 'OWNER' || companyRole.value === 'ADMIN')
  const isOwner = computed(() => companyRole.value === 'OWNER')
  const canWrite = computed(() => ['OWNER', 'ADMIN', 'CONTADOR'].includes(companyRole.value ?? ''))
  const isSuperadmin = computed(() => user.value?.platformRole === 'SUPERADMIN')

  const empresas = computed(() => user.value?.companies ?? [])
  const empresaActiva = computed(() => user.value?.company ?? null)
  const sinEmpresa = computed(() => isAuthenticated.value && !empresaActiva.value)

  const iniciales = computed(() => {
    const fuente = user.value?.nombre || user.value?.username || ''
    const [primera, segunda] = fuente.trim().split(/\s+/).filter(Boolean)
    if (!primera) return '?'
    if (!segunda) return primera.slice(0, 2).toUpperCase()
    return (primera[0]! + segunda[0]!).toUpperCase()
  })

  async function checkAuth() {
    try {
      user.value = await $fetch<SessionUser>('/api/auth/me')
    } catch {
      user.value = null
    }
    return user.value
  }

  async function login(username: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    await checkAuth()
    return result
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  /**
   * Cambia de empresa y recarga la aplicación.
   *
   * `useAsyncData` y `useFetch` cachean por clave, y tras el cambio todo ese
   * payload es de la empresa anterior. Invalidar caso por caso es frágil;
   * recargar deja el estado limpio de una vez.
   */
  async function cambiarEmpresa(companyId: number) {
    if (companyId === empresaActiva.value?.id) return
    await $fetch('/api/session/company', { method: 'POST', body: { companyId } })
    reloadNuxtApp({ persistState: false })
  }

  return {
    user,
    isAuthenticated,
    companyRole,
    isAdmin,
    isOwner,
    canWrite,
    isSuperadmin,
    empresas,
    empresaActiva,
    sinEmpresa,
    iniciales,
    checkAuth,
    login,
    logout,
    cambiarEmpresa,
  }
}
