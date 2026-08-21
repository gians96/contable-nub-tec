<template>
  <div>
    <header class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-content">Auditoría</h1>
      <p class="mt-1 text-sm text-content-muted">
        Quién creó, editó o eliminó cada registro de esta empresa.
      </p>
    </header>

    <UiAlert v-if="!isAdmin" type="warning">
      Solo los administradores de la empresa pueden ver el registro de auditoría.
    </UiAlert>

    <template v-else>
      <div class="filter-surface mb-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="label-field-caps" for="au-entidad">Entidad</label>
            <select id="au-entidad" v-model="filtros.entidad" class="select-field">
              <option value="">Todas</option>
              <option v-for="(nombre, clave) in NOMBRES_ENTIDAD" :key="clave" :value="clave">{{ nombre }}</option>
            </select>
          </div>
          <div>
            <label class="label-field-caps" for="au-accion">Acción</label>
            <select id="au-accion" v-model="filtros.accion" class="select-field">
              <option value="">Todas</option>
              <option value="CREAR">Creación</option>
              <option value="ACTUALIZAR">Modificación</option>
              <option value="ELIMINAR">Eliminación</option>
            </select>
          </div>
          <div class="flex items-end">
            <button type="button" class="btn-secondary w-full" @click="limpiar">Limpiar filtros</button>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden p-0">
        <div v-if="cargaInicial" class="flex justify-center py-16">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>

        <div v-else-if="!data?.data?.length" class="py-16 text-center text-content-muted">
          Todavía no hay movimientos registrados
        </div>

        <div v-else class="overflow-x-auto" :class="{ 'is-refreshing': refrescando }">
          <table class="w-full min-w-[720px] text-sm">
            <thead>
              <tr class="border-b border-line bg-surface-raised/95 text-left text-xs font-semibold uppercase tracking-wide text-content-soft">
                <th class="px-4 py-3.5">Fecha</th>
                <th class="px-4 py-3.5">Usuario</th>
                <th class="px-4 py-3.5">Acción</th>
                <th class="px-4 py-3.5">Entidad</th>
                <th class="px-4 py-3.5">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="r in data.data" :key="r.id" class="transition-colors hover:bg-surface-raised/90">
                <td class="whitespace-nowrap px-4 py-3 text-content-soft">{{ formatoFecha(r.createdAt) }}</td>
                <td class="px-4 py-3 text-content-soft">{{ r.user?.nombre || r.user?.username || '—' }}</td>
                <td class="px-4 py-3">
                  <UiBadge :variant="VARIANTE_ACCION[r.accion]">{{ NOMBRES_ACCION[r.accion] }}</UiBadge>
                </td>
                <td class="px-4 py-3 text-content-soft">{{ NOMBRES_ENTIDAD[r.entidad] ?? r.entidad }}</td>
                <td class="max-w-[420px] truncate px-4 py-3 text-content" :title="r.resumen ?? ''">
                  {{ r.resumen || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="data?.pagination && data.pagination.totalPages > 1"
          class="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-raised/50 px-4 py-3"
        >
          <span class="text-sm text-content-muted">
            Página {{ data.pagination.page }} de {{ data.pagination.totalPages }} · {{ data.pagination.total }} movimientos
          </span>
          <div class="flex gap-2">
            <button type="button" class="btn-secondary py-1.5" :disabled="filtros.page <= 1" @click="filtros.page--">
              Anterior
            </button>
            <button
              type="button"
              class="btn-secondary py-1.5"
              :disabled="filtros.page >= data.pagination.totalPages"
              @click="filtros.page++"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { isAdmin } = useAuth()

const NOMBRES_ENTIDAD: Record<string, string> = {
  Voucher: 'Comprobante',
  InventoryAsset: 'Activo / inventario',
  Party: 'Cliente o proveedor',
  MonthlySummary: 'Pagos del mes',
  AnnualClosure: 'Cierre anual',
  TaxParameter: 'Parámetros tributarios',
  Company: 'Datos de la empresa',
  Membership: 'Miembro',
}

const NOMBRES_ACCION: Record<string, string> = {
  CREAR: 'Creó',
  ACTUALIZAR: 'Modificó',
  ELIMINAR: 'Eliminó',
}

const VARIANTE_ACCION: Record<string, 'green' | 'blue' | 'red'> = {
  CREAR: 'green',
  ACTUALIZAR: 'blue',
  ELIMINAR: 'red',
}

const filtros = reactive({ entidad: '', accion: '', page: 1 })

watch(() => [filtros.entidad, filtros.accion], () => { filtros.page = 1 })

const { data, pending } = useFetch<any>('/api/audit', {
  query: computed(() => ({
    entidad: filtros.entidad || undefined,
    accion: filtros.accion || undefined,
    page: filtros.page,
  })),
})

const cargaInicial = computed(() => pending.value && !data.value)
const refrescando = computed(() => pending.value && !!data.value)

function limpiar() {
  filtros.entidad = ''
  filtros.accion = ''
  filtros.page = 1
}

function formatoFecha(valor: string) {
  return new Date(valor).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>
