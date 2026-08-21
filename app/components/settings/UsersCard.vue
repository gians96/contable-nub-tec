<template>
  <section id="usuarios" class="card flex flex-col">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
      <div>
        <h2 class="text-lg font-semibold text-content">Usuarios</h2>
        <p class="mt-1 text-sm text-content-muted">Quién puede entrar al sistema y con qué permisos.</p>
      </div>
      <button type="button" class="btn-primary" @click="abrirNuevo">+ Nuevo usuario</button>
    </div>

    <div v-if="loading" class="flex flex-1 justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-line text-left text-content-muted">
            <th class="px-3 py-2 font-medium">Usuario</th>
            <th class="px-3 py-2 font-medium">Rol</th>
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
              <UiBadge :variant="u.role === 'ADMIN' ? 'blue' : 'gray'">
                {{ u.role === 'ADMIN' ? 'Administrador' : 'Usuario' }}
              </UiBadge>
            </td>
            <td class="px-3 py-3">
              <UiBadge :variant="u.activo ? 'green' : 'red'">{{ u.activo ? 'Activo' : 'Inactivo' }}</UiBadge>
            </td>
            <td class="px-3 py-3 text-center">
              <button
                type="button"
                class="text-sm text-brand-600 hover:underline"
                @click="alternarActivo(u)"
              >
                {{ u.activo ? 'Desactivar' : 'Activar' }}
              </button>
              <button
                type="button"
                class="ml-3 text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="u.id === yo?.id"
                :title="u.id === yo?.id ? 'No puedes eliminar tu propio usuario' : 'Eliminar'"
                @click="eliminar(u)"
              >
                Eliminar
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

    <UiModal v-model="mostrarNuevo" title="Nuevo usuario" size="sm">
      <form id="form-usuario" class="space-y-4" @submit.prevent="crear">
        <div>
          <label class="label-field" for="us-username">Usuario</label>
          <input id="us-username" v-model="nuevo.username" type="text" class="input-field" required />
        </div>
        <div>
          <label class="label-field" for="us-nombre">Nombre</label>
          <input id="us-nombre" v-model="nuevo.nombre" type="text" class="input-field" placeholder="Opcional" />
        </div>
        <div>
          <label class="label-field" for="us-password">Contraseña</label>
          <input id="us-password" v-model="nuevo.password" type="password" autocomplete="new-password" class="input-field" required />
          <p class="hint-field">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label class="label-field" for="us-role">Rol</label>
          <select id="us-role" v-model="nuevo.role" class="select-field">
            <option value="USUARIO">Usuario</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="btn-secondary" @click="mostrarNuevo = false">Cancelar</button>
          <button type="submit" form="form-usuario" class="btn-primary" :disabled="creando">
            {{ creando ? 'Creando…' : 'Crear usuario' }}
          </button>
        </div>
      </template>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
interface UsuarioFila {
  id: number
  username: string
  nombre: string | null
  role: 'ADMIN' | 'USUARIO'
  activo: boolean
}

const { user: yo } = useAuth()

const usuarios = ref<UsuarioFila[]>([])
const loading = ref(true)
const mensaje = ref('')
const error = ref(false)
const mostrarNuevo = ref(false)
const creando = ref(false)

const nuevo = reactive({ username: '', nombre: '', password: '', role: 'USUARIO' })

async function cargar() {
  loading.value = true
  try {
    usuarios.value = await $fetch<UsuarioFila[]>('/api/users')
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
  nuevo.password = ''
  nuevo.role = 'USUARIO'
  mensaje.value = ''
  mostrarNuevo.value = true
}

async function crear() {
  creando.value = true
  mensaje.value = ''
  try {
    await $fetch('/api/users', { method: 'POST', body: { ...nuevo } })
    mostrarNuevo.value = false
    mensaje.value = '✓ Usuario creado'
    error.value = false
    await cargar()
  } catch (e: any) {
    mostrarError(e)
  } finally {
    creando.value = false
  }
}

async function alternarActivo(u: UsuarioFila) {
  mensaje.value = ''
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PUT', body: { activo: !u.activo } })
    await cargar()
  } catch (e: any) {
    mostrarError(e)
  }
}

async function eliminar(u: UsuarioFila) {
  if (!confirm(`¿Eliminar el usuario ${u.username}?`)) return
  mensaje.value = ''
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'DELETE' })
    await cargar()
  } catch (e: any) {
    mostrarError(e)
  }
}

onMounted(cargar)
</script>
