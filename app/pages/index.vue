<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-content">Dashboard</h1>
        <p class="text-content-muted text-sm">Resumen de tu situación tributaria</p>
      </div>
      <select v-model="selectedYear" class="select-field w-auto">
        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="cargaInicial" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <template v-else-if="data">
      <!-- Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8" :class="{ 'is-refreshing': refrescando }">
        <UiStatCard title="Ventas del mes" :value="data.cards.ventasMes" prefix="S/ " color="green"
          tooltip="Total de ventas facturadas en el mes seleccionado" />
        <UiStatCard title="Compras del mes" :value="data.cards.comprasMes" prefix="S/ " color="red"
          tooltip="Total de compras registradas en el mes" />
        <template v-if="aplicaIgv">
          <UiStatCard title="IGV Venta" :value="data.cards.igvVentaMes" prefix="S/ " color="blue"
            tooltip="IGV cobrado en tus ventas del mes" />
          <UiStatCard title="IGV Compra" :value="data.cards.igvCompraMes" prefix="S/ " color="blue"
            tooltip="IGV pagado en tus compras con crédito fiscal" />
          <UiStatCard title="IGV Neto del mes" :value="data.cards.igvNetoMes" prefix="S/ "
            :color="data.cards.igvNetoMes >= 0 ? 'orange' : 'green'"
            tooltip="Diferencia entre IGV de ventas y crédito fiscal de compras. Si es positivo, debes pagarlo." />
        </template>
        <UiStatCard :title="tituloIr" :value="data.cards.irSugeridoMes" prefix="S/ " color="orange"
          :tooltip="data.cards.irConcepto || 'Pago mensual de renta según tu régimen.'" />
        <UiStatCard title="Total sugerido a pagar" :value="data.cards.totalSugeridoMes" prefix="S/ " color="red"
          tooltip="Suma del IGV neto (si es positivo) + el pago mensual de renta" />
        <UiStatCard v-if="aplicaIgv" title="Saldo IGV acumulado" :value="data.cards.saldoAcumulado" prefix="S/ "
          :color="data.cards.saldoAcumulado < 0 ? 'green' : 'gray'"
          tooltip="Saldo a favor de IGV acumulado. Si es negativo, tienes crédito fiscal pendiente de aplicar." />
        <UiStatCard title="Ventas anuales" :value="data.cards.ventasAnuales" prefix="S/ " color="green"
          subtitle="Base imponible acumulada"
          tooltip="Suma de la base imponible de todas tus ventas del año" />
      </div>

      <!-- Gráficos: Lazy* carga ApexCharts en chunk aparte (mejor para Vercel / LCP) -->
      <ClientOnly>
        <LazyDashboardCharts v-if="data.charts?.length" :charts="data.charts" />
        <template #fallback>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div v-for="i in 4" :key="i" class="card h-[320px] animate-pulse bg-surface-muted rounded-xl" />
          </div>
        </template>
      </ClientOnly>

      <!-- Nota informativa -->
      <div class="mt-6">
        <UiAlert type="info">
          <strong>{{ regimenSpec?.label ?? 'Tu régimen' }}:</strong> {{ regimenSpec?.descripcion }}<br/>
          <template v-if="aplicaIgv">
            El <b>IGV neto</b> es lo que debes pagar a SUNAT por concepto de IGV: tus ventas generan IGV a pagar, pero tus compras con factura te dan crédito fiscal que se descuenta.
          </template>
          <template v-if="data.cards.irConcepto">
            El pago mensual de renta de este mes es: <b>{{ data.cards.irConcepto }}</b>.
          </template>
        </UiAlert>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const { data, pending, refresh } = useFetch('/api/dashboard', {
  query: computed(() => ({ year: selectedYear.value })),
})

/*
 * `pending` se pone en true también al refrescar tras guardar, y con él la tabla
 * desaparecía dejando un spinner. El esqueleto solo tiene sentido cuando aún no
 * hay nada que mostrar; los refrescos posteriores solo atenúan lo que ya está.
 */
const cargaInicial = computed(() => pending.value && !data.value)
const refrescando = computed(() => pending.value && !!data.value)

const regimenSpec = computed(() => (data.value as any)?.regimenSpec ?? null)
const aplicaIgv = computed(() => regimenSpec.value?.aplicaIgv !== false)

const tituloIr = computed(() => {
  if (regimenSpec.value?.code === 'NRUS') return 'Cuota NRUS del mes'
  if (regimenSpec.value?.irMensualDefinitivo) return 'Renta del mes (definitiva)'
  return 'IR Mensual sugerido'
})

watch(selectedYear, () => refresh())
</script>
