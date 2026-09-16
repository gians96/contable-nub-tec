<template>
  <div>
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-content">Resumen Mensual</h1>
        <p class="text-content-muted text-sm">IGV e IR mes a mes — compara lo calculado vs. lo que pagaste</p>
      </div>
      <div>
        <select v-model="year" class="select-field">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <UiAlert type="info" class="mb-4">
      <strong>{{ regimenSpec?.label }}:</strong> {{ regimenSpec?.descripcion }} Declaras con <strong>{{ regimenSpec?.formularioMensual }}</strong>.<br>
      <template v-if="regimenSpec?.aplicaIgv">
        <strong>IGV (período):</strong> débito fiscal (ventas) − crédito fiscal (compras con crédito fiscal). El <strong>saldo a favor</strong> (crédito no usado) se arrastra mes a mes aunque no haya movimiento en el mes.<br>
        <strong>Desde {{ igvDebtFromYear }}:</strong> si registras menos IGV pagado que lo sugerido, la <strong>deuda referencial</strong> se acumula al mes siguiente (la app no arrastra deuda de años anteriores a {{ igvDebtFromYear }}). En SUNAT el no pago genera deuda e intereses aparte del PDT; esto es para tu control interno.<br>
      </template>
      <template v-if="coeficiente && coeficiente.origen !== 'no-aplica'">
        <strong>Coeficiente:</strong> {{ coeficiente.detalle }}
      </template>
    </UiAlert>

    <div v-if="alertasRegimen.length" class="mb-4 space-y-2">
      <UiAlert v-for="(a, i) in alertasRegimen" :key="i" type="warning">{{ a }}</UiAlert>
    </div>

    <!-- Fondo de detracciones: solo aparece si la empresa tiene detracciones -->
    <div
      v-if="hayDetraccion"
      class="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Fondo de detracciones — Banco de la Nación
        </p>
        <p class="mt-0.5 text-xs text-amber-800 dark:text-amber-200/90">
          Abonan las detracciones de tus <strong>ventas</strong>; las de compras van a la cuenta del
          proveedor y no suman aquí. Solo se puede gastar en pagar tributos: al registrar un pago,
          anota en «Pagado c/ detracc.» cuánto salió de esta cuenta.
        </p>
      </div>
      <div class="text-right">
        <p class="text-[11px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200/80">
          Saldo disponible
        </p>
        <p class="font-mono text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-100">
          S/ {{ fmt(fondoDetraccionSaldo) }}
        </p>
        <p v-if="fondoDetraccionApertura" class="text-[11px] text-amber-800 dark:text-amber-200/80">
          incluye S/ {{ fmt(fondoDetraccionApertura) }} de años anteriores
        </p>
      </div>
    </div>

    <UiAlert v-if="errorPago" type="warning" class="mb-4">{{ errorPago }}</UiAlert>

    <div class="card overflow-hidden">
      <!-- Barra superior de la tabla -->
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <!-- Toggle redondeo -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-content-muted">Decimales:</span>
          <button @click="rounded = !rounded"
            class="relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none"
            :class="rounded ? 'bg-line-strong' : 'bg-blue-600'">
            <span class="inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform"
              :class="rounded ? 'translate-x-1' : 'translate-x-7'" />
          </button>
          <span class="text-xs font-medium" :class="rounded ? 'text-content-muted' : 'text-blue-600 dark:text-blue-400'">
            {{ rounded ? 'Sin decimales (SUNAT)' : 'Con decimales (exacto)' }}
          </span>
        </div>

        <!-- Selector de columnas -->
        <div class="relative" ref="colMenuRef">
          <button @click="showColMenu = !showColMenu"
            class="flex items-center gap-1.5 text-sm text-content-soft border border-line rounded-lg px-3 py-1.5 hover:bg-surface-raised transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columnas
            <span class="text-[10px] bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded-full px-1.5 font-medium">
              {{ visibleColumnDefs.length }}/{{ columnasDisponibles.length }}
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
              class="absolute right-0 top-full mt-1 z-20 bg-surface border border-line rounded-xl shadow-xl p-3 w-64">
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-semibold text-content-muted uppercase tracking-wide">Columnas visibles</p>
                <button @click="resetCols" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Restaurar todo</button>
              </div>
              <div class="space-y-0.5">
                <label v-for="col in columnasDisponibles" :key="col.key"
                  class="flex items-center gap-2 py-1.5 px-1.5 rounded-lg cursor-pointer hover:bg-surface-raised">
                  <input type="checkbox" v-model="visibleCols" :value="col.key" class="rounded text-blue-600 dark:text-blue-400" />
                  <span class="text-sm text-content-soft flex-1">{{ etiqueta(col) }}</span>
                  <span v-if="col.casilla"
                    class="text-[10px] font-mono text-content-muted bg-surface-muted px-1.5 py-0.5 rounded">
                    cas.{{ col.casilla }}
                  </span>
                </label>
              </div>
            </div>
          </transition>
        </div>
      </div><!-- /top bar -->

      <div v-if="cargaInicial" class="flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
      <div v-else class="overflow-x-auto" :class="{ 'is-refreshing': refrescando }">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-raised text-content-soft text-left">
              <th class="px-3 py-3 font-medium">Mes</th>
              <th v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-2 font-medium text-right whitespace-nowrap" :class="col.thBg">
                <div class="flex flex-col items-end leading-tight gap-0.5">
                  <span>{{ etiqueta(col) }}</span>
                  <span v-if="col.casilla" class="text-[10px] font-mono text-content-muted font-normal">
                    cas. {{ col.casilla }}
                  </span>
                </div>
              </th>
              <th class="px-3 py-3 font-medium text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in meses" :key="m.month"
              class="border-t border-line hover:bg-surface-raised"
              :class="{ 'opacity-40': !m.baseVentas && !m.baseCompras }">
              <td class="px-3 py-2.5 font-medium text-content-soft whitespace-nowrap">{{ MESES[m.month] }}</td>

              <td v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-2.5 text-right whitespace-nowrap tabular-nums" :class="col.tdBg">
                <!-- IGV del mes (140) y resultado (184): positivo = impuesto, negativo = saldo a favor -->
                <template v-if="col.key === 'igvNeto' || col.key === 'igvMes'">
                  <span :class="(m as any)[col.key] > 0 ? 'text-blue-700 dark:text-blue-300 font-semibold' : (m as any)[col.key] < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-content-muted/50'">
                    {{ (m as any)[col.key] > 0
                      ? `S/ ${fmt((m as any)[col.key])}`
                      : (m as any)[col.key] < 0
                        ? `(S/ ${fmt(Math.abs((m as any)[col.key]))}) fav.`
                        : '-' }}
                  </span>
                </template>

                <!-- Saldo a favor anterior arrastrado del mes previo -->
                <template v-else-if="col.key === 'saldoFavorAnterior'">
                  <span class="text-content-muted text-xs">
                    {{ m.saldoFavorAnterior > 0 ? `(S/ ${fmt(m.saldoFavorAnterior)}) fav.` : '-' }}
                  </span>
                </template>

                <!-- IGV que sale del bolsillo en el mes: 0 cuando el saldo a favor lo cubre -->
                <template v-else-if="col.key === 'igvPorPagar'">
                  <span v-if="m.igvPorPagar > 0" :class="col.textColor">S/ {{ fmt(m.igvPorPagar) }}</span>
                  <span v-else-if="m.baseVentas || m.baseCompras" class="text-content-muted"
                    :title="motivoSinIgv(m)">
                    S/ {{ fmt(0) }}
                  </span>
                  <span v-else class="text-content-muted/50">-</span>
                  <div v-if="m.igvDeudaInicioMes > 0"
                    class="text-[10px] font-medium text-orange-700 dark:text-orange-300"
                    title="IGV de meses anteriores registrado como no pagado (referencial)">
                    + S/ {{ fmt(m.igvDeudaInicioMes) }} deuda
                  </div>
                </template>

                <!-- Pago IGV efectuado (editable) -->
                <template v-else-if="col.key === 'pagoIgvEfectuado'">
                  <input v-if="editingMonth === m.month" v-model.number="editPayments.pagoIgvEfectuado"
                    type="number" step="1" min="0"
                    class="input-field text-right w-24 py-1 text-sm" />
                  <span v-else :class="m.pagoIgvEfectuado ? 'text-green-700 dark:text-green-300 font-medium' : 'text-content-muted/50'">
                    {{ m.pagoIgvEfectuado ? `S/ ${fmt(m.pagoIgvEfectuado)}` : '-' }}
                  </span>
                </template>

                <!-- Pago IR efectuado (editable) -->
                <template v-else-if="col.key === 'pagoIrEfectuado'">
                  <input v-if="editingMonth === m.month" v-model.number="editPayments.pagoIrEfectuado"
                    type="number" step="1" min="0"
                    class="input-field text-right w-24 py-1 text-sm" />
                  <span v-else :class="m.pagoIrEfectuado ? 'text-green-700 dark:text-green-300 font-medium' : 'text-content-muted/50'">
                    {{ m.pagoIrEfectuado ? `S/ ${fmt(m.pagoIrEfectuado)}` : '-' }}
                  </span>
                </template>

                <!-- Parte del pago que salió del fondo de detracciones -->
                <template v-else-if="col.key === 'pagoConDetraccion'">
                  <div v-if="editingMonth === m.month" class="flex items-center justify-end gap-1">
                    <input v-model.number="editPayments.pagoConDetraccion"
                      type="number" step="1" min="0" :max="fondoDisponibleAlEditar"
                      class="input-field text-right w-24 py-1 text-sm" />
                    <button type="button"
                      class="rounded px-1.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/15"
                      :title="`Usar el fondo hasta cubrir el pago (disponible S/ ${fmt(fondoDisponibleAlEditar)})`"
                      @click="usarTodoElFondo">
                      máx
                    </button>
                  </div>
                  <span v-else :class="m.pagoConDetraccion ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-content-muted/50'">
                    {{ m.pagoConDetraccion ? `S/ ${fmt(m.pagoConDetraccion)}` : '-' }}
                  </span>
                </template>

                <!-- Saldo del fondo tras el mes -->
                <template v-else-if="col.key === 'detraccionFondoCierre'">
                  <span
                    :class="m.detraccionFondoCierre > 0 ? col.textColor : 'text-content-muted/50'"
                    title="Saldo en la cuenta de detracciones del Banco de la Nación al cerrar el mes">
                    {{ m.detraccionFondoCierre !== 0 ? `S/ ${fmt(m.detraccionFondoCierre)}` : '-' }}
                  </span>
                </template>

                <!-- Pago total (suma IGV + IR efectuados, solo lectura) -->
                <template v-else-if="col.key === 'pagoTotalEfectuado'">
                  <span :class="m.pagoTotalEfectuado ? 'text-green-800 dark:text-green-200 font-semibold' : 'text-content-muted/50'">
                    {{ m.pagoTotalEfectuado ? `S/ ${fmt(m.pagoTotalEfectuado)}` : '-' }}
                  </span>
                </template>

                <template v-else-if="col.key === 'igvDeudaCierreMes'">
                  <span
                    :class="m.igvDeudaCierreMes > 0 ? 'text-orange-800 dark:text-orange-200 font-medium' : 'text-content-muted/50'"
                    :title="year >= igvDebtFromYear ? 'Deuda IGV referencial tras el mes (no pagado acumulado)' : ''">
                    {{ m.igvDeudaCierreMes > 0 ? `S/ ${fmt(m.igvDeudaCierreMes)}` : '-' }}
                  </span>
                </template>

                <!-- Columnas de dinero estándar -->
                <template v-else>
                  <span :class="(m as any)[col.key] > 0 ? col.textColor : 'text-content-muted/50'">
                    {{ (m as any)[col.key] > 0 ? `S/ ${fmt((m as any)[col.key])}` : '-' }}
                  </span>
                </template>
              </td>

              <td class="px-3 py-2.5 text-center whitespace-nowrap">
                <template v-if="editingMonth === m.month">
                  <button @click="savePayment(m.month)"
                    class="text-green-600 dark:text-green-400 text-sm font-medium hover:underline mr-1">Guardar</button>
                  <button @click="editingMonth = null"
                    class="text-content-muted text-sm hover:underline">✕</button>
                </template>
                <template v-else>
                  <button @click="startEdit(m)"
                    class="text-blue-600 dark:text-blue-400 text-sm hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!m.baseVentas && !m.baseCompras">
                    Editar pago
                  </button>
                </template>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="border-t-2 border-line-strong bg-surface-raised font-semibold">
              <td class="px-3 py-3 text-content-soft">TOTAL</td>
              <td v-for="col in visibleColumnDefs" :key="col.key"
                class="px-3 py-3 text-right whitespace-nowrap tabular-nums" :class="col.tdBg">
                <!-- Mezclan impuesto y saldos a favor: sumarlos no dice nada.
                     Lo que se paga de IGV en el año está en «Pagar IGV». -->
                <template v-if="col.key === 'igvNeto' || col.key === 'igvMes' || col.key === 'saldoFavorAnterior'">
                  <span class="text-content-muted">—</span>
                </template>
                <template v-else-if="col.key === 'pagoIgvEfectuado'">
                  <span class="text-green-700 dark:text-green-300">S/ {{ fmt(totales.pagoIgv) }}</span>
                </template>
                <template v-else-if="col.key === 'pagoIrEfectuado'">
                  <span class="text-green-700 dark:text-green-300">S/ {{ fmt(totales.pagoIr) }}</span>
                </template>
                <template v-else-if="col.key === 'pagoTotalEfectuado'">
                  <span class="text-green-800 dark:text-green-200 font-semibold">S/ {{ fmt(totales.pagoTotalEfectuado) }}</span>
                </template>
                <template v-else-if="col.key === 'igvDeudaCierreMes'">
                  <span class="text-orange-800 dark:text-orange-200" title="Saldo de deuda IGV al cierre de diciembre (referencial)">
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

    <GuiaDeclaracion v-model:mes="mesGuia" :guia="guiaDelMes" :meses-con-datos="mesesConDatos" class="mt-6" />
  </div>
</template>

<script setup lang="ts">
const { formatMoney, formatMoneyInt, MESES } = useTaxCalculations()

/**
 * true = sin decimales (SUNAT), false = con 2 decimales (exacto).
 * En cookie, como las columnas ocultas: sobrevive al F5 y el servidor ya
 * renderiza con el modo elegido.
 */
const rounded = useCookie<boolean>('cp-resumen-sin-decimales', {
  default: () => true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
})
const fmt = (v: number) => rounded.value ? formatMoneyInt(v) : formatMoney(v)

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
const year = ref(currentYear)

const { data, pending, refresh } = useFetch('/api/monthly-summary', {
  query: computed(() => ({ year: year.value })),
})

/*
 * `pending` se pone en true también al refrescar tras guardar, y con él la tabla
 * desaparecía dejando un spinner. El esqueleto solo tiene sentido cuando aún no
 * hay nada que mostrar; los refrescos posteriores solo atenúan lo que ya está.
 */
const cargaInicial = computed(() => pending.value && !data.value)
const refrescando = computed(() => pending.value && !!data.value)

const igvDebtFromYear = computed(() => Number(data.value?.igvDebtAccrualFromYear ?? 2026))
const fondoDetraccionSaldo = computed(() => Number((data.value as any)?.detraccionFondoSaldo ?? 0))
const fondoDetraccionApertura = computed(() => Number((data.value as any)?.detraccionFondoApertura ?? 0))
const regimenSpec = computed(() => (data.value as any)?.regimenSpec ?? null)
const coeficiente = computed(() => (data.value as any)?.coeficiente ?? null)

/** Avisos del régimen (cruce de 300 UIT, límites del NRUS…), sin repetirlos por mes. */
const alertasRegimen = computed(() => {
  const vistas = new Set<string>()
  for (const m of meses.value as any[]) {
    for (const a of m.irMensual?.alertas ?? []) vistas.add(a)
  }
  return [...vistas]
})

/** Normaliza la respuesta de la API al modelo que usa la tabla */
const meses = computed(() => {
  const raw = data.value?.summaries ?? []
  return raw.map((r: any) => {
    const baseV     = Number(r.baseVentas ?? 0)
    const igvV      = Number(r.igvVentas ?? 0)
    const baseCf    = Number(r.baseComprasCreditoFiscal ?? 0)
    const igvCf     = Number(r.igvComprasCreditoFiscal ?? 0)
    const noDed     = Number(r.comprasNoDeducibles ?? 0)
    const saldoAnt  = Number(r.saldoIgvMesAnterior ?? 0)
    const igvNetoMs = Number(r.igvNetoMes ?? 0)
    const saldoMes  = Number(r.saldoIgvMes ?? 0)
    const igvNetoExacto = igvNetoMs > 0 ? igvNetoMs : saldoMes < 0 ? saldoMes : 0
    const irExacto  = Number(r.pagoIrSugerido ?? 0)

    /*
     * En modo SUNAT no basta con redondear al mostrar: SUNAT redondea cada
     * casilla y opera con esos enteros, así que su importe a pagar puede
     * diferir en un sol del que sale de la contabilidad al céntimo. Cuando el
     * interruptor dice «Sin decimales (SUNAT)» se enseña el número de SUNAT,
     * que es el que se acaba pagando; con decimales, el exacto.
     */
    const det = r.guia?.determinacion
    const usarSunat = rounded.value && !!det

    /*
     * Por la misma razón, en modo SUNAT las columnas con casilla enseñan el
     * entero de la guía y no el importe redondeado: el IGV que declara SUNAT
     * sale de la base redondeada (8 × 18% = 1), no del IGV de los comprobantes
     * (1,53 → 2), y es con ese entero con el que opera la casilla 140.
     */
    const cas = (codigo: string, exacto: number): number => {
      if (!usarSunat) return exacto
      const c = r.guia?.casillas?.find((x: any) => x.casilla === codigo)
      return c ? Number(c.valor) : exacto
    }

    return {
      ...r,
      baseVentas:         baseV,
      igvVentas:          igvV,
      totalVentas:        Number(r.totalVentas ?? baseV + igvV),
      baseCompras:        baseCf,
      igvCompras:         igvCf,
      totalCompras:       baseCf + igvCf + noDed,
      // Desglose por casilla: el 18% y el 10% de la Ley 31556 se declaran por
      // separado, así que no pueden ir sumados en la misma columna.
      baseVentasGravadas:  cas('100', Number(r.baseVentasGravadas ?? baseV)),
      igvVentasGravadas:   cas('101', Number(r.igvVentasGravadas ?? igvV)),
      baseVentasLey:       cas('154', Number(r.baseVentasLey31556 ?? 0)),
      igvVentasLey:        cas('155', Number(r.igvVentasLey31556 ?? 0)),
      baseComprasGravadas: cas('107', Number(r.baseComprasGravadas ?? baseCf)),
      igvComprasGravadas:  cas('108', Number(r.igvComprasGravadas ?? igvCf)),
      baseComprasLey:      cas('156', Number(r.baseComprasLey31556 ?? 0)),
      igvComprasLey:       cas('157', Number(r.igvComprasLey31556 ?? 0)),
      detraccionVentas:   Number(r.detraccionVentas ?? 0),
      detraccionCompras:  Number(r.detraccionCompras ?? 0),
      pagoConDetraccion:  Number(r.pagoConDetraccion ?? 0),
      detraccionFondoCierre: Number(r.detraccionFondoCierre ?? 0),
      // Casilla 140: débito menos crédito del mes, antes de restar el saldo a favor anterior.
      igvMes:                usarSunat
        ? det.igvResultante
        : round2(Number(r.igvVentasGravadas ?? igvV) + Number(r.igvVentasLey31556 ?? 0)
          - Number(r.igvComprasGravadas ?? igvCf) - Number(r.igvComprasLey31556 ?? 0)),
      saldoFavorAnterior: usarSunat ? det.saldoFavorAnterior : (saldoAnt < 0 ? Math.abs(saldoAnt) : 0),
      igvNeto:               usarSunat ? det.igvAPagar : igvNetoExacto,
      // Casilla 189: el 184 cuando es positivo. Sumado a `irSugerido` da `totalAPagar`.
      igvPorPagar:           Math.max(0, usarSunat ? det.igvAPagar : igvNetoExacto),
      irSugerido:            usarSunat ? det.rentaAPagar : irExacto,
      totalAPagar:           usarSunat
        ? det.totalAPagar
        : Math.max(0, igvNetoExacto) + irExacto,
      pagoIgvEfectuado:      Number(r.pagoIgvEfectuado ?? 0),
      pagoIrEfectuado:       Number(r.pagoIrEfectuado ?? 0),
      pagoTotalEfectuado:    Number(r.pagoIgvEfectuado ?? 0) + Number(r.pagoIrEfectuado ?? 0),
      igvDeudaInicioMes:     Number(r.igvDeudaInicioMes ?? 0),
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
    baseVentasGravadas:  m.reduce((s: number, x: any) => s + x.baseVentasGravadas, 0),
    igvVentasGravadas:   m.reduce((s: number, x: any) => s + x.igvVentasGravadas, 0),
    baseVentasLey:       m.reduce((s: number, x: any) => s + x.baseVentasLey, 0),
    igvVentasLey:        m.reduce((s: number, x: any) => s + x.igvVentasLey, 0),
    baseComprasGravadas: m.reduce((s: number, x: any) => s + x.baseComprasGravadas, 0),
    igvComprasGravadas:  m.reduce((s: number, x: any) => s + x.igvComprasGravadas, 0),
    baseComprasLey:      m.reduce((s: number, x: any) => s + x.baseComprasLey, 0),
    igvComprasLey:       m.reduce((s: number, x: any) => s + x.igvComprasLey, 0),
    detraccionVentas:   m.reduce((s: number, x: any) => s + x.detraccionVentas, 0),
    detraccionCompras:  m.reduce((s: number, x: any) => s + x.detraccionCompras, 0),
    pagoConDetraccion:  m.reduce((s: number, x: any) => s + x.pagoConDetraccion, 0),
    // El fondo es un saldo, no un flujo: el «total» del año es el de diciembre.
    detraccionFondoCierre: m.length ? Number(m[m.length - 1].detraccionFondoCierre ?? 0) : 0,
    igvPorPagar:        m.reduce((s: number, x: any) => s + x.igvPorPagar, 0),
    irSugerido:         m.reduce((s: number, x: any) => s + x.irSugerido, 0),
    totalAPagar:        m.reduce((s: number, x: any) => s + x.totalAPagar, 0),
    pagoIgv:            m.reduce((s: number, x: any) => s + x.pagoIgvEfectuado, 0),
    pagoIr:             m.reduce((s: number, x: any) => s + x.pagoIrEfectuado, 0),
    pagoTotalEfectuado: m.reduce((s: number, x: any) => s + x.pagoTotalEfectuado, 0),
    igvDeudaCierreDic: m.length ? Number(m[m.length - 1].igvDeudaCierreMes ?? 0) : 0,
  }
})

// ─── Definición de columnas ────────────────────────────
const allColumns = [
  {
    key: 'baseVentasGravadas',
    label: 'Op. Grav. Ventas',
    casilla: '100',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'igvVentasGravadas',
    soloConIgv: true,
    label: 'IGV Ventas',
    casilla: '101',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'baseVentasLey',
    label: 'Ventas Ley 31556',
    casilla: '154',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    soloConLey31556: true,
  },
  {
    key: 'igvVentasLey',
    soloConIgv: true,
    label: 'IGV Ventas Ley 31556',
    casilla: '155',
    thBg: '',
    tdBg: '',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    soloConLey31556: true,
  },
  {
    key: 'totalVentas',
    label: 'Total Ventas',
    casilla: null,
    thBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    tdBg: 'bg-emerald-50/50 dark:bg-emerald-500/10',
    textColor: 'text-emerald-800 dark:text-emerald-200 font-semibold',
  },
  {
    key: 'baseComprasGravadas',
    soloConIgv: true,
    label: 'Op. Grav. Compras',
    casilla: '107',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-600 dark:text-red-400',
  },
  {
    key: 'igvComprasGravadas',
    soloConIgv: true,
    label: 'IGV Compras',
    casilla: '108',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-500 dark:text-red-400',
  },
  {
    key: 'baseComprasLey',
    soloConIgv: true,
    label: 'Compras Ley 31556',
    casilla: '156',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-600 dark:text-red-400',
    soloConLey31556: true,
  },
  {
    key: 'igvComprasLey',
    soloConIgv: true,
    label: 'IGV Compras Ley 31556',
    casilla: '157',
    thBg: '',
    tdBg: '',
    textColor: 'text-red-500 dark:text-red-400',
    soloConLey31556: true,
  },
  {
    key: 'totalCompras',
    soloConIgv: true,
    label: 'Total Compras',
    casilla: null,
    thBg: 'bg-red-50 dark:bg-red-500/10',
    tdBg: 'bg-red-50/50 dark:bg-red-500/10',
    textColor: 'text-red-700 dark:text-red-300 font-semibold',
  },
  {
    // La detracción no tiene casilla en el 0621: la operación se declara
    // completa. Estas dos columnas miden caja, no impuesto.
    key: 'detraccionVentas',
    label: 'Detracc. Ventas',
    casilla: null,
    thBg: '',
    tdBg: '',
    textColor: 'text-amber-700 dark:text-amber-300',
    soloConDetraccion: true,
  },
  {
    key: 'detraccionCompras',
    label: 'Detracc. Compras',
    casilla: null,
    thBg: '',
    tdBg: '',
    textColor: 'text-amber-700 dark:text-amber-300',
    soloConDetraccion: true,
  },
  {
    key: 'pagoConDetraccion',
    label: 'Pagado c/ detracc.',
    casilla: null,
    thBg: 'bg-amber-50 dark:bg-amber-500/10',
    tdBg: 'bg-amber-50/50 dark:bg-amber-500/10',
    textColor: 'text-amber-700 dark:text-amber-300',
    soloConDetraccion: true,
  },
  {
    key: 'detraccionFondoCierre',
    label: 'Fondo detracc.',
    casilla: null,
    thBg: 'bg-amber-100 dark:bg-amber-500/15',
    tdBg: 'bg-amber-100/50 dark:bg-amber-500/15',
    textColor: 'text-amber-800 dark:text-amber-200 font-semibold',
    soloConDetraccion: true,
  },
  {
    // Casilla 140: el IGV del mes antes de restar el saldo a favor anterior. Es
    // lo que SUNAT cobra si la casilla 145 queda en 0; sin esta columna no había
    // cómo cuadrar la tabla con un formulario que no trae el saldo cargado.
    key: 'igvMes',
    soloConIgv: true,
    label: 'IGV del mes',
    casilla: '140',
    thBg: '',
    tdBg: '',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'saldoFavorAnterior',
    soloConIgv: true,
    label: 'Saldo Ant.',
    casilla: '145',
    thBg: '',
    tdBg: '',
    textColor: 'text-content-muted',
  },
  {
    // Casilla 184 y no 140: la 140 es el impuesto resultante **antes** de
    // aplicar el saldo a favor del período anterior, y esta columna ya lo
    // descuenta. Estuvo etiquetada como 140 y no cuadraba con el formulario.
    // Se llamaba «IGV a pagar», pero enseña también el saldo a favor que se
    // arrastra: lo que se paga está en «Pagar IGV».
    key: 'igvNeto',
    soloConIgv: true,
    label: 'Resultado IGV',
    casilla: '184',
    thBg: 'bg-blue-50 dark:bg-blue-500/10',
    tdBg: 'bg-blue-50/50 dark:bg-blue-500/10',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'igvDeudaCierreMes',
    soloConIgv: true,
    label: 'IGV deuda acum.',
    casilla: null,
    thBg: 'bg-orange-50 dark:bg-orange-500/10',
    tdBg: 'bg-orange-50/50 dark:bg-orange-500/10',
    textColor: 'text-orange-800 dark:text-orange-200 font-medium',
  },
  {
    // Lo que sale del bolsillo por IGV en el mes: el 184 si es positivo y 0
    // cuando el saldo a favor lo cubre, que es justo lo que «(S/ 371) fav.» no
    // decía.
    key: 'igvPorPagar',
    soloConIgv: true,
    label: 'Pagar IGV',
    casilla: '189',
    thBg: 'bg-blue-50 dark:bg-blue-500/10',
    tdBg: 'bg-blue-50/50 dark:bg-blue-500/10',
    textColor: 'text-blue-700 dark:text-blue-300 font-semibold',
  },
  {
    key: 'irSugerido',
    label: 'Pagar IR',
    casilla: '307',
    labelPorRegimen: { NRUS: 'Cuota NRUS', RER: 'Renta 1,5% (definitiva)' } as Record<string, string>,
    thBg: 'bg-amber-50 dark:bg-amber-500/10',
    tdBg: 'bg-amber-50/50 dark:bg-amber-500/10',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  {
    // Lo que SUNAT muestra en la cabecera del formulario: «Pagar IGV» más
    // «Pagar IR», ya redondeados por casilla en modo SUNAT.
    key: 'totalAPagar',
    label: 'Total a pagar',
    casilla: '189+307',
    thBg: 'bg-blue-100 dark:bg-blue-500/15',
    tdBg: 'bg-blue-100/50 dark:bg-blue-500/15',
    textColor: 'text-blue-800 dark:text-blue-200 font-semibold',
  },
  {
    key: 'pagoIgvEfectuado',
    soloConIgv: true,
    label: 'Pagado IGV',
    casilla: null,
    thBg: 'bg-green-50 dark:bg-green-500/10',
    tdBg: 'bg-green-50/50 dark:bg-green-500/10',
    textColor: 'text-green-700 dark:text-green-300',
  },
  {
    key: 'pagoIrEfectuado',
    label: 'Pagado IR',
    casilla: null,
    thBg: 'bg-green-50 dark:bg-green-500/10',
    tdBg: 'bg-green-50/50 dark:bg-green-500/10',
    textColor: 'text-green-700 dark:text-green-300',
  },
  {
    key: 'pagoTotalEfectuado',
    label: 'Total Pagado SUNAT',
    casilla: null,
    thBg: 'bg-green-100 dark:bg-green-500/15',
    tdBg: 'bg-green-100/50 dark:bg-green-500/15',
    textColor: 'text-green-800 dark:text-green-200 font-semibold',
  },
]

/*
 * Cookie y no ref local: era un ref que arrancaba con todas las columnas, así
 * que lo que se ocultaba volvía a aparecer al recargar. Con cookie el servidor
 * ya dibuja la tabla sin ellas. Se guardan las **ocultas** y no las visibles,
 * para que una columna nueva —o una condicional, como las de detracción—
 * aparezca sola en vez de quedar escondida.
 */
const columnasOcultas = useCookie<string[]>('cp-resumen-cols-ocultas', {
  default: () => [],
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
})
const clavesColumnas = allColumns.map(c => c.key)
const visibleCols = computed<string[]>({
  get: () => {
    const ocultas = Array.isArray(columnasOcultas.value) ? columnasOcultas.value : []
    return clavesColumnas.filter(k => !ocultas.includes(k))
  },
  set: (visibles) => {
    columnasOcultas.value = clavesColumnas.filter(k => !visibles.includes(k))
  },
})
function resetCols() { columnasOcultas.value = [] }

/**
 * ¿Hubo alguna operación bajo la Ley 31556 en el año? Con los importes crudos:
 * en modo SUNAT una base de céntimos redondea a 0 y la columna desaparecería
 * al cambiar de modo.
 */
const hayLey31556 = computed(() =>
  ((data.value?.summaries ?? []) as any[]).some(r =>
    Number(r.baseVentasLey31556 ?? 0) > 0 || Number(r.baseComprasLey31556 ?? 0) > 0
  )
)

/** ¿Hubo alguna operación sujeta a detracción en el año? */
const hayDetraccion = computed(() =>
  meses.value.some((m: any) => m.detraccionVentas !== 0 || m.detraccionCompras !== 0)
)

/**
 * Columnas que tienen sentido en este contexto: las de IGV desaparecen en NRUS
 * y las de la Ley 31556 solo aparecen si hay operaciones bajo esa norma.
 */
const columnasDisponibles = computed(() =>
  allColumns.filter((c: any) => {
    if (c.soloConIgv && regimenSpec.value && !regimenSpec.value.aplicaIgv) return false
    if (c.soloConLey31556 && !hayLey31556.value) return false
    if (c.soloConDetraccion && !hayDetraccion.value) return false
    return true
  })
)

const visibleColumnDefs = computed(() =>
  columnasDisponibles.value.filter(c => visibleCols.value.includes(c.key))
)

/**
 * Por qué «Pagar IGV» sale en 0 y qué cobra SUNAT si no precarga la casilla
 * 145, que es justo cuando su formulario y la tabla no coinciden.
 */
function motivoSinIgv(m: any): string {
  const det = m.guia?.determinacion
  const saldo = Number(det?.saldoFavorAnterior ?? m.saldoFavorAnterior ?? 0)
  if (saldo <= 0) return 'No hay IGV por pagar este mes.'
  const igvMes = Number(det?.igvResultante ?? m.igvMes ?? 0)
  const base = `Tu saldo a favor cubre el IGV del mes. En SUNAT pon S/ ${formatMoneyInt(saldo)} en la casilla 145`
  return igvMes > 0
    ? `${base}; si la dejas en 0, SUNAT te cobra S/ ${formatMoneyInt(igvMes)} de IGV.`
    : `${base}.`
}

/** El pago mensual de renta se llama distinto en cada régimen. */
function etiqueta(col: any): string {
  const codigo = regimenSpec.value?.code
  return (codigo && col.labelPorRegimen?.[codigo]) || col.label
}

// ─── Guía de declaración ──────────────────────────────
const mesGuia = ref(new Date().getMonth() + 1)
const mesGuiaTocado = ref(false)
watch(mesGuia, () => { mesGuiaTocado.value = true })

// Al cambiar de año, arranca en el último mes con movimiento: el mes en curso
// suele estar vacío y la guía no diría nada útil.
watch(meses, (lista) => {
  if (mesGuiaTocado.value) return
  const conDatos = (lista as any[]).filter(m => m.baseVentas > 0 || m.baseCompras > 0)
  if (conDatos.length) mesGuia.value = conDatos[conDatos.length - 1].month
}, { immediate: true })

watch(year, () => { mesGuiaTocado.value = false })

const mesesConDatos = computed(() =>
  (meses.value as any[]).map(m => ({ month: m.month, nombreMes: m.nombreMes || MESES[m.month] }))
)

const guiaDelMes = computed(() => {
  const mes = (meses.value as any[]).find(m => m.month === mesGuia.value)
  return mes?.guia ?? null
})

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
const editPayments = reactive({ pagoIgvEfectuado: 0, pagoIrEfectuado: 0, pagoConDetraccion: 0 })
const errorPago = ref('')

/** Lo pagado con el fondo no puede exceder lo pagado ni el saldo disponible. */
const totalPagoEditado = computed(() =>
  (editPayments.pagoIgvEfectuado || 0) + (editPayments.pagoIrEfectuado || 0)
)
const fondoDisponibleAlEditar = computed(() => {
  const m = (meses.value as any[]).find(x => x.month === editingMonth.value)
  if (!m) return 0
  // El saldo del mes ya tiene descontado lo que se estaba usando: se devuelve
  // para poder reasignarlo sin que el tope baje al reabrir la edición.
  return round2(Number(m.detraccionFondoCierre ?? 0) + Number(m.pagoConDetraccion ?? 0))
})

function startEdit(m: any) {
  editingMonth.value = m.month
  errorPago.value = ''
  const sugeridoIgv = Math.round(Number(m.igvSugeridoPagoTotal ?? 0))
  editPayments.pagoIgvEfectuado = m.pagoIgvEfectuado || sugeridoIgv
  editPayments.pagoIrEfectuado = m.pagoIrEfectuado || Math.round(m.irSugerido)
  editPayments.pagoConDetraccion = m.pagoConDetraccion || 0
}

/** Usa del fondo todo lo que alcance para cubrir el pago del mes. */
function usarTodoElFondo() {
  editPayments.pagoConDetraccion = Math.min(totalPagoEditado.value, fondoDisponibleAlEditar.value)
}

async function savePayment(month: number) {
  errorPago.value = ''
  try {
    await $fetch('/api/monthly-summary/update', {
      method: 'PUT',
      body: {
        year: year.value,
        month,
        pagoIgvEfectuado: editPayments.pagoIgvEfectuado,
        pagoIrEfectuado:  editPayments.pagoIrEfectuado,
        pagoTotalEfectuado: totalPagoEditado.value,
        pagoConDetraccion: editPayments.pagoConDetraccion,
      },
    })
    editingMonth.value = null
    refresh()
  } catch (e: any) {
    errorPago.value = e.data?.message || 'No se pudo guardar el pago'
  }
}
</script>
