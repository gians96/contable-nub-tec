/**
 * Composable para autenticación en el frontend.
 */
export function useAuth() {
  const user = useState<{ id: number; username: string } | null>('auth-user', () => null)
  const isAuthenticated = computed(() => !!user.value)

  async function checkAuth() {
    try {
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    }
  }

  async function login(username: string, password: string) {
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    user.value = result.user
    return result
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    navigateTo('/login')
  }

  return { user, isAuthenticated, checkAuth, login, logout }
}
