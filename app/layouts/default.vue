<template>
  <div class="flex min-h-screen bg-surface-muted">
    <!-- Sidebar -->
    <LayoutSidebar
      :collapsed="sidebarCollapsed"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @navigate="onNavigate"
    />

    <!-- Overlay mobile -->
    <div
      v-if="!sidebarCollapsed && isMobile"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="sidebarCollapsed = true"
    />

    <!--
      El margen sigue a `sidebarCollapsed` y nunca al ancho real del aside: así,
      cuando el hover lo despliega, se dibuja por encima y el contenido no se mueve.
    -->
    <div
      class="flex min-h-screen flex-1 flex-col transition-all duration-300"
      :class="sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'"
    >
      <!-- Topbar -->
      <header class="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
        <button
          type="button"
          class="rounded-lg p-2 text-content-soft hover:bg-surface-muted lg:hidden"
          aria-label="Abrir menú"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="flex min-w-0 flex-1 items-center justify-center gap-2 lg:flex-none lg:justify-start">
          <span class="max-w-[14rem] truncate text-sm font-semibold text-content sm:max-w-sm" :title="titulo">
            {{ titulo }}
          </span>
          <span
            class="hidden shrink-0 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-content-muted sm:inline"
            :title="context?.regimenSpec?.descripcion"
          >
            {{ regimenLabel }}
          </span>
        </div>

        <LayoutUserMenu />
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const isMobile = useIsMobile()
const { context, titulo, regimenLabel } = useAppContext()

// Cookie y no ref local: el servidor la lee y el HTML sale ya con el margen
// correcto, sin el salto de layout al recargar con el menú colapsado.
const sidebarCollapsed = useCookie<boolean>('cp-sidebar-collapsed', {
  default: () => false,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
})

function onNavigate() {
  if (isMobile.value) sidebarCollapsed.value = true
}

watch(isMobile, (movil) => {
  if (movil) sidebarCollapsed.value = true
})
</script>
