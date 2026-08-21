<template>
  <div>
    <header class="mb-8 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-content">Empresas</h1>
        <p class="mt-1 text-sm text-content-muted">
          Cada empresa lleva su propia contabilidad. Cambia entre ellas desde la barra superior.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="abrirNueva">+ Nueva empresa</button>
    </header>

    <UiAlert v-if="sinEmpresa" type="warning" class="mb-6">
      Todavía no perteneces a ninguna empresa. Crea la primera para empezar a registrar comprobantes.
    </UiAlert>

    <div v-if="pending" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="empresa in data ?? []"
        :key="empresa.id"
        class="card flex flex-col"
        :class="empresa.activa ? 'ring-2 ring-brand-500/40' : ''"
      >
        <div class="mb-3 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="truncate font-semibold text-content" :title="empresa.razonSocial">
              {{ empresa.razonSocial }}
            </h2>
            <p class="mt-0.5 font-mono text-xs text-content-muted">{{ empresa.ruc || 'sin RUC' }}</p>
          </div>
          <UiBadge v-if="empresa.activa" variant="blue">Activa</UiBadge>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UiBadge :variant="empresa.role === 'OWNER' ? 'purple' : 'gray'">
            {{ NOMBRES_ROL[empresa.role] }}
          </UiBadge>
          <UiBadge :variant="empresa.plan === 'PRO' ? 'green' : 'gray'">
            Plan {{ empresa.plan === 'PRO' ? 'Pro' : 'Gratuito' }}
          </UiBadge>
          <UiBadge v-if="empresa.estado === 'SUSPENDIDA'" variant="red">Suspendida</UiBadge>
        </div>

        <div class="mt-auto">
          <button
            type="button"
            class="btn-secondary w-full"
            :disabled="empresa.activa"
            @click="cambiarEmpresa(empresa.id)"
          >
            {{ empresa.activa ? 'Estás en esta empresa' : 'Entrar' }}
          </button>
        </div>
      </article>
    </div>

    <UiModal v-model="mostrarNueva" title="Nueva empresa" size="sm">
      <form id="form-empresa" class="space-y-4" @submit.prevent="crear">
        <div>
          <label class="label-field" for="em-rs">Razón social *</label>
          <input id="em-rs" v-model="nueva.razonSocial" type="text" class="input-field" required />
        </div>
        <div>
          <label class="label-field" for="em-ruc">RUC</label>
          <input id="em-ruc" v-model="nueva.ruc" type="text" inputmode="numeric" maxlength="11" class="input-field" placeholder="20123456789" />
          <p class="hint-field">11 dígitos. Puedes completarlo después en Configuración.</p>
        </div>
        <div>
          <label class="label-field" for="em-nc">Nombre comercial</label>
          <input id="em-nc" v-model="nueva.nombreComercial" type="text" class="input-field" />
        </div>

        <div
          v-if="mensaje"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          {{ mensaje }}
        </div>

        <p class="text-xs text-content-muted">
          Quedarás como propietario y podrás invitar a más personas desde Configuración.
        </p>
      </form>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" @click="mostrarNueva = false">Cancelar</button>
          <button type="submit" form="form-empresa" class="btn-primary" :disabled="creando">
            {{ creando ? 'Creando…' : 'Crear empresa' }}
          </button>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
interface EmpresaFila {
  id: number
  ruc: string
  razonSocial: string
  nombreComercial: string | null
  estado: 'ACTIVA' | 'SUSPENDIDA'
  plan: string
  role: 'OWNER' | 'ADMIN' | 'CONTADOR' | 'LECTOR'
  activa: boolean
}

const { cambiarEmpresa, sinEmpresa } = useAuth()
const { data, pending } = useFetch<EmpresaFila[]>('/api/companies')

const mostrarNueva = ref(false)
const creando = ref(false)
const mensaje = ref('')
const nueva = reactive({ razonSocial: '', ruc: '', nombreComercial: '' })

function abrirNueva() {
  nueva.razonSocial = ''
  nueva.ruc = ''
  nueva.nombreComercial = ''
  mensaje.value = ''
  mostrarNueva.value = true
}

async function crear() {
  creando.value = true
  mensaje.value = ''
  try {
    await $fetch('/api/companies', { method: 'POST', body: { ...nueva } })
    // El servidor ya dejó la sesión en la empresa nueva; recargar limpia el
    // payload cacheado de la anterior.
    reloadNuxtApp({ path: '/', persistState: false })
  } catch (e: any) {
    mensaje.value = e.data?.message || 'No se pudo crear la empresa'
  } finally {
    creando.value = false
  }
}
</script>
