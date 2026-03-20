<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p class="text-gray-500 text-sm">Resumen de tu situación tributaria</p>
      </div>
      <select v-model="selectedYear" class="select-field w-auto">
        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <template v-else-if="data">
      <!-- Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <UiStatCard title="Ventas del mes" :value="data.cards.ventasMes" prefix="S/ " color="green"
          tooltip="Total de ventas facturadas en el mes seleccionado" />
        <UiStatCard title="Compras del mes" :value="data.cards.comprasMes" prefix="S/ " color="red"
          tooltip="Total de compras registradas en el mes" />
        <UiStatCard title="IGV Venta" :value="data.cards.igvVentaMes" prefix="S/ " color="blue"
          tooltip="IGV cobrado en tus ventas del mes" />
        <UiStatCard title="IGV Compra" :value="data.cards.igvCompraMes" prefix="S/ " color="blue"
          tooltip="IGV pagado en tus compras con crédito fiscal" />
        <UiStatCard title="IGV Neto del mes" :value="data.cards.igvNetoMes" prefix="S/ "
          :color="data.cards.igvNetoMes >= 0 ? 'orange' : 'green'"
          tooltip="Diferencia entre IGV de ventas y crédito fiscal de compras. Si es positivo, debes pagarlo." />
        <UiStatCard title="IR Mensual sugerido" :value="data.cards.irSugeridoMes" prefix="S/ " color="orange"
          tooltip="Pago a cuenta IR = 1% de la base imponible de ventas. Es una referencia configurable." />
        <UiStatCard title="Total sugerido a pagar" :value="data.cards.totalSugeridoMes" prefix="S/ " color="red"
          tooltip="Suma del IGV neto (si es positivo) + pago a cuenta IR sugerido" />
        <UiStatCard title="Saldo IGV acumulado" :value="data.cards.saldoAcumulado" prefix="S/ "
          :color="data.cards.saldoAcumulado < 0 ? 'green' : 'gray'"
          tooltip="Saldo a favor de IGV acumulado. Si es negativo, tienes crédito fiscal pendiente de aplicar." />
        <UiStatCard title="Ventas anuales" :value="data.cards.ventasAnuales" prefix="S/ " color="green"
          subtitle="Base imponible acumulada"
          tooltip="Suma de la base imponible de todas tus ventas del año" />
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-4">Ventas mensuales</h3>
          <ClientOnly>
            <apexchart type="bar" height="280" :options="ventasChartOptions" :series="ventasSeries" />
          </ClientOnly>
        </div>
        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-4">Compras mensuales</h3>
          <ClientOnly>
            <apexchart type="bar" height="280" :options="comprasChartOptions" :series="comprasSeries" />
          </ClientOnly>
        </div>
        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-4">IGV Neto por mes</h3>
          <ClientOnly>
            <apexchart type="line" height="280" :options="igvChartOptions" :series="igvSeries" />
          </ClientOnly>
        </div>
        <div class="card">
          <h3 class="text-sm font-medium text-gray-500 mb-4">IR Mensual sugerido</h3>
          <ClientOnly>
            <apexchart type="area" height="280" :options="irChartOptions" :series="irSeries" />
          </ClientOnly>
        </div>
      </div>

      <!-- Nota informativa -->
      <div class="mt-6">
        <UiAlert type="info">
          <strong>¿Qué significan estos números?</strong><br/>
          El <b>IGV neto</b> es lo que debes pagar a SUNAT por concepto de IGV: tus ventas generan IGV a pagar, pero tus compras con factura te dan crédito fiscal que se descuenta. El <b>IR mensual</b> es un pago a cuenta del impuesto a la renta (1% de tus ventas netas en el RMT). Ambos se pagan mensualmente.
        </UiAlert>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { MESES } = useTaxCalculations()

const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const { data, pending, refresh } = useFetch('/api/dashboard', {
  query: computed(() => ({ year: selectedYear.value })),
})

watch(selectedYear, () => refresh())

const mesesLabels = MESES.slice(1)

const ventasSeries = computed(() => [{
  name: 'Ventas',
  data: data.value?.charts.map((c: any) => c.ventas) || [],
}])

const comprasSeries = computed(() => [{
  name: 'Compras',
  data: data.value?.charts.map((c: any) => c.compras) || [],
}])

const igvSeries = computed(() => [{
  name: 'IGV Neto',
  data: data.value?.charts.map((c: any) => c.igvNeto) || [],
}])

const irSeries = computed(() => [{
  name: 'IR Sugerido',
  data: data.value?.charts.map((c: any) => c.irSugerido) || [],
}])

const baseChartOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
  xaxis: { categories: mesesLabels },
  yaxis: { labels: { formatter: (v: number) => `S/ ${Math.round(v)}` } },
  tooltip: { y: { formatter: (v: number) => `S/ ${v.toFixed(2)}` } },
  dataLabels: { enabled: false },
}

const ventasChartOptions = {
  ...baseChartOptions,
  colors: ['#10B981'],
}

const comprasChartOptions = {
  ...baseChartOptions,
  colors: ['#EF4444'],
}

const igvChartOptions = {
  ...baseChartOptions,
  colors: ['#3B82F6'],
  stroke: { width: 3, curve: 'smooth' as const },
}

const irChartOptions = {
  ...baseChartOptions,
  colors: ['#F59E0B'],
  stroke: { width: 2, curve: 'smooth' as const },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
}
</script>
