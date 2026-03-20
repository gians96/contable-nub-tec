<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Cierre Anual</h1>
        <p class="text-gray-500 text-sm">Cálculo referencial del Impuesto a la Renta anual — Formulario Virtual 710</p>
      </div>
      <div>
        <select v-model="year" class="select-field">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <UiAlert type="warning" class="mb-4">
      Esto es una <strong>estimación referencial</strong> basada en tus comprobantes. El cálculo oficial lo realiza SUNAT y/o tu contador.
      (Régimen MYPE Tributario: 10% hasta 15 UIT, 29.5% sobre el exceso).
    </UiAlert>

    <div v-if="pending" class="flex items-center justify-center py-10">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>

    <template v-else-if="data && closure">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Panel izquierdo: Resultado -->
        <div class="space-y-4">
          <div class="card">
            <h2 class="text-lg font-semibold text-gray-700 mb-4">Resultado del ejercicio {{ year }}</h2>
            <div class="space-y-3">
              <Row label="Ingresos brutos (ventas)" :value="closure.ingresosNetos" />
              <Row label="Costo de ventas" :value="closure.costoVentas" negative />
              <Row label="Utilidad bruta" :value="closure.utilidadBruta" bold />
              <hr class="border-gray-200" />
              <Row label="Gastos administrativos" :value="closure.gastosAdministrativos" negative />
              <Row label="Gastos de venta" :value="closure.gastosVenta" negative />
              <Row label="Depreciación" :value="closure.depreciacion" negative />
              <Row label="Otros ingresos" :value="closure.otrosIngresos" editable
                @edit="editField('otrosIngresos', closure.otrosIngresos)" />
              <Row label="Otros gastos" :value="closure.otrosGastos" negative editable
                @edit="editField('otrosGastos', closure.otrosGastos)" />
              <Row label="Descuentos" :value="closure.descuentos" negative editable
                @edit="editField('descuentos', closure.descuentos)" />
              <hr class="border-gray-200" />
              <Row :label="closure.rentaNeta >= 0 ? 'Utilidad antes de adiciones/deducciones' : 'Pérdida antes de adiciones/deducciones'"
                :value="Math.abs(closure.rentaNeta)" :negative="closure.rentaNeta < 0" bold />
              <Row label="(+) Adiciones tributarias" :value="closure.adiciones" editable
                @edit="editField('adiciones', closure.adiciones)" />
              <Row label="(-) Deducciones tributarias" :value="closure.deducciones" negative editable
                @edit="editField('deducciones', closure.deducciones)" />
              <Row v-if="closure.rentaNetaImponible > 0" label="Renta neta imponible" :value="closure.rentaNetaImponible" bold highlight />
              <Row v-else label="Pérdida neta del ejercicio" :value="Math.abs(closure.rentaNeta + closure.adiciones - closure.deducciones)" negative bold highlight />
            </div>
          </div>

          <div class="card">
            <h2 class="text-lg font-semibold text-gray-700 mb-4">Impuesto calculado (RMT)</h2>
            <div class="space-y-3">
              <Row label="UIT del ejercicio" :value="closure.uit" />
              <Row label="Límite 15 UIT" :value="closure.limite15UIT" />
              <Row label="Tramo 10% (hasta 15 UIT)" :value="closure.ir10" />
              <Row label="Tramo 29.5% (exceso)" :value="closure.ir295" />
              <Row label="IR anual calculado" :value="closure.irAnualTotal" bold highlight />
              <hr class="border-gray-200" />
              <Row label="(-) Pagos a cuenta realizados" :value="closure.pagosACuenta" negative />
              <Row label="(-) Retenciones" :value="closure.retenciones" negative editable
                @edit="editField('retenciones', closure.retenciones)" />
              <Row label="(-) Saldo a favor anterior" :value="closure.saldoFavorAnterior" negative editable
                @edit="editField('saldoFavorAnterior', closure.saldoFavorAnterior)" />
              <hr class="border-gray-200" />
              <div class="flex justify-between items-center py-2 px-3 rounded-lg"
                :class="closure.saldoPorRegularizar >= 0 ? 'bg-red-50' : 'bg-green-50'">
                <span class="font-bold text-gray-700">
                  {{ closure.saldoPorRegularizar >= 0 ? 'IR por pagar' : 'Saldo a favor' }}
                </span>
                <span class="text-lg font-bold"
                  :class="closure.saldoPorRegularizar >= 0 ? 'text-red-700' : 'text-green-700'">
                  S/ {{ formatMoney(Math.abs(closure.saldoPorRegularizar)) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel derecho: FV 710 -->
        <div class="card">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">
            Referencia FV 710 — Casillas
          </h2>
          <p class="text-xs text-gray-400 mb-4">
            Estas son las casillas principales que tu contador usaría. Son valores referenciales.
          </p>

          <div class="space-y-2">
            <template v-for="(casillas, grupo) in casillasAgrupadas" :key="grupo">
              <h3 class="text-sm font-semibold text-gray-600 mt-4 mb-2">{{ grupo }}</h3>
              <div v-for="c in casillas" :key="c.casilla"
                class="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50 text-sm">
                <div>
                  <span class="inline-flex items-center justify-center w-12 h-6 bg-gray-100 rounded text-xs font-mono text-gray-600 mr-2">
                    {{ c.casilla }}
                  </span>
                  <span class="text-gray-700">{{ c.etiqueta }}</span>
                </div>
                <span class="font-medium" :class="c.sunat ? 'text-gray-800' : 'text-gray-400'">
                  {{ c.sunat ? `S/ ${formatMoneyInt(c.sunat)}` : '0' }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal edición rápida -->
    <UiModal v-model="showEdit" title="Editar valor" size="sm">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">{{ editLabel }}</p>
        <div>
          <label class="label-field">Monto (S/)</label>
          <input v-model.number="editValue" type="number" step="0.01" class="input-field" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button @click="showEdit = false" class="btn-secondary">Cancelar</button>
          <button @click="saveEdit" class="btn-primary" :disabled="savingEdit">Guardar</button>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const { formatMoney, formatMoneyInt } = useTaxCalculations()

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
const year = ref(currentYear)

const { data, pending, refresh } = useFetch('/api/annual-closure', {
  query: computed(() => ({ year: year.value })),
})

/** La API devuelve el cierre en plano (`ventasNetas`, …), no bajo `closure` */
const closure = computed(() => {
  const d = data.value as Record<string, any> | null
  if (!d) return null
  const uit = Number(d.parametros?.uit ?? 5150)
  const tramo1Limit = Number(d.parametros?.tramo1Limit ?? 15)
  const tramo1Rate = Number(d.parametros?.tramo1Rate ?? 10)
  const tramo2Rate = Number(d.parametros?.tramo2Rate ?? 29.5)
  const limite15UIT = tramo1Limit * uit
  const rni = Number(d.rentaNetaImponible ?? 0)
  let ir10 = 0
  let ir295 = 0
  if (rni <= limite15UIT) {
    ir10 = rni * tramo1Rate / 100
  } else {
    ir10 = limite15UIT * tramo1Rate / 100
    ir295 = (rni - limite15UIT) * tramo2Rate / 100
  }
  const saldoPorPagar = Number(d.saldoPorPagar ?? 0)
  const saldoAFavor = Number(d.saldoAFavor ?? 0)
  const saldoPorRegularizar = saldoPorPagar > 0 ? saldoPorPagar : -saldoAFavor
  return {
    ingresosNetos: Number(d.ventasNetas),
    costoVentas: Number(d.costoVentas),
    utilidadBruta: Number(d.utilidadBruta),
    gastosAdministrativos: Number(d.gastosAdministracion),
    gastosVenta: Number(d.gastosVentas),
    depreciacion: 0,
    otrosIngresos: Number(d.otrosIngresos ?? 0),
    otrosGastos: Number(d.otrosGastos ?? 0),
    descuentos: Number(d.descuentos ?? 0),
    rentaNeta: Number(d.utilidadContable),
    adiciones: Number(d.adiciones ?? 0),
    deducciones: Number(d.deducciones ?? 0),
    rentaNetaImponible: rni,
    uit,
    limite15UIT,
    ir10,
    ir295,
    irAnualTotal: Number(d.impuestoAnual),
    pagosACuenta: Number(d.pagosCuentaAcumulados),
    retenciones: Number(d.retenciones ?? 0),
    saldoFavorAnterior: Number(d.saldoFavorAnterior ?? 0),
    saldoPorRegularizar,
  }
})

const casillasLista = computed(() => {
  const f = data.value?.fv710 as Record<string, { valor: number; sunat: number; desc: string }> | undefined
  if (!f || typeof f !== 'object') return []
  return Object.entries(f)
    .map(([key, v]) => {
      const m = key.match(/casilla(\d+)/)
      const casilla = m ? Number(m[1]) : 0
      return { casilla, etiqueta: v.desc, sunat: Number(v.sunat) }
    })
    .filter((c) => c.casilla > 0)
    .sort((a, b) => a.casilla - b.casilla)
})

const casillasAgrupadas = computed(() => {
  const c = casillasLista.value
  return {
    'Estado de Resultados': c.filter((x) => [461, 462, 464, 468, 469, 475, 480].includes(x.casilla)),
    'Impuesto a la Renta': c.filter((x) => [100, 101, 103, 105, 107, 110].includes(x.casilla)),
    'Determinación': c.filter((x) => [113, 128, 138, 139].includes(x.casilla)),
  }
})

// Edición de campos manuales
const showEdit = ref(false)
const editField_ = ref('')
const editLabel = ref('')
const editValue = ref(0)
const savingEdit = ref(false)

function editField(field: string, currentValue: number) {
  const labels: Record<string, string> = {
    otrosIngresos: 'Otros ingresos no registrados como comprobantes',
    otrosGastos: 'Otros gastos no registrados como comprobantes',
    descuentos: 'Descuentos otorgados',
    adiciones: 'Adiciones tributarias (gastos no deducibles)',
    deducciones: 'Deducciones tributarias',
    retenciones: 'Retenciones de IR realizadas por terceros',
    saldoFavorAnterior: 'Saldo a favor del ejercicio anterior',
  }
  editField_.value = field
  editLabel.value = labels[field] || field
  editValue.value = currentValue || 0
  showEdit.value = true
}

async function saveEdit() {
  savingEdit.value = true
  try {
    await $fetch('/api/annual-closure/update', {
      method: 'PUT',
      body: {
        year: year.value,
        [editField_.value]: editValue.value,
      },
    })
    showEdit.value = false
    refresh()
  } finally {
    savingEdit.value = false
  }
}

// Componente Row inline
const Row = defineComponent({
  props: {
    label: String,
    value: { type: Number, default: 0 },
    negative: Boolean,
    bold: Boolean,
    highlight: Boolean,
    editable: Boolean,
  },
  emits: ['edit'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        class: [
          'flex items-center justify-between py-1.5',
          props.highlight ? 'bg-blue-50 px-3 rounded-lg' : '',
        ],
      }, [
        h('div', { class: 'flex items-center gap-1' }, [
          h('span', {
            class: [
              props.bold ? 'font-semibold text-gray-800' : 'text-gray-600',
              'text-sm',
            ],
          }, props.label),
          props.editable
            ? h('button', {
                class: 'text-blue-500 text-xs hover:underline ml-1',
                onClick: () => emit('edit'),
              }, '(editar)')
            : null,
        ]),
        h('span', {
          class: [
            'text-sm font-medium',
            props.bold ? 'text-gray-900' : '',
            props.negative ? 'text-red-600' : '',
            props.highlight ? 'text-blue-800 font-bold' : '',
          ],
        }, `${props.negative && props.value ? '-' : ''}S/ ${useTaxCalculations().formatMoney(Math.abs(props.value || 0))}`),
      ])
  },
})
</script>
