<template>
  <div ref="contenedor" class="relative min-w-0">
    <button
      type="button"
      class="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-muted"
      :aria-expanded="abierto"
      aria-haspopup="menu"
      @click="abierto = !abierto"
    >
      <span class="max-w-[10rem] truncate text-sm font-semibold text-content sm:max-w-xs" :title="titulo">
        {{ titulo }}
      </span>
      <UiBadge v-if="empresaActiva?.estado === 'SUSPENDIDA'" variant="red">Suspendida</UiBadge>
      <span
        v-else
        class="hidden shrink-0 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-content-muted sm:inline"
        :title="context?.regimenSpec?.descripcion"
      >
        {{ regimenLabel }}
      </span>
      <svg
        v-if="empresas.length > 1 || puedeCrear"
        class="h-4 w-4 shrink-0 text-content-muted transition-transform"
        :class="abierto ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
      </svg>
    </button>

    <Transition name="pop">
      <div v-if="abierto" class="menu-surface absolute left-0 z-50 mt-2 w-72 origin-top-left" role="menu">
        <p class="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-content-muted">
          Tus empresas
        </p>

        <div class="max-h-72 overflow-y-auto">
          <button
            v-for="empresa in empresas"
            :key="empresa.id"
            type="button"
            class="menu-item items-start"
            role="menuitem"
            @click="seleccionar(empresa.id)"
          >
            <span class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
              <svg v-if="empresa.id === empresaActiva?.id" class="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium text-content">{{ empresa.razonSocial }}</span>
              <span class="mt-0.5 flex items-center gap-1.5">
                <span class="text-xs text-content-muted">{{ NOMBRES_ROL[empresa.role] }}</span>
                <UiBadge v-if="empresa.estado === 'SUSPENDIDA'" variant="red">Suspendida</UiBadge>
              </span>
            </span>
          </button>
        </div>

        <div class="mt-1.5 border-t border-line pt-1.5">
          <NuxtLink to="/empresas" class="menu-item" role="menuitem" @click="abierto = false">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Crear o administrar empresas
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const { empresas, empresaActiva, cambiarEmpresa } = useAuth()
const { context, regimenLabel } = useAppContext()

const abierto = ref(false)
const contenedor = ref<HTMLElement | null>(null)
const puedeCrear = true

const titulo = computed(() =>
  empresaActiva.value?.razonSocial?.trim() || 'Sin empresa'
)

async function seleccionar(id: number) {
  abierto.value = false
  await cambiarEmpresa(id)
}

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
