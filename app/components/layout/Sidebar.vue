<template>
  <aside
    class="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-line bg-surface transition-all duration-300"
    :class="[
      expanded ? 'w-64 translate-x-0' : 'w-16 -translate-x-full lg:translate-x-0',
      overlay ? 'shadow-xl shadow-slate-900/15' : 'shadow-sm shadow-slate-900/5',
    ]"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onLeave"
  >
    <!-- Logo -->
    <div class="flex h-14 shrink-0 items-center border-b border-line px-4">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-md shadow-brand-600/25">
          <span class="text-sm font-bold text-white">CP</span>
        </div>
        <span v-if="expanded" class="truncate whitespace-nowrap font-semibold tracking-tight text-content">ContaPYME</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1 px-2">
        <li v-for="item in menuItems" :key="item.path">
          <NuxtLink
            :to="item.path"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="isActive(item.path)
              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-500/15 dark:text-brand-100 dark:ring-brand-500/30'
              : 'text-content-muted hover:bg-surface-muted hover:text-content'"
            :title="expanded ? undefined : item.label"
            :aria-label="item.label"
            @click="$emit('navigate')"
          >
            <span class="h-5 w-5 shrink-0" v-html="item.icon" />
            <span v-if="expanded" class="truncate whitespace-nowrap">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <!-- Collapse button (desktop) -->
    <button
      type="button"
      class="hidden h-12 items-center justify-center border-t border-line text-content-muted hover:bg-surface-muted hover:text-content lg:flex"
      :title="collapsed ? 'Fijar el menú abierto' : 'Colapsar el menú'"
      @click="$emit('toggle')"
    >
      <svg class="h-5 w-5 transition-transform" :class="collapsed ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{ collapsed: boolean }>()
// `toggle` = el usuario fija el estado desde el botón. `navigate` = siguió un link;
// solo el móvil debe cerrar el drawer, en desktop la navegación no toca el estado.
defineEmits<{ toggle: []; navigate: [] }>()

const route = useRoute()
const isMobile = useIsMobile()

// Estado efímero del hover. Vive aquí y no en el layout a propósito: el <main>
// se posiciona con `collapsed`, así que desplegar por hover no mueve la página.
const hovering = ref(false)
let cerrarTimer: ReturnType<typeof setTimeout> | null = null

const expanded = computed(() => !props.collapsed || (hovering.value && !isMobile.value))
const overlay = computed(() => props.collapsed && expanded.value)

function onEnter() {
  // Los navegadores táctiles emiten un mouseenter sintético al tocar.
  if (isMobile.value) return
  if (cerrarTimer) {
    clearTimeout(cerrarTimer)
    cerrarTimer = null
  }
  hovering.value = true
}

function onLeave() {
  if (isMobile.value) return
  // Pequeño retardo para que rozar el borde no produzca parpadeo.
  if (cerrarTimer) clearTimeout(cerrarTimer)
  cerrarTimer = setTimeout(() => {
    hovering.value = false
    cerrarTimer = null
  }, 120)
}

onUnmounted(() => {
  if (cerrarTimer) clearTimeout(cerrarTimer)
})

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
  { path: '/comprobantes', label: 'Comprobantes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' },
  { path: '/resumen-mensual', label: 'Resumen Mensual', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' },
  { path: '/cierre-anual', label: 'Cierre Anual IR', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7h6m-6 4h6m-6 4h4m-7 5h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>' },
  { path: '/inventario', label: 'Inventario y Activos', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>' },
  { path: '/configuracion', label: 'Configuración', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>' },
  { path: '/importar-exportar', label: 'Importar / Exportar', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>' },
  { path: '/ayuda', label: 'Ayuda Tributaria', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01"/></svg>' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
