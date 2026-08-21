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

    <Transition name="pop">
      <div v-if="abierto" class="menu-surface absolute right-0 z-50 mt-2 w-64 origin-top-right" role="menu">
      <div class="border-b border-line px-3 pb-3 pt-2">
        <p class="truncate text-sm font-semibold text-content">{{ user?.nombre || user?.username }}</p>
        <p class="mt-0.5 truncate text-xs text-content-muted">
          &#64;{{ user?.username }}<template v-if="user?.email"> · {{ user.email }}</template>
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
          <UiBadge v-if="companyRole" :variant="isAdmin ? 'blue' : 'gray'">{{ NOMBRES_ROL[companyRole] }}</UiBadge>
          <UiBadge v-if="isSuperadmin" variant="purple">Superadmin</UiBadge>
        </div>
      </div>

      <div class="border-b border-line px-3 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Tema</p>
        <div class="grid grid-cols-3 gap-1 rounded-lg border border-line bg-surface-muted p-1">
          <button
            v-for="opcion in opciones"
            :key="opcion.value"
            type="button"
            class="flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-medium leading-none transition-colors"
            :class="mode === opcion.value
              ? 'bg-surface text-content shadow-sm ring-1 ring-line'
              : 'text-content-muted hover:bg-surface/60 hover:text-content'"
            :aria-pressed="mode === opcion.value"
            @click="setTheme(opcion.value)"
          >
            <svg v-if="opcion.value === 'light'" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path stroke-linecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
            <svg v-else-if="opcion.value === 'dark'" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="13" rx="2" />
              <path stroke-linecap="round" d="M8 21h8m-4-4v4" />
            </svg>
            {{ opcion.label }}
          </button>
        </div>
      </div>

      <div class="pt-1.5">
        <button type="button" class="menu-item" role="menuitem" @click="abrirCuenta">
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0116 0v1" />
          </svg>
          Mi cuenta
          <span v-if="user?.debeCambiarPassword" class="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        </button>

        <NuxtLink to="/empresas" class="menu-item" role="menuitem" @click="abierto = false">
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01" />
          </svg>
          Cambiar de empresa
        </NuxtLink>

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
          Miembros de la empresa
        </NuxtLink>

        <NuxtLink
          v-if="isSuperadmin"
          to="/plataforma"
          class="menu-item"
          role="menuitem"
          @click="abierto = false"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="6" rx="2" /><rect x="2" y="14" width="20" height="6" rx="2" />
          </svg>
          Panel de plataforma
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
    </Transition>

    <LayoutAccountModal v-model="mostrarCuenta" />
  </div>
</template>

<script setup lang="ts">
const { user, isAdmin, isSuperadmin, companyRole, iniciales, logout } = useAuth()
const { mode, setTheme, opciones } = useTheme()

const abierto = ref(false)
const mostrarCuenta = ref(false)
const contenedor = ref<HTMLElement | null>(null)

function abrirCuenta() {
  abierto.value = false
  mostrarCuenta.value = true
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
