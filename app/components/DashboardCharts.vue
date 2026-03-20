<script setup lang="ts">
/**
 * Gráficos del dashboard — componente separado para code-splitting (ApexCharts ~700KB).
 */
import VueApexChart from 'vue3-apexcharts'

export interface ChartRow {
  month: number
  ventas: number
  compras: number
  igvNeto: number
  irSugerido: number
}

const props = defineProps<{ charts: ChartRow[] }>()

const { MESES } = useTaxCalculations()
const mesesLabels = MESES.slice(1)

const ventasSeries = computed(() => [{
  name: 'Ventas',
  data: props.charts.map(c => c.ventas),
}])

const comprasSeries = computed(() => [{
  name: 'Compras',
  data: props.charts.map(c => c.compras),
}])

const igvSeries = computed(() => [{
  name: 'IGV Neto',
  data: props.charts.map(c => c.igvNeto),
}])

const irSeries = computed(() => [{
  name: 'IR Sugerido',
  data: props.charts.map(c => c.irSugerido),
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

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="card">
      <h3 class="text-sm font-medium text-gray-500 mb-4">Ventas mensuales</h3>
      <VueApexChart type="bar" height="280" :options="ventasChartOptions" :series="ventasSeries" />
    </div>
    <div class="card">
      <h3 class="text-sm font-medium text-gray-500 mb-4">Compras mensuales</h3>
      <VueApexChart type="bar" height="280" :options="comprasChartOptions" :series="comprasSeries" />
    </div>
    <div class="card">
      <h3 class="text-sm font-medium text-gray-500 mb-4">IGV Neto por mes</h3>
      <VueApexChart type="line" height="280" :options="igvChartOptions" :series="igvSeries" />
    </div>
    <div class="card">
      <h3 class="text-sm font-medium text-gray-500 mb-4">IR Mensual sugerido</h3>
      <VueApexChart type="area" height="280" :options="irChartOptions" :series="irSeries" />
    </div>
  </div>
</template>
