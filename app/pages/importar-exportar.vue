<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-1">Importar / Exportar</h1>
    <p class="text-gray-500 text-sm mb-6">Descarga tu data en Excel o importa comprobantes desde un archivo</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Exportar -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Exportar comprobantes</h2>
        <p class="text-sm text-gray-500 mb-4">
          Descarga todos tus comprobantes en formato Excel (.xlsx) o CSV para revisión, respaldo o envío a tu contador.
        </p>
        <div class="space-y-4">
          <div>
            <label class="label-field">Año (opcional)</label>
            <select v-model="exportYear" class="select-field">
              <option value="">Todos los años</option>
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>
          <div>
            <label class="label-field">Formato</label>
            <div class="flex gap-3">
              <button @click="doExport('xlsx')"
                class="btn-primary flex-1 flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Excel (.xlsx)
              </button>
              <button @click="doExport('csv')"
                class="btn-secondary flex-1 flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                CSV (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Importar -->
      <div class="card">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Importar comprobantes</h2>
        <p class="text-sm text-gray-500 mb-4">
          Sube un archivo Excel o CSV con comprobantes. El formato debe tener las columnas:
          <strong>fecha, tipoMovimiento, tipoComprobante, serie, numero, rucDni, razonSocial, importeTotal, afectoIgv, destinoTributario</strong>.
        </p>

        <UiAlert type="warning" class="mb-4">
          Consejo: primero exporta un archivo de ejemplo para ver el formato correcto antes de importar.
        </UiAlert>

        <div class="space-y-4">
          <div
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
            :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
            @click="fileInput?.click()">
            <input ref="fileInput" type="file" class="hidden"
              accept=".xlsx,.xls,.csv" @change="onFileSelect" />
            <svg class="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            <p class="text-sm text-gray-600">
              {{ selectedFile ? selectedFile.name : 'Arrastra un archivo aquí o haz clic para seleccionar' }}
            </p>
            <p class="text-xs text-gray-400 mt-1">Excel (.xlsx) o CSV (.csv)</p>
          </div>

          <button @click="doImport" class="btn-primary w-full" :disabled="!selectedFile || importing">
            {{ importing ? 'Importando...' : 'Importar archivo' }}
          </button>
        </div>

        <!-- Resultado importación -->
        <div v-if="importResult" class="mt-4 space-y-2">
          <div class="flex gap-4 text-sm">
            <span class="text-green-600 font-medium">✓ {{ importResult.imported }} importados</span>
            <span v-if="importResult.errors?.length" class="text-red-600 font-medium">
              ✕ {{ importResult.errors.length }} errores
            </span>
          </div>
          <div v-if="importResult.errors?.length" class="max-h-40 overflow-y-auto">
            <div v-for="(err, i) in importResult.errors" :key="i"
              class="text-xs text-red-600 bg-red-50 px-3 py-1 rounded mb-1">
              Fila {{ err.row }}: {{ err.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

// Exportar
const exportYear = ref('')

function doExport(format: string) {
  const params = new URLSearchParams({ type: 'vouchers', format })
  if (exportYear.value) params.set('year', String(exportYear.value))
  window.open(`/api/export?${params}`, '_blank')
}

// Importar
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const importing = ref(false)
const importResult = ref<any>(null)

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
  importResult.value = null
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
    importResult.value = null
  }
}

async function doImport() {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    importResult.value = await $fetch('/api/import', { method: 'POST', body: formData })
  } catch (e: any) {
    importResult.value = { imported: 0, errors: [{ row: 0, error: e.data?.message || 'Error al importar' }] }
  } finally {
    importing.value = false
  }
}
</script>
