<template>
  <div>
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <header>
        <h1 class="text-2xl font-bold tracking-tight text-content">Comprobantes</h1>
        <p class="mt-1 text-sm text-content-soft">Registra tus ventas y compras documento por documento.</p>
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
        <span class="text-xs font-semibold uppercase tracking-wide text-content-muted">Filtrar</span>
        <button type="button" class="text-sm font-medium text-brand-600 hover:text-brand-700" @click="resetFilters">
          Limpiar filtros
        </button>
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div class="rounded-lg border border-line/80 bg-surface p-3 shadow-sm">
          <label class="label-field-caps" for="f-year">Año</label>
          <select id="f-year" v-model="filters.year" class="select-field">
            <option value="">Todos</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-line/80 bg-surface p-3 shadow-sm">
          <label class="label-field-caps" for="f-month">Mes</label>
          <select id="f-month" v-model="filters.month" class="select-field">
            <option value="">Todos</option>
            <option v-for="(m, i) in MESES.slice(1)" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-line/80 bg-surface p-3 shadow-sm">
          <label class="label-field-caps" for="f-tipo">Tipo</label>
          <select id="f-tipo" v-model="filters.tipoMovimiento" class="select-field">
            <option value="">Todos</option>
            <option value="VENTA">Venta</option>
            <option value="COMPRA">Compra</option>
          </select>
        </div>
        <div class="rounded-lg border border-line/80 bg-surface p-3 shadow-sm">
          <label class="label-field-caps" for="f-dest">Destino</label>
          <select id="f-dest" v-model="filters.destinoTributario" class="select-field">
            <option value="">Todos</option>
            <option v-for="(nombre, key) in NOMBRES_DESTINO" :key="key" :value="key">{{ nombre }}</option>
          </select>
        </div>
        <div class="rounded-lg border border-line/80 bg-surface p-3 shadow-sm xl:col-span-2">
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
      <div v-if="cargaInicial" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
      </div>
      <div v-else-if="!data?.data?.length" class="py-16 text-center text-content-muted">
        No hay comprobantes registrados
      </div>
      <div v-else class="overflow-x-auto" :class="{ 'is-refreshing': refrescando }">
        <table class="w-full min-w-[960px] text-sm">
          <thead>
            <tr class="border-b border-line bg-surface-raised/95 text-left text-xs font-semibold uppercase tracking-wide text-content-soft">
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
          <tbody class="divide-y divide-line">
            <tr
              v-for="v in data.data"
              :key="v.id"
              class="transition-colors hover:bg-surface-raised/90"
              :class="v.tipoMovimiento === 'VENTA' ? 'bg-emerald-50/25' : 'bg-rose-50/20'"
            >
              <td class="whitespace-nowrap px-4 py-3 text-content">{{ formatDate(v.fecha) }}</td>
              <td class="px-4 py-3">
                <UiBadge :variant="v.tipoMovimiento === 'VENTA' ? 'green' : 'red'">
                  {{ v.tipoMovimiento }}
                </UiBadge>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-content">
                {{ NOMBRES_COMPROBANTE[v.tipoComprobante] || v.tipoComprobante }}
                <span v-if="v.serie || v.numero" class="ml-1 text-xs text-content-muted">
                  {{ v.serie }}-{{ v.numero }}
                </span>
                <UiBadge
                  v-if="v.detraccion"
                  variant="yellow"
                  class="ml-1"
                  :title="`Detracción ${nombreCodigoDetraccion(v.detraccionCodigo)}`"
                >
                  Detr. {{ Number(v.detraccionPorcentaje) }}%
                </UiBadge>
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-content-soft">{{ v.rucDni || '—' }}</td>
              <td class="max-w-[220px] truncate px-4 py-3 text-content">{{ v.razonSocial || '—' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-content">
                S/ {{ formatMoney(Number(v.importeTotal)) }}
                <span
                  v-if="v.detraccion"
                  class="block text-xs font-normal text-amber-700 dark:text-amber-300"
                  :title="v.tipoMovimiento === 'VENTA' ? 'Neto cobrado tras la detracción' : 'Neto pagado al proveedor tras la detracción'"
                >
                  neto S/ {{ formatMoney(netoDeDetraccion(v)) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-content-soft">S/ {{ formatMoney(Number(v.baseImponible)) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right tabular-nums text-content-soft">
                S/ {{ formatMoney(Number(v.igv)) }}
                <UiBadge v-if="Number(v.igvPercent) !== 18" :variant="v.regimenIgv === 'LEY_31556' ? 'purple' : 'gray'" class="ml-1">
                  {{ Number(v.igvPercent) }}%
                </UiBadge>
              </td>
              <td class="px-4 py-3">
                <UiBadge :variant="destinoColor(v.destinoTributario)">
                  {{ NOMBRES_DESTINO[v.destinoTributario] || v.destinoTributario }}
                </UiBadge>
              </td>
              <td class="px-4 py-3 text-content-soft">{{ NOMBRES_SUBCATEGORIA[v.subcategoria] || v.subcategoria }}</td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-0.5">
                  <button type="button" class="rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-muted/80 hover:text-content" title="Editar" @click="editVoucher(v)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button type="button" class="rounded-lg p-2 text-content-muted transition-colors hover:bg-surface-muted/80 hover:text-content" title="Duplicar" @click="duplicateVoucher(v.id)">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                  <button type="button" class="rounded-lg p-2 text-red-500 dark:text-red-400 transition-colors hover:bg-red-50 dark:bg-red-500/10" title="Eliminar" @click="deleteVoucher(v.id)">
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
        class="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-raised/50 px-4 py-3"
      >
        <span class="text-sm text-content-soft">{{ data.pagination.total }} registros</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="p in data.pagination.totalPages"
            :key="p"
            type="button"
            class="min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="filters.page === p ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface text-content-soft ring-1 ring-slate-200 hover:bg-surface-muted'"
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
          <h3 class="text-sm font-semibold text-content-soft mb-3">Datos del comprobante</h3>
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
          <h3 class="text-sm font-semibold text-content-soft mb-3">Importes</h3>
          <UiAlert type="info" class="mb-3">
            Escribe solo el <strong>importe total</strong> del comprobante. La base imponible e IGV se calculan automáticamente.
          </UiAlert>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="label-field">Tasa de IGV</label>
              <select v-model="presetIgv" class="select-field" @change="onPresetIgvChange">
                <option v-for="p in PRESETS_IGV" :key="p.regimen" :value="p.regimen">{{ p.label }}</option>
                <option value="PERSONALIZADA">Personalizada…</option>
              </select>
              <input
                v-if="presetIgv === 'PERSONALIZADA'"
                v-model.number="form.igvPercent"
                type="number" step="0.01" min="0" max="100"
                class="input-field mt-2"
                placeholder="Tasa %"
                @input="recalcular"
              />
              <p class="hint-field">{{ hintIgv }}</p>
            </div>
            <div>
              <label class="label-field">Importe Total * (S/)</label>
              <input v-model.number="form.importeTotal" type="number" step="0.01" :min="esNotaCredito ? undefined : 0"
                class="input-field" required @input="recalcular" />
              <p v-if="esNotaCredito" class="hint-field">
                Una nota de crédito resta: escríbela en negativo, igual que en el registro de ventas de SUNAT.
              </p>
            </div>
            <div>
              <label class="label-field">Base Imponible (S/)
                <span class="text-xs text-content-muted">(auto)</span>
              </label>
              <input v-model.number="form.baseImponible" type="number" step="0.01" class="input-field bg-surface-raised"
                :disabled="!form.modoManual" />
            </div>
            <div>
              <label class="label-field">IGV (S/)
                <span class="text-xs text-content-muted">(auto)</span>
              </label>
              <input v-model.number="form.igv" type="number" step="0.01" class="input-field bg-surface-raised"
                :disabled="!form.modoManual" />
            </div>
          </div>
          <div class="mt-2">
            <label class="flex items-center gap-2 text-sm text-content-muted cursor-pointer">
              <input v-model="form.modoManual" type="checkbox" class="rounded" />
              Modo manual (editar base e IGV directamente)
            </label>
          </div>
        </div>

        <!-- Sección 3: Clasificación tributaria -->
        <div>
          <h3 class="text-sm font-semibold text-content-soft mb-3">Clasificación tributaria</h3>
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

        <!-- Sección 4: Detracción (SPOT) -->
        <div>
          <h3 class="text-sm font-semibold text-content-soft mb-3">Detracción (SPOT)</h3>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.detraccion" type="checkbox" class="rounded" @change="onDetraccionChange" />
            Operación sujeta a detracción
          </label>
          <p class="text-xs text-content-muted mt-1">
            El comprobante se declara completo en el 0621; la detracción solo cambia lo que se cobra o se paga.
          </p>

          <div v-if="form.detraccion" class="mt-4 space-y-3">
            <UiAlert v-if="!superaUmbralDetraccion(form.importeTotal)" type="warning">
              El importe no supera los S/ {{ UMBRAL_DETRACCION }}. Los servicios del Anexo 3 solo se
              detraen por encima de ese monto; algunos bienes del Anexo 2 sí se detraen sin mínimo.
            </UiAlert>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="label-field">Bien o servicio sujeto a detracción</label>
                <select v-model="form.detraccionCodigo" class="select-field" @change="onCodigoDetraccionChange">
                  <option value="">Otro / no listado…</option>
                  <optgroup label="Anexo 3 — Servicios y construcción">
                    <option v-for="c in codigosAnexo3" :key="c.codigo" :value="c.codigo">
                      {{ c.codigo }} — {{ c.label }} ({{ c.tasa }}%)
                    </option>
                  </optgroup>
                  <optgroup label="Anexo 2 — Bienes">
                    <option v-for="c in codigosAnexo2" :key="c.codigo" :value="c.codigo">
                      {{ c.codigo }} — {{ c.label }} ({{ c.tasa }}%)
                    </option>
                  </optgroup>
                </select>
                <p class="hint-field">Las tasas son referenciales: SUNAT las cambia por resolución. Confirma con la constancia.</p>
              </div>
              <div>
                <label class="label-field">Porcentaje (%)</label>
                <input v-model.number="form.detraccionPorcentaje" type="number" step="0.01" min="0" max="100"
                  class="input-field" @input="recalcularDetraccion" />
              </div>
              <div>
                <label class="label-field">Monto de la detracción (S/)</label>
                <input v-model.number="form.detraccionMonto" type="number" step="0.01" class="input-field" />
                <p class="hint-field">
                  Depósito sugerido: S/ {{ formatMoney(detraccionCalculada.deposito) }} (el Banco de la Nación recibe soles enteros)
                </p>
              </div>
              <div>
                <label class="label-field">Nº de constancia de depósito</label>
                <input v-model="form.detraccionConstancia" type="text" class="input-field" placeholder="Ej: 00012345678" />
              </div>
              <div>
                <label class="label-field">Fecha del depósito</label>
                <input v-model="form.detraccionFechaDeposito" type="date" class="input-field" />
                <p v-if="form.tipoMovimiento === 'COMPRA'" class="hint-field">
                  Sin depósito acreditado no se puede usar el crédito fiscal de esta compra.
                </p>
              </div>
              <div class="flex items-end">
                <div class="w-full rounded-lg bg-surface-raised px-3 py-2">
                  <p class="text-xs text-content-muted">{{ etiquetaNetoDetraccion }}</p>
                  <p class="text-base font-semibold tabular-nums text-content">
                    S/ {{ formatMoney(netoDetraccion) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección 5: Opciones adicionales -->
        <div>
          <h3 class="text-sm font-semibold text-content-soft mb-3">Opciones adicionales</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="form.inventarioFinal" type="checkbox" class="rounded" />
                Inventario final
              </label>
              <p class="text-xs text-content-muted mt-1">Marcar si esta compra quedará como inventario sin vender al cierre</p>
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="form.activoFijo" type="checkbox" class="rounded" />
                Activo fijo
              </label>
              <p class="text-xs text-content-muted mt-1">Marcar si es un bien duradero (equipo, servidor, etc.)</p>
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
        <div v-if="formError" class="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-lg">
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

const { igvPorDefecto } = useAppContext()

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

/*
 * `pending` se pone en true también al refrescar tras guardar, y con él la tabla
 * desaparecía dejando un spinner. El esqueleto solo tiene sentido cuando aún no
 * hay nada que mostrar; los refrescos posteriores solo atenúan lo que ya está.
 */
const cargaInicial = computed(() => pending.value && !data.value)
const refrescando = computed(() => pending.value && !!data.value)

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
  igvPercent: 18,
  regimenIgv: 'GENERAL' as string,
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
  detraccion: false,
  detraccionCodigo: '',
  detraccionPorcentaje: 0,
  detraccionMonto: 0,
  detraccionConstancia: '',
  detraccionFechaDeposito: '',
  observacion: '',
})

function resetForm() {
  editingId.value = null
  formError.value = ''
  presetIgv.value = 'GENERAL'
  Object.assign(form, {
    fecha: new Date().toISOString().split('T')[0],
    tipoMovimiento: '',
    tipoComprobante: 'FACTURA',
    serie: '', numero: '', rucDni: '', razonSocial: '',
    afectoIgv: true, igvPercent: igvPorDefecto.value, regimenIgv: 'GENERAL',
    importeTotal: 0, baseImponible: 0, igv: 0, modoManual: false,
    medioPago: 'TRANSFERENCIA', estadoPago: 'PAGADO',
    destinoTributario: '', subcategoria: 'OTRO',
    deducibleIr: true, creditoFiscalIgv: true,
    inventarioFinal: false, activoFijo: false, vidaUtilMeses: null,
    detraccion: false, detraccionCodigo: '', detraccionPorcentaje: 0, detraccionMonto: 0,
    detraccionConstancia: '', detraccionFechaDeposito: '',
    observacion: '',
  })
}

// ─── Detracción (SPOT) ──────────────────────────────────

const esNotaCredito = computed(() => form.tipoComprobante === 'NOTA_CREDITO')

const codigosAnexo3 = CODIGOS_DETRACCION.filter(c => c.anexo === 3)
const codigosAnexo2 = CODIGOS_DETRACCION.filter(c => c.anexo === 2)

const detraccionCalculada = computed(() =>
  calcularDetraccion(form.importeTotal, form.detraccionPorcentaje)
)

/** Neto según el monto realmente guardado, que puede diferir del calculado. */
const netoDetraccion = computed(() => round2(form.importeTotal - (form.detraccionMonto || 0)))

const etiquetaNetoDetraccion = computed(() => {
  if (form.tipoMovimiento === 'VENTA') return 'Neto a cobrar'
  if (form.tipoMovimiento === 'COMPRA') return 'Neto a pagar al proveedor'
  return 'Neto tras la detracción'
})

function onDetraccionChange() {
  if (!form.detraccion) {
    form.detraccionCodigo = ''
    form.detraccionPorcentaje = 0
    form.detraccionMonto = 0
    form.detraccionConstancia = ''
    form.detraccionFechaDeposito = ''
    return
  }
  // Arranque razonable: el código genérico de servicios es el caso habitual.
  if (!form.detraccionPorcentaje) {
    form.detraccionCodigo = CODIGO_DETRACCION_GENERICO
    onCodigoDetraccionChange()
  }
}

function onCodigoDetraccionChange() {
  const tasa = tasaDetraccionSugerida(form.detraccionCodigo)
  if (tasa != null) form.detraccionPorcentaje = tasa
  recalcularDetraccion()
}

/**
 * El monto se recalcula al cambiar tasa o importe, pero sigue siendo editable:
 * manda la constancia del Banco de la Nación, que va en soles enteros.
 */
function recalcularDetraccion() {
  if (!form.detraccion) return
  form.detraccionMonto = calcularDetraccion(form.importeTotal, form.detraccionPorcentaje).monto
}

// Tasa de IGV: preset de ley o valor libre. El régimen decide a qué casillas del
// Formulario 0621 va el importe; la tasa numérica decide la aritmética.
const presetIgv = ref<string>('GENERAL')

const hintIgv = computed(() => {
  const preset = PRESETS_IGV.find(p => p.regimen === presetIgv.value)
  if (!preset) return 'Tasa distinta de las de ley; verifica el comprobante.'
  if (preset.regimen === 'GENERAL') return `Tasa vigente: ${igvPorDefecto.value}%`

  // Quien aplica la tasa reducida es el emisor del comprobante: en una compra es
  // el proveedor, no tu empresa.
  if (preset.regimen === 'LEY_31556') {
    return form.tipoMovimiento === 'VENTA'
      ? 'Tu empresa está acogida a la Ley 31556 y factura al 10% (8% IGV + 2% IPM). Va a las casillas 154 y 155.'
      : 'El proveedor —restaurante, hotel o alojamiento turístico acogido a la Ley 31556— factura al 10% (8% IGV + 2% IPM). Va a las casillas 156 y 157.'
  }

  return preset.hint
})

function onPresetIgvChange() {
  const preset = PRESETS_IGV.find(p => p.regimen === presetIgv.value)
  if (preset) {
    form.regimenIgv = preset.regimen
    form.igvPercent = preset.regimen === 'GENERAL' ? igvPorDefecto.value : preset.value
  } else {
    // Personalizada: se mantiene como operación gravada del régimen general.
    form.regimenIgv = 'GENERAL'
    if (!form.igvPercent) form.igvPercent = igvPorDefecto.value
  }
  form.afectoIgv = Number(form.igvPercent) > 0
  recalcular()
}

function presetDesdeVoucher(v: any): string {
  const regimen = v.regimenIgv || (v.afectoIgv ? 'GENERAL' : 'EXONERADO')
  if (regimen === 'EXONERADO' || regimen === 'INAFECTO') return 'EXONERADO'
  const preset = PRESETS_IGV.find(p => p.regimen === regimen)
  if (preset && (regimen === 'GENERAL' ? true : Number(v.igvPercent) === preset.value)) return regimen
  return 'PERSONALIZADA'
}

function recalcular() {
  if (!form.modoManual) {
    const { baseImponible, igv } = calcularBaseEIGV(form.importeTotal, form.afectoIgv, form.igvPercent)
    form.baseImponible = baseImponible
    form.igv = igv
  }
  recalcularDetraccion()
}

watch(() => form.afectoIgv, () => recalcular())
watch(() => form.igvPercent, () => recalcular())
// Al desmarcar el modo manual hay que recalcular: si no, base e IGV se quedan
// congelados en lo que el usuario escribió a mano.
watch(() => form.modoManual, (manual) => {
  if (!manual) recalcular()
})

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
  presetIgv.value = presetDesdeVoucher(v)
  Object.assign(form, {
    fecha: v.fecha.split('T')[0],
    tipoMovimiento: v.tipoMovimiento,
    tipoComprobante: v.tipoComprobante,
    serie: v.serie || '',
    numero: v.numero || '',
    rucDni: v.rucDni || '',
    razonSocial: v.razonSocial || '',
    afectoIgv: v.afectoIgv,
    igvPercent: Number(v.igvPercent ?? 18),
    regimenIgv: v.regimenIgv || (v.afectoIgv ? 'GENERAL' : 'EXONERADO'),
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
    detraccion: !!v.detraccion,
    detraccionCodigo: v.detraccionCodigo || '',
    detraccionPorcentaje: Number(v.detraccionPorcentaje ?? 0),
    detraccionMonto: Number(v.detraccionMonto ?? 0),
    detraccionConstancia: v.detraccionConstancia || '',
    detraccionFechaDeposito: v.detraccionFechaDeposito ? v.detraccionFechaDeposito.split('T')[0] : '',
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

function destinoColor(destino: string): 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'purple' | 'yellow' {
  const colors: Record<string, any> = {
    VENTA: 'green', COSTO_VENTAS: 'red', GASTO_ADMIN: 'blue',
    GASTO_VENTA: 'orange', ACTIVO_FIJO: 'purple', NO_DEDUCIBLE: 'gray',
  }
  return colors[destino] || 'gray'
}
</script>
