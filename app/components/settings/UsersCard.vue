<template>
  <section id="usuarios" class="card flex flex-col">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
      <div>
        <h2 class="text-lg font-semibold text-content">Miembros</h2>
        <p class="mt-1 text-sm text-content-muted">
          Quién entra a <strong>{{ empresaActiva?.razonSocial }}</strong> y con qué permisos.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="abrirNuevo">+ Añadir miembro</button>
    </div>

    <div v-if="loading" class="flex flex-1 justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[520px] text-sm">
        <thead>
          <tr class="border-b border-line text-left text-content-muted">
            <th class="px-3 py-2 font-medium">Usuario</th>
            <th class="px-3 py-2 font-medium">Rol en la empresa</th>
            <th class="px-3 py-2 font-medium">Estado</th>
            <th class="px-3 py-2 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id" class="border-b border-line last:border-b-0">
            <td class="px-3 py-3">
              <p class="font-medium text-content">{{ u.nombre || u.username }}</p>
              <p class="text-xs text-content-muted">&#64;{{ u.username }}</p>
            </td>
            <td class="px-3 py-3">
              <select
                class="select-field py-1.5 text-xs"
                :value="u.role"
                :title="DESCRIPCION_ROL[u.role]"
                @change="cambiarRol(u, ($event.target as HTMLSelectElement).value as CompanyRole)"
              >
                <option v-for="(nombre, clave) in NOMBRES_ROL" :key="clave" :value="clave">{{ nombre }}</option>
              </select>
            </td>
            <td class="px-3 py-3">
              <UiBadge :variant="u.activo ? 'green' : 'red'">{{ u.activo ? 'Activo' : 'Inactivo' }}</UiBadge>
            </td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <button type="button" class="text-sm text-brand-600 hover:underline" @click="alternarActivo(u)">
                {{ u.activo ? 'Desactivar' : 'Activar' }}
              </button>
              <button type="button" class="ml-3 text-sm text-red-600 hover:underline" @click="quitar(u)">
                Quitar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="mensaje"
      class="mt-4 rounded-lg px-3 py-2 text-sm"
      :class="error
        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
        : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'"
    >
      {{ mensaje }}
    </div>

    <UiModal v-model="mostrarNuevo" title="Añadir miembro" size="sm">
      <form v-if="!credenciales" id="form-usuario" class="space-y-4" @submit.prevent="crear()">
        <div>
          <label class="label-field" for="us-username">Usuario</label>
          <input id="us-username" v-model="nuevo.username" type="text" class="input-field" required autocomplete="off" />
          <p class="hint-field">Si ya tiene cuenta en la plataforma, se le dará acceso a esta empresa.</p>
        </div>
        <div>
          <label class="label-field" for="us-nombre">Nombre</label>
          <input id="us-nombre" v-model="nuevo.nombre" type="text" class="input-field" placeholder="Opcional" />
        </div>
        <div>
          <label class="label-field" for="us-role">Rol</label>
          <select id="us-role" v-model="nuevo.role" class="select-field">
            <option v-for="(nombre, clave) in NOMBRES_ROL" :key="clave" :value="clave">{{ nombre }}</option>
          </select>
          <p class="hint-field">{{ DESCRIPCION_ROL[nuevo.role] }}</p>
        </div>

        <div
          v-if="mensajeModal"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
        >
          {{ mensajeModal }}
          <button
            v-if="ofrecerVincular"
            type="button"
            class="mt-2 block font-semibold underline"
            @click="crear(true)"
          >
            Darle acceso a esta empresa
          </button>
        </div>
      </form>

      <!-- La contraseña se muestra una sola vez: en la base solo queda el hash. -->
      <div v-else class="space-y-4">
        <UiAlert type="success">
          <strong>{{ credenciales.username }}</strong> ya puede entrar a {{ empresaActiva?.razonSocial }}.
        </UiAlert>
        <div v-if="credenciales.passwordTemporal">
          <label class="label-field">Contraseña temporal</label>
          <div class="flex gap-2">
            <input :value="credenciales.passwordTemporal" readonly class="input-field font-mono" />
            <button type="button" class="btn-secondary shrink-0" @click="copiar(credenciales.passwordTemporal!)">
              {{ copiado ? 'Copiada' : 'Copiar' }}
            </button>
          </div>
          <p class="hint-field">
            Anótala ahora: no se guarda en claro y no se podrá volver a mostrar. Pídele que la cambie al entrar.
          </p>
        </div>
        <p v-else class="text-sm text-content-muted">
          Ya tenía cuenta en la plataforma, así que entra con su contraseña de siempre.
        </p>
      </div>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button v-if="credenciales" type="button" class="btn-primary" @click="cerrarNuevo">Listo</button>
          <template v-else>
            <button type="button" class="btn-secondary" @click="cerrarNuevo">Cancelar</button>
            <button type="submit" form="form-usuario" class="btn-primary" :disabled="creando">
              {{ creando ? 'Añadiendo…' : 'Añadir miembro' }}
            </button>
          </template>
        </div>
      </template>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
interface MiembroFila {
  membershipId: number
  id: number
  username: string
  nombre: string | null
  role: CompanyRole
  activo: boolean
}

const { empresaActiva } = useAuth()

const usuarios = ref<MiembroFila[]>([])
const loading = ref(true)
const mensaje = ref('')
const mensajeModal = ref('')
const ofrecerVincular = ref(false)
const error = ref(false)
const mostrarNuevo = ref(false)
const creando = ref(false)
const copiado = ref(false)
const credenciales = ref<{ username: string; passwordTemporal: string | null } | null>(null)

const nuevo = reactive({ username: '', nombre: '', role: 'CONTADOR' as CompanyRole })

async function cargar() {
  loading.value = true
  try {
    usuarios.value = await $fetch<MiembroFila[]>('/api/users')
  } catch (e: any) {
    mostrarError(e)
  } finally {
    loading.value = false
  }
}

function mostrarError(e: any) {
  mensaje.value = e.data?.message || 'No se pudo completar la operación'
  error.value = true
}

function abrirNuevo() {
  nuevo.username = ''
  nuevo.nombre = ''
  nuevo.role = 'CONTADOR'
  mensaje.value = ''
  mensajeModal.value = ''
  ofrecerVincular.value = false
  credenciales.value = null
  copiado.value = false
  mostrarNuevo.value = true
}

function cerrarNuevo() {
  mostrarNuevo.value = false
  credenciales.value = null
}

async function crear(vincularExistente = false) {
  creando.value = true
  mensajeModal.value = ''
  ofrecerVincular.value = false
  try {
    const creado = await $fetch<any>('/api/users', {
      method: 'POST',
      body: { ...nuevo, vincularExistente },
    })
    credenciales.value = { username: creado.username, passwordTemporal: creado.passwordTemporal }
    await cargar()
  } catch (e: any) {
    mensajeModal.value = e.data?.message || 'No se pudo añadir'
    ofrecerVincular.value = e.data?.data?.code === 'USUARIO_EXISTE'
  } finally {
    creando.value = false
  }
}

async function guardar(u: MiembroFila, body: Record<string, unknown>) {
  mensaje.value = ''
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PUT', body })
    await cargar()
  } catch (e: any) {
    mostrarError(e)
    await cargar()
  }
}

function cambiarRol(u: MiembroFila, role: CompanyRole) {
  return guardar(u, { role })
}

function alternarActivo(u: MiembroFila) {
  return guardar(u, { activo: !u.activo })
}

async function quitar(u: MiembroFila) {
  if (!confirm(`¿Quitar a ${u.username} de esta empresa? Su cuenta seguirá existiendo.`)) return
  mensaje.value = ''
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    await cargar()
  } catch (e: any) {
    mostrarError(e)
  }
}

async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 1500)
  } catch {
    // Sin permiso de portapapeles: la contraseña ya está visible en pantalla.
  }
}

onMounted(cargar)
</script>
