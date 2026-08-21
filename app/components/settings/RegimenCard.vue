<template>
  <section class="card flex flex-col">
    <div class="mb-6 border-b border-line pb-4">
      <h2 class="text-lg font-semibold text-content">Régimen tributario</h2>
      <p class="mt-1 text-sm text-content-muted">
        Determina cómo se calculan el Resumen Mensual y el Cierre Anual del año {{ year }}.
      </p>
    </div>

    <div v-if="loading" class="flex flex-1 justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>

    <form v-else class="flex flex-1 flex-col" @submit.prevent="guardar">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          v-for="spec in REGIMENES_LISTA"
          :key="spec.code"
          class="cursor-pointer rounded-xl border p-3 transition-colors"
          :class="form.regimen === spec.code
            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:bg-brand-500/10'
            : 'border-line hover:bg-surface-muted'"
        >
          <div class="flex items-center gap-2">
            <input v-model="form.regimen" type="radio" :value="spec.code" class="text-brand-600" />
            <span class="text-sm font-semibold text-content">{{ spec.label }}</span>
          </div>
          <p class="mt-1.5 text-xs leading-relaxed text-content-muted">{{ spec.descripcion }}</p>
        </label>
      </div>

      <div class="mt-5 space-y-4">
        <!-- NRUS -->
        <template v-if="form.regimen === 'NRUS'">
          <div>
            <label class="label-field" for="rg-nrus-cat">Categoría</label>
            <select id="rg-nrus-cat" v-model.number="form.nrusCategoria" class="select-field">
              <option :value="1">Categoría 1</option>
              <option :value="2">Categoría 2</option>
            </select>
            <p class="hint-field">
              Cuota de S/ {{ form.nrusCategoria === 2 ? form.nrusCuotaCat2 : form.nrusCuotaCat1 }} al mes,
              con un límite de S/ {{ formatMoney(form.nrusCategoria === 2 ? form.nrusLimiteCat2 : form.nrusLimiteCat1) }}
              de ingresos o compras mensuales.
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field" for="rg-c1">Cuota Cat. 1 (S/)</label>
              <input id="rg-c1" v-model.number="form.nrusCuotaCat1" type="number" step="1" class="input-field" />
            </div>
            <div>
              <label class="label-field" for="rg-c2">Cuota Cat. 2 (S/)</label>
              <input id="rg-c2" v-model.number="form.nrusCuotaCat2" type="number" step="1" class="input-field" />
            </div>
            <div>
              <label class="label-field" for="rg-l1">Límite Cat. 1 (S/)</label>
              <input id="rg-l1" v-model.number="form.nrusLimiteCat1" type="number" step="100" class="input-field" />
            </div>
            <div>
              <label class="label-field" for="rg-l2">Límite Cat. 2 (S/)</label>
              <input id="rg-l2" v-model.number="form.nrusLimiteCat2" type="number" step="100" class="input-field" />
            </div>
          </div>
        </template>

        <!-- RER -->
        <template v-else-if="form.regimen === 'RER'">
          <div>
            <label class="label-field" for="rg-rer">Renta mensual (%)</label>
            <input id="rg-rer" v-model.number="form.rerRate" type="number" step="0.01" class="input-field" />
            <p class="hint-field">Carácter definitivo: no es un pago a cuenta y no hay regularización anual.</p>
          </div>
        </template>

        <!-- RMT -->
        <template v-else-if="form.regimen === 'RMT'">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field" for="rg-irm">Pago a cuenta (%)</label>
              <input id="rg-irm" v-model.number="form.irMonthlyPercent" type="number" step="0.01" class="input-field" />
              <p class="hint-field">Hasta el umbral de ingresos.</p>
            </div>
            <div>
              <label class="label-field" for="rg-umbral">Umbral (UIT)</label>
              <input id="rg-umbral" v-model.number="form.rmtUmbralUit" type="number" step="1" class="input-field" />
              <p class="hint-field">= S/ {{ formatMoney(umbralSoles) }}</p>
            </div>
            <div>
              <label class="label-field" for="rg-min">Tasa mínima sobre el umbral (%)</label>
              <input id="rg-min" v-model.number="form.pagoCuentaMinRate" type="number" step="0.01" class="input-field" />
            </div>
            <div>
              <label class="label-field" for="rg-limite">Límite del régimen (UIT)</label>
              <input id="rg-limite" v-model.number="form.rmtLimiteRegimenUit" type="number" step="10" class="input-field" />
              <p class="hint-field">= S/ {{ formatMoney(limiteSoles) }}</p>
            </div>
          </div>
        </template>

        <!-- RG -->
        <template v-else>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-field" for="rg-min-rg">Tasa mínima del pago a cuenta (%)</label>
              <input id="rg-min-rg" v-model.number="form.pagoCuentaMinRate" type="number" step="0.01" class="input-field" />
            </div>
            <div>
              <label class="label-field" for="rg-flat">Tasa anual plana (%)</label>
              <input id="rg-flat" v-model.number="form.irAnnualFlatRate" type="number" step="0.01" class="input-field" />
            </div>
          </div>
        </template>

        <!-- Coeficiente (RMT y RG) -->
        <div v-if="usaCoeficiente">
          <label class="label-field" for="rg-coef">Coeficiente (opcional)</label>
          <input
            id="rg-coef"
            v-model="coeficienteTexto"
            type="number"
            step="0.0001"
            min="0"
            class="input-field"
            placeholder="Se calcula del ejercicio anterior"
          />
          <p class="hint-field">
            {{ coeficienteActual?.detalle || 'Déjalo vacío para calcularlo automáticamente con el impuesto e ingresos del ejercicio anterior.' }}
          </p>
        </div>
      </div>

      <div
        v-if="mensaje"
        class="mt-4 rounded-lg px-3 py-2 text-sm"
        :class="error
          ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'"
      >
        {{ mensaje }}
      </div>

      <div class="form-actions mt-auto">
        <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Guardar régimen' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ year: number }>()
const emit = defineEmits<{ saved: [] }>()

const { formatMoney } = useTaxCalculations()

const loading = ref(true)
const guardando = ref(false)
const mensaje = ref('')
const error = ref(false)
const uit = ref(5350)
const coeficienteActual = ref<{ valor: number | null; origen: string; detalle: string } | null>(null)

// Los nombres coinciden con las columnas de TaxParameter: la API escribe por
// clave y descarta en silencio cualquier alias.
const form = reactive({
  regimen: 'RMT',
  irMonthlyPercent: 1,
  rerRate: 1.5,
  pagoCuentaMinRate: 1.5,
  rmtUmbralUit: 300,
  rmtLimiteRegimenUit: 1700,
  irAnnualFlatRate: 29.5,
  nrusCategoria: 1,
  nrusCuotaCat1: 20,
  nrusCuotaCat2: 50,
  nrusLimiteCat1: 5000,
  nrusLimiteCat2: 8000,
})

const coeficienteTexto = ref<string>('')

const usaCoeficiente = computed(() => form.regimen === 'RMT' || form.regimen === 'RG')
const umbralSoles = computed(() => (Number(form.rmtUmbralUit) || 0) * uit.value)
const limiteSoles = computed(() => (Number(form.rmtLimiteRegimenUit) || 0) * uit.value)

async function cargar() {
  loading.value = true
  mensaje.value = ''
  try {
    const data = await $fetch<Record<string, unknown>>('/api/settings/tax-params', {
      query: { year: props.year },
    })
    if (data) {
      for (const campo of Object.keys(form) as (keyof typeof form)[]) {
        const valor = data[campo]
        if (valor == null) continue
        ;(form as Record<string, unknown>)[campo] = campo === 'regimen' ? String(valor) : Number(valor)
      }
      uit.value = Number(data.uit ?? 5350)
      coeficienteTexto.value = data.coeficienteManual != null ? String(Number(data.coeficienteManual)) : ''
    }

    // El detalle del coeficiente calculado lo resuelve el servidor con los datos
    // del ejercicio anterior; el dashboard ya lo devuelve resuelto.
    const dash = await $fetch<any>('/api/dashboard', { query: { year: props.year } }).catch(() => null)
    coeficienteActual.value = dash?.coeficiente ?? null
  } finally {
    loading.value = false
  }
}

async function guardar() {
  guardando.value = true
  mensaje.value = ''
  try {
    await $fetch('/api/settings/tax-params', {
      method: 'PUT',
      body: {
        year: props.year,
        ...toRaw(form),
        coeficienteManual: coeficienteTexto.value === '' ? null : Number(coeficienteTexto.value),
      },
    })
    mensaje.value = '✓ Régimen guardado correctamente'
    error.value = false
    emit('saved')
  } catch (e: any) {
    mensaje.value = e.data?.message || 'Error al guardar'
    error.value = true
  } finally {
    guardando.value = false
  }
}

watch(() => props.year, cargar)
onMounted(cargar)
</script>
