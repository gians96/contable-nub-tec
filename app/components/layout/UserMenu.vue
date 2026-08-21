<template>
  <div ref="contenedor" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
      :aria-expanded="abierto"
      aria-haspopup="menu"
      @click="abierto = !abierto"
    >
      <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {{ iniciales }}
      </span>
      <span class="hidden max-w-[10rem] truncate text-sm font-medium text-content-soft sm:inline">
        {{ user?.nombre || user?.username }}
      </span>
      <svg
        class="h-4 w-4 shrink-0 text-content-muted transition-transform"
        :class="abierto ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
      </svg>
    </button>

    <div v-if="abierto" class="menu-surface absolute right-0 z-50 mt-2 w-64" role="menu">
      <div class="border-b border-line px-3 pb-3 pt-2">
        <p class="truncate text-sm font-semibold text-content">{{ user?.nombre || user?.username }}</p>
        <div class="mt-1 flex items-center gap-2">
          <span class="truncate text-xs text-content-muted">&#64;{{ user?.username }}</span>
          <UiBadge :variant="isAdmin ? 'blue' : 'gray'">{{ isAdmin ? 'Administrador' : 'Usuario' }}</UiBadge>
        </div>
      </div>

      <div class="border-b border-line px-3 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Tema</p>
        <div class="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
          <button
            v-for="opcion in opciones"
            :key="opcion.value"
            type="button"
            class="rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
            :class="mode === opcion.value
              ? 'bg-surface text-content shadow-sm'
              : 'text-content-muted hover:text-content'"
            @click="setTheme(opcion.value)"
          >
            <span aria-hidden="true">{{ opcion.icon }}</span>
            <span class="ml-1">{{ opcion.label }}</span>
          </button>
        </div>
      </div>

      <div class="pt-1.5">
        <button type="button" class="menu-item" role="menuitem" @click="abrirPassword">
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" />
          </svg>
          Cambiar contraseña
        </button>

        <NuxtLink
          v-if="isAdmin"
          to="/configuracion#usuarios"
          class="menu-item"
          role="menuitem"
          @click="abierto = false"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a3 3 0 00-5.36-1.9M9 20H4v-2a3 3 0 015.36-1.9M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Gestión de usuarios
        </NuxtLink>

        <button
          type="button"
          class="menu-item text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
          role="menuitem"
          @click="salir"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>

    <LayoutChangePasswordModal v-model="mostrarPassword" />
  </div>
</template>

<script setup lang="ts">
const { user, isAdmin, iniciales, logout } = useAuth()
const { mode, setTheme, opciones } = useTheme()

const abierto = ref(false)
const mostrarPassword = ref(false)
const contenedor = ref<HTMLElement | null>(null)

function abrirPassword() {
  abierto.value = false
  mostrarPassword.value = true
}

async function salir() {
  abierto.value = false
  await logout()
}

// Mismo patrón de click-fuera que ya usa el selector de columnas de /resumen-mensual.
function onClickFuera(e: MouseEvent) {
  if (!abierto.value) return
  if (contenedor.value && !contenedor.value.contains(e.target as Node)) abierto.value = false
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') abierto.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickFuera)
  document.addEventListener('keydown', onEscape)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickFuera)
  document.removeEventListener('keydown', onEscape)
})
</script>
