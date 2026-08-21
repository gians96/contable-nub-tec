export interface SessionUser {
  id: number
  username: string
  nombre: string | null
  role: 'ADMIN' | 'USUARIO'
  activo: boolean
}

/**
 * Sesión del usuario. Única fuente de verdad: el middleware global la rellena en
 * cada navegación y el layout la consume, en vez de hacer cada uno su propio
 * `useFetch('/api/auth/me')`.
 */
export function useAuth() {
  const user = useState<SessionUser | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  const iniciales = computed(() => {
    const fuente = user.value?.nombre || user.value?.username || ''
    const partes = fuente.trim().split(/\s+/).filter(Boolean)
    if (partes.length === 0) return '?'
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
    return (partes[0][0] + partes[1][0]).toUpperCase()
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

  return { user, isAuthenticated, isAdmin, iniciales, checkAuth, login, logout }
}
