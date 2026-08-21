<template>
  <div>
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-content">Configuración</h1>
      <p class="mt-1 text-sm text-content-muted">Datos de tu empresa y parámetros tributarios.</p>
    </header>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- Empresa -->
      <section class="card flex flex-col">
        <div class="mb-6 border-b border-line pb-4">
          <h2 class="text-lg font-semibold text-content">Datos de la empresa</h2>
          <p class="mt-1 text-sm text-content-muted">Aparecen en exportaciones y reportes.</p>
        </div>
        <div v-if="loadingCompany" class="flex flex-1 justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>
        <form v-else class="flex flex-1 flex-col" @submit.prevent="saveCompany">
          <div class="space-y-4">
            <div>
              <label class="label-field" for="co-ruc">RUC</label>
              <input id="co-ruc" v-model="company.ruc" type="text" class="input-field" placeholder="20123456789" />
            </div>
            <div>
              <label class="label-field" for="co-rs">Razón social</label>
              <input id="co-rs" v-model="company.razonSocial" type="text" class="input-field" placeholder="Mi Empresa SAC" />
            </div>
            <div>
              <label class="label-field" for="co-nc">Nombre comercial</label>
              <input id="co-nc" v-model="company.nombreComercial" type="text" class="input-field" placeholder="Mi Empresa" />
            </div>
            <div>
              <label class="label-field" for="co-dir">Dirección</label>
              <input id="co-dir" v-model="company.direccion" type="text" class="input-field" placeholder="Av. Principal 123" />
            </div>
          </div>
          <div v-if="companyMsg" class="mt-4 rounded-lg px-3 py-2 text-sm" :class="companyError ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200' : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'">
            {{ companyMsg }}
          </div>
          <div class="form-actions mt-auto">
            <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="savingCompany">
              {{ savingCompany ? 'Guardando…' : 'Guardar datos' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Parámetros tributarios -->
      <section class="card flex flex-col">
        <div class="mb-6 border-b border-line pb-4">
          <h2 class="text-lg font-semibold text-content">Parámetros tributarios</h2>
          <p class="mt-1 text-sm text-content-muted">Valores usados en cálculos del año seleccionado.</p>
        </div>
        <div class="mb-5">
          <label class="label-field" for="co-year">Año fiscal</label>
          <select id="co-year" v-model="taxYear" class="select-field max-w-[200px]">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div v-if="loadingTax" class="flex flex-1 justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>
        <form v-else class="flex flex-1 flex-col" @submit.prevent="saveTax">
          <div class="space-y-4">
            <div>
              <label class="label-field" for="tax-uit">UIT (S/)</label>
              <input id="tax-uit" v-model.number="tax.uit" type="number" step="50" class="input-field" />
              <p class="hint-field">UIT 2025: S/ 5,350 — UIT 2024: S/ 5,150</p>
            </div>
            <div>
              <label class="label-field" for="tax-igv">IGV (%)</label>
              <input id="tax-igv" v-model.number="tax.igvPercent" type="number" step="0.01" class="input-field" />
              <p class="hint-field">Valor estándar: 18%</p>
            </div>
            <div>
              <label class="label-field" for="tax-irm">IR pago a cuenta mensual (%)</label>
              <input id="tax-irm" v-model.number="tax.irMonthlyPercent" type="number" step="0.01" class="input-field" />
              <p class="hint-field">RMT ingresos &lt; 300 UIT: 1%</p>
            </div>
            <div>
              <label class="label-field" for="tax-ir1lim">IR tramo 1 — límite (UIT)</label>
              <input id="tax-ir1lim" v-model.number="tax.irAnnualTramo1Limit" type="number" step="1" class="input-field" />
              <p class="hint-field">RMT: 15 UIT de renta neta = S/ {{ limiteTramo1Texto }}</p>
            </div>
            <div>
              <label class="label-field" for="tax-ir1">IR tramo 1 (%)</label>
              <input id="tax-ir1" v-model.number="tax.irAnnualTramo1Rate" type="number" step="0.01" class="input-field" />
              <p class="hint-field">RMT: 10% hasta el límite del tramo 1</p>
            </div>
            <div>
              <label class="label-field" for="tax-ir2">IR tramo 2 (%)</label>
              <input id="tax-ir2" v-model.number="tax.irAnnualTramo2Rate" type="number" step="0.01" class="input-field" />
              <p class="hint-field">RMT: 29,5% sobre el exceso del tramo 1</p>
            </div>
          </div>
          <div v-if="taxMsg" class="mt-4 rounded-lg px-3 py-2 text-sm" :class="taxError ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200' : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'">
            {{ taxMsg }}
          </div>
          <div class="form-actions mt-auto">
            <button type="submit" class="btn-primary w-full sm:w-auto" :disabled="savingTax">
              {{ savingTax ? 'Guardando…' : 'Guardar parámetros' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Régimen tributario -->
      <SettingsRegimenCard :year="taxYear" @saved="onRegimenGuardado" />

      <!-- Miembros de la empresa (solo administradores) -->
      <SettingsUsersCard v-if="isAdmin" />
    </div>
  </div>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const { isAdmin } = useAuth()
const { refresh: refreshContext } = useAppContext()

// El header muestra el régimen vigente: hay que refrescarlo al cambiarlo.
function onRegimenGuardado() {
  refreshContext()
}

// ─── Empresa ────────────────────────────────────────────
const loadingCompany = ref(true)
const savingCompany = ref(false)
const companyMsg = ref('')
const companyError = ref(false)

const company = reactive({
  ruc: '', razonSocial: '', nombreComercial: '', direccion: '',
})

async function loadCompany() {
  loadingCompany.value = true
  try {
    const data = await $fetch('/api/settings/company')
    if (data) {
      // Solo los campos del formulario: `data` trae además id/createdAt/updatedAt,
      // que acabarían viajando de vuelta en el PUT.
      for (const campo of Object.keys(company) as (keyof typeof company)[]) {
        const valor = (data as Record<string, unknown>)[campo]
        company[campo] = typeof valor === 'string' ? valor : ''
      }
    }
  } finally {
    loadingCompany.value = false
  }
}

async function saveCompany() {
  savingCompany.value = true
  companyMsg.value = ''
  try {
    await $fetch('/api/settings/company', { method: 'PUT', body: company })
    companyMsg.value = '✓ Datos guardados correctamente'
    refreshContext()
    companyError.value = false
  } catch (e: any) {
    companyMsg.value = e.data?.message || 'Error al guardar'
    companyError.value = true
  } finally {
    savingCompany.value = false
  }
}

// ─── Parámetros tributarios ─────────────────────────────
const taxYear = ref(currentYear)
const loadingTax = ref(true)
const savingTax = ref(false)
const taxMsg = ref('')
const taxError = ref(false)

// Las claves deben coincidir exactamente con las columnas de TaxParameter: la API
// lee y escribe por nombre, y cualquier alias local se descarta en silencio.
const tax = reactive({
  uit: 5350,
  igvPercent: 18,
  irMonthlyPercent: 1,
  irAnnualTramo1Limit: 15,
  irAnnualTramo1Rate: 10,
  irAnnualTramo2Rate: 29.5,
})

const limiteTramo1Texto = computed(() =>
  formatMoney((Number(tax.irAnnualTramo1Limit) || 0) * (Number(tax.uit) || 0))
)

async function loadTax() {
  loadingTax.value = true
  try {
    const data = await $fetch('/api/settings/tax-params', { query: { year: taxYear.value } })
    if (data) {
      for (const campo of Object.keys(tax) as (keyof typeof tax)[]) {
        const valor = (data as Record<string, unknown>)[campo]
        if (valor != null) tax[campo] = Number(valor)
      }
    }
  } finally {
    loadingTax.value = false
  }
}

async function saveTax() {
  savingTax.value = true
  taxMsg.value = ''
  try {
    await $fetch('/api/settings/tax-params', {
      method: 'PUT',
      body: { year: taxYear.value, ...toRaw(tax) },
    })
    taxMsg.value = '✓ Parámetros guardados correctamente'
    refreshContext()
    taxError.value = false
  } catch (e: any) {
    taxMsg.value = e.data?.message || 'Error al guardar'
    taxError.value = true
  } finally {
    savingTax.value = false
  }
}

watch(taxYear, () => loadTax())

onMounted(() => {
  loadCompany()
  loadTax()
})
</script>
