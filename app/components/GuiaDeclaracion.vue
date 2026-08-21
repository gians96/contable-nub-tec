<template>
  <div v-if="guia" class="card">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
      <div>
        <h2 class="text-lg font-semibold text-content">Qué declarar en {{ guia.formulario }}</h2>
        <p class="mt-1 text-sm text-content-muted">
          Casilla por casilla, con los importes ya redondeados a soles enteros como los pide SUNAT.
        </p>
      </div>
      <select v-model.number="mesSeleccionado" class="select-field max-w-[190px]">
        <option v-for="m in mesesConDatos" :key="m.month" :value="m.month">
          {{ m.nombreMes }}
        </option>
      </select>
    </div>

    <div v-if="!guia.aplicaFormulario0621" class="mb-4">
      <UiAlert type="info">
        Tu régimen no declara IGV ni renta de tercera categoría en el Formulario 0621.
        El pago se hace con <strong>{{ guia.formulario }}</strong>.
      </UiAlert>
    </div>

    <div v-if="guia.bloqueos.length" class="mb-5 space-y-3">
      <div
        v-for="(bloqueo, i) in guia.bloqueos"
        :key="i"
        class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
      >
        <p class="font-semibold">SUNAT rechazará esta declaración</p>
        <p class="mt-1">{{ bloqueo }}</p>
      </div>
    </div>

    <div v-for="grupo in grupos" :key="grupo.tab" class="mb-6 last:mb-0">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">{{ grupo.tab }}</h3>

      <div class="overflow-hidden rounded-xl border border-line">
        <div
          v-for="casilla in grupo.casillas"
          :key="casilla.casilla + casilla.label"
          class="border-b border-line last:border-b-0"
        >
          <div class="flex flex-wrap items-center gap-3 px-4 py-3">
            <span
              class="inline-flex h-7 min-w-[2.5rem] shrink-0 items-center justify-center rounded-md px-2 text-xs font-bold"
              :class="casilla.editable
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
                : 'bg-surface-muted text-content-muted'"
            >
              {{ casilla.casilla }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-content">{{ casilla.label }}</p>
              <p v-if="casilla.nota" class="mt-0.5 text-xs text-content-muted">{{ casilla.nota }}</p>
            </div>

            <span class="shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-content">
              {{ formatMoneyInt(casilla.valor) }}
            </span>

            <button
              type="button"
              class="shrink-0 rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
              :title="casilla.editable ? 'Copiar importe' : 'Lo calcula SUNAT; cópialo solo para verificar'"
              @click="copiar(casilla)"
            >
              <svg v-if="copiado === casilla.casilla" class="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>

          <div
            v-if="casilla.validacion && !casilla.validacion.ok"
            class="border-t border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <p class="font-medium">{{ casilla.validacion.mensaje }}</p>
            <ul v-if="casilla.validacion.sugerencias?.length" class="mt-2 space-y-1.5">
              <li v-for="(s, i) in casilla.validacion.sugerencias" :key="i" class="flex gap-2">
                <span class="shrink-0 font-semibold">{{ i + 1 }}.</span>
                <span>{{ s }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CasillaGuia, Guia0621 } from '#shared/types/tax'

const props = defineProps<{
  guia: Guia0621 | null
  mesesConDatos: { month: number; nombreMes: string }[]
}>()

const mesSeleccionado = defineModel<number>('mes', { required: true })
const { formatMoneyInt } = useTaxCalculations()

const grupos = computed(() => {
  if (!props.guia) return []
  const orden: CasillaGuia['tab'][] = ['IGV — Ventas', 'IGV — Compras', 'Determinación', 'Renta']
  return orden
    .map(tab => ({ tab, casillas: props.guia!.casillas.filter(c => c.tab === tab) }))
    .filter(g => g.casillas.length > 0)
})

const copiado = ref<string | null>(null)

async function copiar(casilla: CasillaGuia) {
  try {
    await navigator.clipboard.writeText(String(Math.round(casilla.valor)))
    copiado.value = casilla.casilla
    setTimeout(() => { copiado.value = null }, 1500)
  } catch {
    // Sin permiso de portapapeles: el importe ya está visible en pantalla.
  }
}
</script>
