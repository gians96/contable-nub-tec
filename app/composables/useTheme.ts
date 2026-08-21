export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Tema claro / oscuro / sistema.
 *
 * Se guarda en cookie y no en localStorage: así el servidor ya sabe el tema al
 * renderizar y el HTML sale con la clase puesta, sin el destello blanco de
 * aplicar el tema después de hidratar.
 */
export function useTheme() {
  const mode = useCookie<ThemeMode>('cp-theme', {
    default: () => 'system',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  // Solo el navegador conoce la preferencia del sistema.
  const systemPrefersDark = useState('theme-system-dark', () => false)

  const resolved = computed<'light' | 'dark'>(() => {
    if (mode.value === 'dark') return 'dark'
    if (mode.value === 'light') return 'light'
    return systemPrefersDark.value ? 'dark' : 'light'
  })

  function aplicar() {
    if (import.meta.server) return
    document.documentElement.classList.toggle('dark', resolved.value === 'dark')
  }

  function setTheme(nuevo: ThemeMode) {
    mode.value = nuevo
    aplicar()
  }

  if (import.meta.client) {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = media.matches

    const onChange = (e: MediaQueryListEvent) => {
      systemPrefersDark.value = e.matches
      if (mode.value === 'system') aplicar()
    }

    onMounted(() => {
      aplicar()
      media.addEventListener('change', onChange)
    })
    onUnmounted(() => media.removeEventListener('change', onChange))
  }

  const opciones: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Sistema' },
  ]

  return { mode, resolved, setTheme, opciones }
}
