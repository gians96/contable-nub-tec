/**
 * Ancho de viewport por debajo del breakpoint `lg` de Tailwind.
 * Lo necesitan a la vez el layout (margen del contenido) y el sidebar (hover).
 */
export function useIsMobile() {
  const isMobile = useState('is-mobile', () => false)

  function check() {
    isMobile.value = window.innerWidth < 1024
  }

  onMounted(() => {
    check()
    window.addEventListener('resize', check)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', check)
  })

  return isMobile
}
