<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Resumen Mensual</h1>
        <p class="text-gray-500 text-sm">IGV e IR mes a mes — compara lo calculado vs. lo que pagaste</p>
      </div>
      <div>
        <select v-model="year" class="select-field">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <UiAlert type="info" class="mb-4">
      <strong>IGV (período):</strong> débito fiscal (ventas) − crédito fiscal (compras con crédito fiscal). El <strong>saldo a favor</strong> (crédito no usado) se arrastra mes a mes aunque no haya movimiento en el mes.<br>
      <strong>Desde {{ igvDebtFromYear }}:</strong> si registras menos IGV pagado que lo sugerido, la <strong>deuda referencial</strong> se acumula al mes siguiente (la app no arrastra deuda de años anteriores a {{ igvDebtFromYear }}). En SUNAT el no pago genera deuda e intereses aparte del PDT; esto es para tu control interno.<br>
      <strong>IR:</strong> 1% de ventas netas (pago a cuenta RMT).
    </UiAlert>

    <div class="card overflow-hidden">
      <!-- Barra superior de la tabla -->
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <!-- Toggle redondeo -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">Decimales:</span>
          <button @click="rounded = !rounded"
            class="relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none"
            :class="rounded ? 'bg-gray-300' : 'bg-blue-600'">
            <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
              :class="rounded ? 'translate-x-1' : 'translate-x-7'" />
          </button>
          <span class="text-xs font-medium" :class="rounded ? 'text-gray-400' : 'text-blue-600'">
            {{ rounded ? 'Sin decimales (SUNAT)' : 'Con decimales (exacto)' }}
          </span>
        </div>

        <!-- Selector de columnas -->
        <div class="relative" ref="colMenuRef">
          <button @click="showColMenu = !showColMenu"
            class="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columnas
            <span class="text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 font-medium">
              {{ visibleCols.length }}/{{ allColumns.length }}
            </span>
          </button>

          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="scale-95 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-95 opacity-0">
            <div v-if="showColMenu"
              class="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Columnas visibles</p>
                <button @click="resetCols" class="text-xs text-blue-600 hover:underline">Restaurar todo</button>
              </div>
              <div class="space-y-0.5">
                <label v-for="col in allColumns" :key="col.key"
                  class="flex items-center gap-2 py-1.5 px-1.5 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" v-model="visibleCols" :value="col.key" class="rounded text-blue-600" />
                  <span class="text-sm text-gray-700 flex-1">{{ col.label }}</span>
                  <span v-if="col.casilla"
                    class="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    cas.{{ col.casilla }}
                  </span>
                </label>
              </div>
            </div>
          </transition>
        </div>
      </div><!-- /top bar -->

      <div v-if="pending" class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-600 text-left">
              <th class="px-3 py-3 font-medium">Mes</th>
              <th v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-2 font-medium text-right whitespace-nowrap" :class="col.thBg">
                <div class="flex flex-col items-end leading-tight gap-0.5">
                  <span>{{ col.label }}</span>
                  <span v-if="col.casilla" class="text-[10px] font-mono text-gray-400 font-normal">
                    cas. {{ col.casilla }}
                  </span>
                </div>
              </th>
              <th class="px-3 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in meses" :key="m.month"
              class="border-t border-gray-100 hover:bg-gray-50"
              :class="{ 'opacity-40': !m.baseVentas && !m.baseCompras }">
              <td class="px-3 py-2.5 font-medium text-gray-700 whitespace-nowrap">{{ MESES[m.month] }}</td>

              <td v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-2.5 text-right" :class="col.tdBg">
                <!-- IGV Resultante: positivo = a pagar, negativo = saldo a favor -->
                <template v-if="col.key === 'igvNeto'">
                  <span :class="m.igvNeto > 0 ? 'text-blue-700 font-semibold' : m.igvNeto < 0 ? 'text-emerald-600' : 'text-gray-300'">
                    {{ m.igvNeto > 0
                      ? `S/ ${fmt(m.igvNeto)}`
                      : m.igvNeto < 0
                        ? `(S/ ${fmt(Math.abs(m.igvNeto))}) fav.`
                        : '-' }}
                  </span>
                </template>

                <!-- Saldo a favor anterior arrastrado del mes previo -->
                <template v-else-if="col.key === 'saldoFavorAnterior'">
                  <span class="text-gray-400 text-xs">
                    {{ m.saldoFavorAnterior > 0 ? `(S/ ${fmt(m.saldoFavorAnterior)}) fav.` : '-' }}
                  </span>
                </template>

                <!-- Pago IGV efectuado (editable) -->
                <template v-else-if="col.key === 'pagoIgvEfectuado'">
                  <input v-if="editingMonth === m.month" v-model.number="editPayments.pagoIgvEfectuado"
                    type="number" step="1" min="0"
                    class="input-field text-right w-24 py-1 text-sm" />
                  <span v-else :class="m.pagoIgvEfectuado ? 'text-green-700 font-medium' : 'text-gray-300'">
                    {{ m.pagoIgvEfectuado ? `S/ ${fmt(m.pagoIgvEfectuado)}` : '-' }}
                  </span>
                </template>

                <!-- Pago IR efectuado (editable) -->
                <template v-else-if="col.key === 'pagoIrEfectuado'">
                  <input v-if="editingMonth === m.month" v-model.number="editPayments.pagoIrEfectuado"
                    type="number" step="1" min="0"
                    class="input-field text-right w-24 py-1 text-sm" />
                  <span v-else :class="m.pagoIrEfectuado ? 'text-green-700 font-medium' : 'text-gray-300'">
                    {{ m.pagoIrEfectuado ? `S/ ${fmt(m.pagoIrEfectuado)}` : '-' }}
                  </span>
                </template>

                <!-- Pago total (suma IGV + IR efectuados, solo lectura) -->
                <template v-else-if="col.key === 'pagoTotalEfectuado'">
                  <span :class="m.pagoTotalEfectuado ? 'text-green-800 font-semibold' : 'text-gray-300'">
                    {{ m.pagoTotalEfectuado ? `S/ ${fmt(m.pagoTotalEfectuado)}` : '-' }}
                  </span>
                </template>

                <template v-else-if="col.key === 'igvDeudaCierreMes'">
                  <span
                    :class="m.igvDeudaCierreMes > 0 ? 'text-orange-800 font-medium' : 'text-gray-300'"
                    :title="year >= igvDebtFromYear ? 'Deuda IGV referencial tras el mes (no pagado acumulado)' : ''">
                    {{ m.igvDeudaCierreMes > 0 ? `S/ ${fmt(m.igvDeudaCierreMes)}` : '-' }}
                  </span>
                </template>

                <!-- Columnas de dinero estándar -->
                <template v-else>
                  <span :class="(m as any)[col.key] > 0 ? col.textColor : 'text-gray-300'">
                    {{ (m as any)[col.key] > 0 ? `S/ ${fmt((m as any)[col.key])}` : '-' }}
                  </span>
                </template>
              </td>

              <td class="px-3 py-2.5 text-center whitespace-nowrap">
                <template v-if="editingMonth === m.month">
                  <button @click="savePayment(m.month)"
                    class="text-green-600 text-sm font-medium hover:underline mr-1">Guardar</button>
                  <button @click="editingMonth = null"
                    class="text-gray-400 text-sm hover:underline">✕</button>
                </template>
                <template v-else>
                  <button @click="startEdit(m)"
                    class="text-blue-600 text-sm hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!m.baseVentas && !m.baseCompras">
                    Editar pago
                  </button>
                </template>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td class="px-3 py-3 text-gray-700">TOTAL</td>
              <td v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-3 text-right" :class="col.tdBg">
                <template v-if="col.key === 'igvNeto'">
                  <span class="text-blue-700">S/ {{ fmt(totales.igvNeto) }}</span>
                </template>
                <template v-else-if="col.key === 'saldoFavorAnterior'">
                  <span class="text-gray-400">—</span>
                </template>
                <template v-else-if="col.key === 'pagoIgvEfectuado'">
                  <span class="text-green-700">S/ {{ fmt(totales.pagoIgv) }}</span>
                </template>
                <template v-else-if="col.key === 'pagoIrEfectuado'">
                  <span class="text-green-700">S/ {{ fmt(totales.pagoIr) }}</span>
                </template>
                <template v-else-if="col.key === 'pagoTotalEfectuado'">
                  <span class="text-green-800 font-semibold">S/ {{ fmt(totales.pagoTotalEfectuado) }}</span>
                </template>
                <template v-else-if="col.key === 'igvDeudaCierreMes'">
                  <span class="text-orange-800" title="Saldo de deuda IGV al cierre de diciembre (referencial)">
                    {{ totales.igvDeudaCierreDic > 0 ? `S/ ${fmt(totales.igvDeudaCierreDic)}` : '—' }}
                  </span>
                </template>
                <template v-else>
                  <span :class="col.textColor">S/ {{ fmt((totales as any)[col.key] ?? 0) }}</span>
                </template>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { formatMoney, formatMoneyInt, MESES } = useTaxCalculations()

/** true = sin decimales (SUNAT), false = con 2 decimales (exacto) */
const rounded = ref(true)
const fmt = (v: number) => rounded.value ? formatMoneyInt(v) : formatMoney(v)

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
const year = ref(currentYear)

const { data, pending, refresh } = useFetch('/api/monthly-summary', {
  query: computed(() => ({ year: year.value })),
})

const igvDebtFromYear = computed(() => Number(data.value?.igvDebtAccrualFromYear ?? 2026))

/** Normaliza la respuesta de la API al modelo que usa la tabla */
const meses = computed(() => {
  const raw = data.value?.summaries ?? data.value?.months ?? []
  return raw.map((r: any) => {
    const baseV     = Number(r.baseVentas ?? 0)
    const igvV      = Number(r.igvVentas ?? 0)
    const baseCf    = Number(r.baseComprasCreditoFiscal ?? 0)
    const igvCf     = Number(r.igvComprasCreditoFiscal ?? 0)
    const noDed     = Number(r.comprasNoDeducibles ?? 0)
    const saldoAnt  = Number(r.saldoIgvMesAnterior ?? 0)
    const igvNetoMs = Number(r.igvNetoMes ?? 0)
    const saldoMes  = Number(r.saldoIgvMes ?? 0)
    const igvNeto   = igvNetoMs > 0 ? igvNetoMs : saldoMes < 0 ? saldoMes : 0
    return {
      ...r,
      baseVentas:         baseV,
      igvVentas:          igvV,
      totalVentas:        Number(r.totalVentas ?? baseV + igvV),
      baseCompras:        baseCf,
      igvCompras:         igvCf,
      totalCompras:       baseCf + igvCf + noDed,
      saldoFavorAnterior: saldoAnt < 0 ? Math.abs(saldoAnt) : 0,
      igvNeto,
      irSugerido:            Number(r.pagoIrSugerido ?? 0),
      pagoIgvEfectuado:      Number(r.pagoIgvEfectuado ?? 0),
      pagoIrEfectuado:       Number(r.pagoIrEfectuado ?? 0),
      pagoTotalEfectuado:    Number(r.pagoIgvEfectuado ?? 0) + Number(r.pagoIrEfectuado ?? 0),
      igvDeudaCierreMes:     Number(r.igvDeudaCierreMes ?? 0),
      igvSugeridoPagoTotal:  Number(r.igvSugeridoPagoTotal ?? 0),
    }
  })
})

const totales = computed(() => {
  const m = meses.value
  return {
    baseVentas:  m.reduce((s: number, x: any) => s + x.baseVentas, 0),
    igvVentas:   m.reduce((s: number, x: any) => s + x.igvVentas, 0),
    totalVentas: m.reduce((s: number, x: any) => s + x.totalVentas, 0),
    baseCompras: m.reduce((s: number, x: any) => s + x.baseCompras, 0),
    igvCompras:  m.reduce((s: number, x: any) => s + x.igvCompras, 0),
    totalCompras: m.reduce((s: number, x: any) => s + x.totalCompras, 0),
    igvNeto:            m.reduce((s: number, x: any) => s + (x.igvNeto > 0 ? x.igvNeto : 0), 0),
    irSugerido:         m.reduce((s: number, x: any) => s + x.irSugerido, 0),
    pagoIgv:            m.reduce((s: number, x: any) => s + x.pagoIgvEfectuado, 0),
    pagoIr:             m.reduce((s: number, x: any) => s + x.pagoIrEfectuado, 0),
    pagoTotalEfectuado: m.reduce((s: number, x: any) => s + x.pagoTotalEfectuado, 0),
    igvDeudaCierreDic: m.length ? Number(m[m.length - 1].igvDeudaCierreMes ?? 0) : 0,
  }
})

// ─── Definición de columnas ────────────────────────────
const allColumns = [
  {
    key: 'baseVentas',
    label: 'Op. Grav. Ventas',
    casilla: '100',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-700',
  },
  {
    key: 'igvVentas',
    label: 'IGV Ventas',
    casilla: '101',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-600',
  },
  {
    key: 'totalVentas',
    label: 'Total Ventas',
    casilla: null,
    thBg: 'bg-emerald-50',
    tdBg: 'bg-emerald-50/50',
    textColor: 'text-emerald-800 font-semibold',
  },
  {
    key: 'baseCompras',
    label: 'Op. Grav. Compras',
    casilla: '107',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-600',
  },
  {
    key: 'igvCompras',
    label: 'IGV Compras',
    casilla: '108',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-500',
  },
  {
    key: 'totalCompras',
    label: 'Total Compras',
    casilla: null,
    thBg: 'bg-red-50',
    tdBg: 'bg-red-50/50',
    textColor: 'text-red-700 font-semibold',
  },
  {
    key: 'saldoFavorAnterior',
    label: 'Saldo Ant.',
    casilla: '145',
    thBg: '',
    tdBg: '',
    textColor: 'text-gray-400',
  },
  {
    key: 'igvNeto',
    label: 'IGV Resultante',
    casilla: '140',
    thBg: 'bg-blue-50',
    tdBg: 'bg-blue-50/50',
    textColor: 'text-blue-700',
  },
  {
    key: 'igvDeudaCierreMes',
    label: 'IGV deuda acum.',
    casilla: null,
    thBg: 'bg-orange-50',
    tdBg: 'bg-orange-50/50',
    textColor: 'text-orange-800 font-medium',
  },
  {
    key: 'irSugerido',
    label: 'IR Sugerido',
    casilla: '302',
    thBg: 'bg-amber-50',
    tdBg: 'bg-amber-50/50',
    textColor: 'text-amber-700',
  },
  {
    key: 'pagoIgvEfectuado',
    label: 'Pago IGV',
    casilla: null,
    thBg: 'bg-green-50',
    tdBg: 'bg-green-50/50',
    textColor: 'text-green-700',
  },
  {
    key: 'pagoIrEfectuado',
    label: 'Pago IR',
    casilla: null,
    thBg: 'bg-green-50',
    tdBg: 'bg-green-50/50',
    textColor: 'text-green-700',
  },
  {
    key: 'pagoTotalEfectuado',
    label: 'Total Pagado SUNAT',
    casilla: null,
    thBg: 'bg-green-100',
    tdBg: 'bg-green-100/50',
    textColor: 'text-green-800 font-semibold',
  },
]

const defaultVisible = allColumns.map(c => c.key)
const visibleCols = ref<string[]>([...defaultVisible])
function resetCols() { visibleCols.value = [...defaultVisible] }

const visibleColumnDefs = computed(() =>
  allColumns.filter(c => visibleCols.value.includes(c.key))
)

// ─── Menú de columnas (cerrar al hacer click afuera) ──
const showColMenu = ref(false)
const colMenuRef = ref<HTMLElement | null>(null)
function handleOutsideClick(e: MouseEvent) {
  if (colMenuRef.value && !colMenuRef.value.contains(e.target as Node)) {
    showColMenu.value = false
  }
}
onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))

// ─── Edición de pagos efectuados ─────────────────────
const editingMonth = ref<number | null>(null)
const editPayments = reactive({ pagoIgvEfectuado: 0, pagoIrEfectuado: 0 })

function startEdit(m: any) {
  editingMonth.value = m.month
  const sugeridoIgv = Math.round(Number(m.igvSugeridoPagoTotal ?? 0))
  editPayments.pagoIgvEfectuado = m.pagoIgvEfectuado || sugeridoIgv
  editPayments.pagoIrEfectuado = m.pagoIrEfectuado || Math.round(m.irSugerido)
}

async function savePayment(month: number) {
  await $fetch('/api/monthly-summary/update', {
    method: 'PUT',
    body: {
      year: year.value,
      month,
      pagoIgvEfectuado: editPayments.pagoIgvEfectuado,
      pagoIrEfectuado:  editPayments.pagoIrEfectuado,
      pagoTotalEfectuado: editPayments.pagoIgvEfectuado + editPayments.pagoIrEfectuado,
    },
  })
  editingMonth.value = null
  refresh()
}
</script>
