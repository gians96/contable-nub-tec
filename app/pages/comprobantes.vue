<template>
  <div>
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <header>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Comprobantes</h1>
        <p class="mt-1 text-sm text-slate-600">Registra tus ventas y compras documento por documento.</p>
      </header>
      <div class="flex flex-shrink-0 flex-wrap gap-2">
        <button type="button" class="btn-secondary text-sm" @click="exportar('xlsx')">Exportar Excel</button>
        <button type="button" class="btn-primary text-sm shadow-md shadow-brand-600/20" @click="showForm = true; resetForm()">
          + Nuevo comprobante
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filter-surface mb-6">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtrar</span>
        <button type="button" class="text-sm font-medium text-brand-600 hover:text-brand-700" @click="resetFilters">
          Limpiar filtros
        </button>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
          <label class="label-field-caps" for="f-year">Año</label>
          <select id="f-year" v-model="filters.year" class="select-field">
            <option value="">Todos</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
          <label class="label-field-caps" for="f-month">Mes</label>
          <select id="f-month" v-model="filters.month" class="select-field">
            <option value="">Todos</option>
            <option v-for="(m, i) in MESES.slice(1)" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
          <label class="label-field-caps" for="f-tipo">Tipo</label>
          <select id="f-tipo" v-model="filters.tipoMovimiento" class="select-field">
            <option value="">Todos</option>
            <option value="VENTA">Venta</option>
            <option value="COMPRA">Compra</option>
          </select>
        </div>
        <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
          <label class="label-field-caps" for="f-dest">Destino</label>
          <select id="f-dest" v-model="filters.destinoTributario" class="select-field">
            <option value="">Todos</option>
            <option v-for="(nombre, key) in NOMBRES_DESTINO" :key="key" :value="key">{{ nombre }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm xl:col-span-2">
          <label class="label-field-caps" for="f-sub">Subcategoría</label>
          <select id="f-sub" v-model="filters.subcategoria" class="select-field">
            <option value="">Todas</option>
            <option v-for="(nombre, key) in NOMBRES_SUBCATEGORIA" :key="key" :value="key">{{ nombre }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden p-0">
      <div v-if="pending" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      </div>
      <div v-else-if="!data?.data?.length" class="py-16 text-center text-slate-500">
        No hay comprobantes registrados
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[960px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th class="px-4 py-3.5">Fecha</th>
              <th class="px-4 py-3.5">Tipo</th>
              <th class="px-4 py-3.5">Comprobante</th>
              <th class="px-4 py-3.5">RUC/DNI</th>
              <th class="px-4 py-3.5">Razón social</th>
              <th class="px-4 py-3.5 text-right">Total</th>
              <th class="px-4 py-3.5 text-right">Base</th>
              <th class="px-4 py-3.5 text-right">IGV</th>
              <th class="px-4 py-3.5">Destino</th>
              <th class="px-4 py-3.5">Subcategoría</th>
              <th class="px-4 py-3.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="v in data.data"
              :key="v.id"
              class="transition-colors hover:bg-slate-50/90"
              :class="v.tipoMovimiento === 'VENTA' ? 'bg-emerald-50/25' : 'bg-rose-50/20'"
            >
              <td class="whitespace-nowrap px-4 py-3 text-slate-800">{{ formatDate(v.fecha) }}</td>
              <td class="px-4 py-3">
                <UiBadge :variant="v.tipoMovimiento === 'VENTA' ? 'green' : 'red'">
                  {{ v.tipoMovimiento }}
                </UiBadge>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-slate-800">
                {{ NOMBRES_COMPROBANTE[v.tipoComprobante] || v.tipoComprobante }}
                <span v-if="v.serie || v.numero" class="ml-1 text-xs text-slate-500">
                  {{ v.serie }}-{{ v.numero }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{{ v.rucDni || '—' }}</td>
              <td class="max-w-[220px] truncate px-4 py-3 text-slate-800">{{ v.razonSocial || '—' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-900">S/ {{ formatMoney(Number(v.importeTotal)) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">S/ {{ formatMoney(Number(v.baseImponible)) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">S/ {{ formatMoney(Number(v.igv)) }}</td>
              <td class="px-4 py-3">
                <UiBadge :variant="destinoColor(v.destinoTributario)">
                  {{ NOMBRES_DESTINO[v.destinoTributario] || v.destinoTributario }}
                </UiBadge>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ NOMBRES_SUBCATEGORIA[v.subcategoria] || v.subcategoria }}</td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-0.5">
                  <button type="button" class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800" title="Editar" @click="editVoucher(v)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button type="button" class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800" title="Duplicar" @click="duplicateVoucher(v.id)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                  <button type="button" class="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50" title="Eliminar" @click="deleteVoucher(v.id)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div
        v-if="data?.pagination && data.pagination.totalPages > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3"
      >
        <span class="text-sm text-slate-600">{{ data.pagination.total }} registros</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="p in data.pagination.totalPages"
            :key="p"
            type="button"
            class="min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="filters.page === p ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'"
            @click="filters.page = p"
          >
            {{ p }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Formulario -->
    <UiModal v-model="showForm" :title="editingId ? 'Editar comprobante' : 'Nuevo comprobante'" size="lg">
      <form @submit.prevent="saveVoucher" class="space-y-6">
        <!-- Sección 1: Datos básicos -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Datos del comprobante</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="label-field">Fecha *</label>
              <input v-model="form.fecha" type="date" class="input-field" required />
            </div>
            <div>
              <label class="label-field">Tipo de movimiento *</label>
              <select v-model="form.tipoMovimiento" class="select-field" required>
                <option value="">Seleccionar...</option>
                <option value="VENTA">Venta</option>
                <option value="COMPRA">Compra</option>
              </select>
            </div>
            <div>
              <label class="label-field">Tipo de comprobante</label>
              <select v-model="form.tipoComprobante" class="select-field">
                <option v-for="(nombre, key) in NOMBRES_COMPROBANTE" :key="key" :value="key">{{ nombre }}</option>
              </select>
            </div>
            <div>
              <label class="label-field">Serie</label>
              <input v-model="form.serie" type="text" class="input-field" placeholder="F001" />
            </div>
            <div>
              <label class="label-field">Número</label>
              <input v-model="form.numero" type="text" class="input-field" placeholder="00001234" />
            </div>
            <div>
              <label class="label-field">RUC / DNI</label>
              <input v-model="form.rucDni" type="text" class="input-field" placeholder="20123456789" />
            </div>
            <div class="sm:col-span-2">
              <label class="label-field">Razón Social</label>
              <input v-model="form.razonSocial" type="text" class="input-field" placeholder="Empresa SAC" />
            </div>
          </div>
        </div>

        <!-- Sección 2: Importes -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Importes</h3>
          <UiAlert type="info" class="mb-3">
            Escribe solo el <strong>importe total</strong> del comprobante. La base imponible e IGV se calculan automáticamente.
          </UiAlert>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="label-field">¿Afecto a IGV?</label>
              <select v-model="form.afectoIgv" class="select-field">
                <option :value="true">Sí</option>
                <option :value="false">No</option>
              </select>
            </div>
            <div>
              <label class="label-field">Importe Total * (S/)</label>
              <input v-model.number="form.importeTotal" type="number" step="0.01" min="0" class="input-field" required
                @input="recalcular" />
            </div>
            <div>
              <label class="label-field">Base Imponible (S/)
                <span class="text-xs text-gray-400">(auto)</span>
              </label>
              <input v-model.number="form.baseImponible" type="number" step="0.01" class="input-field bg-gray-50"
                :disabled="!form.modoManual" />
            </div>
            <div>
              <label class="label-field">IGV (S/)
                <span class="text-xs text-gray-400">(auto)</span>
              </label>
              <input v-model.number="form.igv" type="number" step="0.01" class="input-field bg-gray-50"
                :disabled="!form.modoManual" />
            </div>
          </div>
          <div class="mt-2">
            <label class="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input v-model="form.modoManual" type="checkbox" class="rounded" />
              Modo manual (editar base e IGV directamente)
            </label>
          </div>
        </div>

        <!-- Sección 3: Clasificación tributaria -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Clasificación tributaria</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="label-field">Destino tributario *</label>
              <select v-model="form.destinoTributario" class="select-field" required @change="onDestinoChange">
                <option value="">Seleccionar...</option>
                <option v-for="(nombre, key) in destinosDisponibles" :key="key" :value="key">{{ nombre }}</option>
              </select>
            </div>
            <div>
              <label class="label-field">Subcategoría</label>
              <select v-model="form.subcategoria" class="select-field">
                <option v-for="sub in subcategoriasDisponibles" :key="sub" :value="sub">
                  {{ NOMBRES_SUBCATEGORIA[sub] || sub }}
                </option>
              </select>
            </div>
            <div>
              <label class="label-field">Medio de pago</label>
              <select v-model="form.medioPago" class="select-field">
                <option v-for="(nombre, key) in NOMBRES_MEDIO_PAGO" :key="key" :value="key">{{ nombre }}</option>
              </select>
            </div>
            <div>
              <label class="label-field">Estado de pago</label>
              <select v-model="form.estadoPago" class="select-field">
                <option v-for="(nombre, key) in NOMBRES_ESTADO_PAGO" :key="key" :value="key">{{ nombre }}</option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-2 mt-6 text-sm cursor-pointer">
                <input v-model="form.deducibleIr" type="checkbox" class="rounded" />
                Deducible para IR
              </label>
            </div>
            <div>
              <label class="flex items-center gap-2 mt-6 text-sm cursor-pointer">
                <input v-model="form.creditoFiscalIgv" type="checkbox" class="rounded" />
                Crédito fiscal IGV
              </label>
            </div>
          </div>
        </div>

        <!-- Sección 4: Opciones adicionales -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Opciones adicionales</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="form.inventarioFinal" type="checkbox" class="rounded" />
                Inventario final
              </label>
              <p class="text-xs text-gray-400 mt-1">Marcar si esta compra quedará como inventario sin vender al cierre</p>
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="form.activoFijo" type="checkbox" class="rounded" />
                Activo fijo
              </label>
              <p class="text-xs text-gray-400 mt-1">Marcar si es un bien duradero (equipo, servidor, etc.)</p>
            </div>
            <div v-if="form.activoFijo || form.destinoTributario === 'ACTIVO_FIJO'">
              <label class="label-field">Vida útil (meses) *</label>
              <input v-model.number="form.vidaUtilMeses" type="number" min="1" class="input-field"
                placeholder="Ej: 48 (4 años)" />
            </div>
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="label-field">Observación / Nota</label>
              <textarea v-model="form.observacion" class="input-field" rows="2" placeholder="Nota opcional..."></textarea>
            </div>
          </div>
        </div>

        <!-- Errores -->
        <div v-if="formError" class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {{ formError }}
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showForm = false" class="btn-secondary">Cancelar</button>
          <button @click="saveVoucher" class="btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const { formatMoney, calcularBaseEIGV, getSubcategoriasPorDestino,
  NOMBRES_DESTINO, NOMBRES_SUBCATEGORIA, NOMBRES_COMPROBANTE,
  NOMBRES_MEDIO_PAGO, NOMBRES_ESTADO_PAGO, MESES } = useTaxCalculations()

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const filters = reactive({
  year: '' as string | number,
  month: '' as string | number,
  tipoMovimiento: '',
  destinoTributario: '',
  subcategoria: '',
  page: 1,
})

const queryParams = computed(() => {
  const q: any = { page: filters.page, limit: 50 }
  if (filters.year) q.year = filters.year
  if (filters.month) q.month = filters.month
  if (filters.tipoMovimiento) q.tipoMovimiento = filters.tipoMovimiento
  if (filters.destinoTributario) q.destinoTributario = filters.destinoTributario
  if (filters.subcategoria) q.subcategoria = filters.subcategoria
  return q
})

const { data, pending, refresh } = useFetch('/api/vouchers', {
  query: queryParams,
})

function resetFilters() {
  filters.year = ''
  filters.month = ''
  filters.tipoMovimiento = ''
  filters.destinoTributario = ''
  filters.subcategoria = ''
  filters.page = 1
}

// ─── Formulario ─────────────────────────────────────────

const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  fecha: new Date().toISOString().split('T')[0],
  tipoMovimiento: '' as string,
  tipoComprobante: 'FACTURA',
  serie: '',
  numero: '',
  rucDni: '',
  razonSocial: '',
  afectoIgv: true,
  importeTotal: 0,
  baseImponible: 0,
  igv: 0,
  modoManual: false,
  medioPago: 'TRANSFERENCIA',
  estadoPago: 'PAGADO',
  destinoTributario: '' as string,
  subcategoria: 'OTRO',
  deducibleIr: true,
  creditoFiscalIgv: true,
  inventarioFinal: false,
  activoFijo: false,
  vidaUtilMeses: null as number | null,
  observacion: '',
})

function resetForm() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, {
    fecha: new Date().toISOString().split('T')[0],
    tipoMovimiento: '',
    tipoComprobante: 'FACTURA',
    serie: '', numero: '', rucDni: '', razonSocial: '',
    afectoIgv: true, importeTotal: 0, baseImponible: 0, igv: 0, modoManual: false,
    medioPago: 'TRANSFERENCIA', estadoPago: 'PAGADO',
    destinoTributario: '', subcategoria: 'OTRO',
    deducibleIr: true, creditoFiscalIgv: true,
    inventarioFinal: false, activoFijo: false, vidaUtilMeses: null, observacion: '',
  })
}

function recalcular() {
  if (!form.modoManual) {
    const { baseImponible, igv } = calcularBaseEIGV(form.importeTotal, form.afectoIgv)
    form.baseImponible = baseImponible
    form.igv = igv
  }
}

watch(() => form.afectoIgv, () => recalcular())

const destinosDisponibles = computed(() => {
  if (form.tipoMovimiento === 'VENTA') {
    return { VENTA: 'Venta' }
  }
  if (form.tipoMovimiento === 'COMPRA') {
    const { VENTA: _, ...rest } = NOMBRES_DESTINO
    return rest
  }
  return NOMBRES_DESTINO
})

const subcategoriasDisponibles = computed(() => {
  return getSubcategoriasPorDestino(form.destinoTributario || 'VENTA')
})

function onDestinoChange() {
  const subs = subcategoriasDisponibles.value
  if (!subs.includes(form.subcategoria)) {
    form.subcategoria = subs[0] || 'OTRO'
  }

  // Ajustar valores por defecto según destino
  if (form.destinoTributario === 'NO_DEDUCIBLE') {
    form.deducibleIr = false
    form.creditoFiscalIgv = false
  } else if (form.tipoMovimiento === 'VENTA') {
    form.deducibleIr = true
    form.creditoFiscalIgv = false
  } else {
    form.deducibleIr = true
    form.creditoFiscalIgv = true
  }

  if (form.destinoTributario === 'ACTIVO_FIJO') {
    form.activoFijo = true
  }
}

watch(() => form.tipoMovimiento, (val) => {
  if (val === 'VENTA') {
    form.destinoTributario = 'VENTA'
    form.creditoFiscalIgv = false
    onDestinoChange()
  } else if (val === 'COMPRA') {
    if (form.destinoTributario === 'VENTA') form.destinoTributario = ''
    form.creditoFiscalIgv = true
  }
})

function editVoucher(v: any) {
  editingId.value = v.id
  formError.value = ''
  Object.assign(form, {
    fecha: v.fecha.split('T')[0],
    tipoMovimiento: v.tipoMovimiento,
    tipoComprobante: v.tipoComprobante,
    serie: v.serie || '',
    numero: v.numero || '',
    rucDni: v.rucDni || '',
    razonSocial: v.razonSocial || '',
    afectoIgv: v.afectoIgv,
    importeTotal: Number(v.importeTotal),
    baseImponible: Number(v.baseImponible),
    igv: Number(v.igv),
    modoManual: v.modoManual,
    medioPago: v.medioPago,
    estadoPago: v.estadoPago,
    destinoTributario: v.destinoTributario,
    subcategoria: v.subcategoria,
    deducibleIr: v.deducibleIr,
    creditoFiscalIgv: v.creditoFiscalIgv,
    inventarioFinal: v.inventarioFinal,
    activoFijo: v.activoFijo,
    vidaUtilMeses: v.vidaUtilMeses,
    observacion: v.observacion || '',
  })
  showForm.value = true
}

async function saveVoucher() {
  formError.value = ''
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      await $fetch(`/api/vouchers/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/vouchers', { method: 'POST', body: payload })
    }
    showForm.value = false
    refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function duplicateVoucher(id: number) {
  try {
    await $fetch('/api/vouchers/duplicate', { method: 'POST', body: { id } })
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Error al duplicar')
  }
}

async function deleteVoucher(id: number) {
  if (!confirm('¿Eliminar este comprobante?')) return
  try {
    await $fetch(`/api/vouchers/${id}`, { method: 'DELETE' })
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Error al eliminar')
  }
}

function exportar(format: string) {
  const params = new URLSearchParams({ type: 'vouchers', format })
  if (filters.year) params.set('year', String(filters.year))
  window.open(`/api/export?${params}`, '_blank')
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function destinoColor(destino: string): 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'purple' | 'yellow' {
  const colors: Record<string, any> = {
    VENTA: 'green', COSTO_VENTAS: 'red', GASTO_ADMIN: 'blue',
    GASTO_VENTA: 'orange', ACTIVO_FIJO: 'purple', NO_DEDUCIBLE: 'gray',
  }
  return colors[destino] || 'gray'
}
</script>
