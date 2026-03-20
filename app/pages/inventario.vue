<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Inventario y Activos Fijos</h1>
        <p class="text-gray-500 text-sm">Control de bienes duraderos y su depreciación</p>
      </div>
      <button @click="showForm = true; resetForm()" class="btn-primary text-sm">+ Nuevo activo</button>
    </div>

    <UiAlert type="info" class="mb-4">
      Los activos fijos que registras aquí se suman automáticamente como depreciación anual en el Cierre Anual.
      La depreciación se calcula en línea recta: <strong>valor / vida útil (meses) × 12</strong>.
    </UiAlert>

    <!-- Filtros -->
    <div class="card mb-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label class="label-field">Categoría</label>
          <select v-model="filterCategoria" class="select-field">
            <option value="">Todas</option>
            <option value="LAPTOP">Laptop</option>
            <option value="SERVIDOR">Servidor</option>
            <option value="IMPRESORA">Impresora</option>
            <option value="CAMARA">Cámara</option>
            <option value="TICKETERA">Ticketera</option>
            <option value="LECTOR">Lector</option>
            <option value="MERCADERIA">Mercadería</option>
            <option value="OTRO_EQUIPO">Otro equipo</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="filterCategoria = ''" class="btn-secondary text-sm">Limpiar</button>
        </div>
      </div>
    </div>

    <div class="card overflow-hidden">
      <div v-if="pending" class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
      <div v-else-if="!data?.length" class="text-center py-10 text-gray-400">
        No hay activos registrados
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-left">
              <th class="px-3 py-3 font-medium">Nombre</th>
              <th class="px-3 py-3 font-medium">Categoría</th>
              <th class="px-3 py-3 font-medium">Fecha compra</th>
              <th class="px-3 py-3 font-medium text-right">Valor (S/)</th>
              <th class="px-3 py-3 font-medium text-right">Vida útil</th>
              <th class="px-3 py-3 font-medium text-right">Dep. anual</th>
              <th class="px-3 py-3 font-medium text-right">Dep. acum.</th>
              <th class="px-3 py-3 font-medium text-right">Valor neto</th>
              <th class="px-3 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in data" :key="a.id" class="border-t border-gray-100 hover:bg-gray-50">
              <td class="px-3 py-2.5 font-medium">{{ a.descripcion }}</td>
              <td class="px-3 py-2.5">
                <UiBadge variant="blue">{{ categoriaNombre(a.categoria) }}</UiBadge>
              </td>
              <td class="px-3 py-2.5">{{ formatDate(a.fecha) }}</td>
              <td class="px-3 py-2.5 text-right">S/ {{ formatMoney(Number(a.total)) }}</td>
              <td class="px-3 py-2.5 text-right text-gray-500">{{ a.vidaUtilMeses ? `${a.vidaUtilMeses} meses` : '-' }}</td>
              <td class="px-3 py-2.5 text-right text-amber-700">S/ {{ formatMoney(depAnual(a)) }}</td>
              <td class="px-3 py-2.5 text-right text-red-600">S/ {{ formatMoney(depAcumulada(a)) }}</td>
              <td class="px-3 py-2.5 text-right font-medium text-emerald-700">
                S/ {{ formatMoney(Number(a.total) - depAcumulada(a)) }}
              </td>
              <td class="px-3 py-2.5 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button @click="editAsset(a)" class="p-1 rounded hover:bg-gray-200" title="Editar">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button @click="deleteAsset(a.id)" class="p-1 rounded hover:bg-red-100" title="Eliminar">
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td class="px-3 py-3" colspan="3">TOTAL</td>
              <td class="px-3 py-3 text-right">S/ {{ formatMoney(totalValor) }}</td>
              <td></td>
              <td class="px-3 py-3 text-right text-amber-700">S/ {{ formatMoney(totalDepAnual) }}</td>
              <td class="px-3 py-3 text-right text-red-600">S/ {{ formatMoney(totalDepAcum) }}</td>
              <td class="px-3 py-3 text-right text-emerald-700">S/ {{ formatMoney(totalValor - totalDepAcum) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Modal Formulario -->
    <UiModal v-model="showForm" :title="editingId ? 'Editar activo' : 'Nuevo activo'" size="md">
      <form @submit.prevent="saveAsset" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="label-field">Descripción del activo *</label>
            <input v-model="form.descripcion" type="text" class="input-field" placeholder="Ej: Laptop Dell Latitude" required />
          </div>
          <div>
            <label class="label-field">Categoría</label>
            <select v-model="form.categoria" class="select-field">
              <option value="LAPTOP">Laptop</option>
              <option value="SERVIDOR">Servidor</option>
              <option value="IMPRESORA">Impresora</option>
              <option value="CAMARA">Cámara</option>
              <option value="TICKETERA">Ticketera</option>
              <option value="LECTOR">Lector</option>
              <option value="MERCADERIA">Mercadería</option>
              <option value="OTRO_EQUIPO">Otro equipo</option>
            </select>
          </div>
          <div>
            <label class="label-field">Fecha de adquisición *</label>
            <input v-model="form.fecha" type="date" class="input-field" required />
          </div>
          <div>
            <label class="label-field">Total con IGV (S/) *</label>
            <input v-model.number="form.total" type="number" step="0.01" min="0" class="input-field" required />
          </div>
          <div>
            <label class="label-field">Vida útil (meses)</label>
            <input v-model.number="form.vidaUtilMeses" type="number" min="1" class="input-field"
              placeholder="Ej: 48 (4 años)" />
          </div>
          <div>
            <label class="label-field">Destino tributario</label>
            <select v-model="form.destinoTributario" class="select-field">
              <option value="ACTIVO_FIJO">Activo fijo</option>
              <option value="GASTO_ADMIN">Gasto administrativo</option>
              <option value="COSTO_VENTAS">Costo de ventas</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="label-field">Observaciones</label>
            <textarea v-model="form.observaciones" class="input-field" rows="2" placeholder="Observaciones opcionales..."></textarea>
          </div>
        </div>
        <div v-if="formError" class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{{ formError }}</div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showForm = false" class="btn-secondary">Cancelar</button>
          <button @click="saveAsset" class="btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const { formatMoney } = useTaxCalculations()

const filterCategoria = ref('')

const { data, pending, refresh } = useFetch('/api/inventory-assets', {
  query: computed(() => {
    const q: any = {}
    if (filterCategoria.value) q.categoria = filterCategoria.value
    return q
  }),
})

const totalValor = computed(() => (data.value || []).reduce((s: number, a: any) => s + Number(a.total), 0))
const totalDepAnual = computed(() => (data.value || []).reduce((s: number, a: any) => s + depAnual(a), 0))
const totalDepAcum = computed(() => (data.value || []).reduce((s: number, a: any) => s + depAcumulada(a), 0))

function depAnual(a: any): number {
  if (!a.depreciacionMensual) return 0
  return Math.round(Number(a.depreciacionMensual) * 12 * 100) / 100
}

function depAcumulada(a: any): number {
  if (!a.depreciacionMensual) return 0
  const meses = Math.floor((Date.now() - new Date(a.fecha).getTime()) / (1000 * 60 * 60 * 24 * 30))
  const acum = Number(a.depreciacionMensual) * Math.max(0, meses)
  return Math.min(acum, Number(a.base)) // no puede superar la base
}

function categoriaNombre(cat: string) {
  const nombres: Record<string, string> = {
    MERCADERIA: 'Mercadería', SERVIDOR: 'Servidor', TICKETERA: 'Ticketera',
    LECTOR: 'Lector', LAPTOP: 'Laptop', IMPRESORA: 'Impresora',
    CAMARA: 'Cámara', OTRO_EQUIPO: 'Otro equipo',
  }
  return nombres[cat] || cat
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Formulario
const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')

const form = reactive({
  descripcion: '',
  categoria: 'LAPTOP',
  fecha: new Date().toISOString().split('T')[0],
  total: 0,
  vidaUtilMeses: 48 as number | null,
  destinoTributario: 'ACTIVO_FIJO',
  observaciones: '',
})

function resetForm() {
  editingId.value = null
  formError.value = ''
  Object.assign(form, {
    descripcion: '', categoria: 'LAPTOP',
    fecha: new Date().toISOString().split('T')[0],
    total: 0, vidaUtilMeses: 48, destinoTributario: 'ACTIVO_FIJO', observaciones: '',
  })
}

function editAsset(a: any) {
  editingId.value = a.id
  formError.value = ''
  Object.assign(form, {
    descripcion: a.descripcion, categoria: a.categoria,
    fecha: a.fecha.split('T')[0],
    total: Number(a.total),
    vidaUtilMeses: a.vidaUtilMeses, destinoTributario: a.destinoTributario,
    observaciones: a.observaciones || '',
  })
  showForm.value = true
}

async function saveAsset() {
  formError.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/inventory-assets/${editingId.value}`, { method: 'PUT', body: form })
    } else {
      await $fetch('/api/inventory-assets', { method: 'POST', body: form })
    }
    showForm.value = false
    refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Error al guardar'
  } finally {
    saving.value = false
  }
}

async function deleteAsset(id: number) {
  if (!confirm('¿Eliminar este activo?')) return
  await $fetch(`/api/inventory-assets/${id}`, { method: 'DELETE' })
  refresh()
}
</script>
