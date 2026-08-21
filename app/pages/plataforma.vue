<template>
  <div>
    <header class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-content">Plataforma</h1>
      <p class="mt-1 text-sm text-content-muted">
        Todas las empresas y usuarios del sistema. Solo visible para superadministradores.
      </p>
    </header>

    <UiAlert v-if="!isSuperadmin" type="warning">
      Necesitas permisos de plataforma para ver esta página.
    </UiAlert>

    <template v-else>
      <section class="card mb-8">
        <div class="mb-5 border-b border-line pb-4">
          <h2 class="text-lg font-semibold text-content">Empresas</h2>
          <p class="mt-1 text-sm text-content-muted">
            Suspender bloquea las escrituras pero deja consultar y exportar la contabilidad.
          </p>
        </div>

        <div v-if="pendingEmpresas" class="flex justify-center py-10">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-sm">
            <thead>
              <tr class="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-content-muted">
                <th class="px-3 py-2.5">Empresa</th>
                <th class="px-3 py-2.5 text-right">Usuarios</th>
                <th class="px-3 py-2.5 text-right">Comprobantes</th>
                <th class="px-3 py-2.5">Plan</th>
                <th class="px-3 py-2.5">Estado</th>
                <th class="px-3 py-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in empresas ?? []" :key="c.id" class="border-b border-line last:border-b-0">
                <td class="px-3 py-3">
                  <p class="font-medium text-content">{{ c.razonSocial }}</p>
                  <p class="font-mono text-xs text-content-muted">{{ c.ruc || '—' }}</p>
                </td>
                <td class="px-3 py-3 text-right tabular-nums text-content-soft">
                  {{ c.usuarios }}<span v-if="c.limiteUsuarios" class="text-content-muted"> / {{ c.limiteUsuarios }}</span>
                </td>
                <td class="px-3 py-3 text-right tabular-nums text-content-soft">
                  {{ c.comprobantes }}<span v-if="c.limiteVouchersAnual" class="text-content-muted"> / {{ c.limiteVouchersAnual }}</span>
                </td>
                <td class="px-3 py-3">
                  <select
                    class="select-field py-1.5 text-xs"
                    :value="c.plan"
                    @change="cambiarPlan(c, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="FREE">Gratuito</option>
                    <option value="PRO">Pro</option>
                  </select>
                </td>
                <td class="px-3 py-3">
                  <UiBadge :variant="c.estado === 'ACTIVA' ? 'green' : 'red'">
                    {{ c.estado === 'ACTIVA' ? 'Activa' : 'Suspendida' }}
                  </UiBadge>
                </td>
                <td class="px-3 py-3 text-center">
                  <button type="button" class="text-sm text-brand-600 hover:underline" @click="alternarEstado(c)">
                    {{ c.estado === 'ACTIVA' ? 'Suspender' : 'Reactivar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="mb-5 border-b border-line pb-4">
          <h2 class="text-lg font-semibold text-content">Usuarios</h2>
          <p class="mt-1 text-sm text-content-muted">
            Cuentas de la plataforma. Desactivar una la deja fuera de todas sus empresas.
          </p>
        </div>

        <div v-if="pendingUsuarios" class="flex justify-center py-10">
          <div class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[620px] text-sm">
            <thead>
              <tr class="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-content-muted">
                <th class="px-3 py-2.5">Usuario</th>
                <th class="px-3 py-2.5 text-right">Empresas</th>
                <th class="px-3 py-2.5">Plataforma</th>
                <th class="px-3 py-2.5">Estado</th>
                <th class="px-3 py-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in usuarios ?? []" :key="u.id" class="border-b border-line last:border-b-0">
                <td class="px-3 py-3">
                  <p class="font-medium text-content">{{ u.nombre || u.username }}</p>
                  <p class="text-xs text-content-muted">&#64;{{ u.username }}</p>
                </td>
                <td class="px-3 py-3 text-right tabular-nums text-content-soft">{{ u.empresas }}</td>
                <td class="px-3 py-3">
                  <UiBadge :variant="u.platformRole === 'SUPERADMIN' ? 'purple' : 'gray'">
                    {{ u.platformRole === 'SUPERADMIN' ? 'Superadmin' : 'Usuario' }}
                  </UiBadge>
                </td>
                <td class="px-3 py-3">
                  <UiBadge :variant="u.activo ? 'green' : 'red'">{{ u.activo ? 'Activo' : 'Inactivo' }}</UiBadge>
                </td>
                <td class="px-3 py-3 text-center whitespace-nowrap">
                  <button type="button" class="text-sm text-brand-600 hover:underline" @click="alternarSuperadmin(u)">
                    {{ u.platformRole === 'SUPERADMIN' ? 'Quitar superadmin' : 'Hacer superadmin' }}
                  </button>
                  <button type="button" class="ml-3 text-sm text-red-600 hover:underline" @click="alternarActivo(u)">
                    {{ u.activo ? 'Desactivar' : 'Activar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div
        v-if="mensaje"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
      >
        {{ mensaje }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface EmpresaPlataforma {
  id: number
  ruc: string
  razonSocial: string
  estado: 'ACTIVA' | 'SUSPENDIDA'
  plan: string
  limiteVouchersAnual: number | null
  limiteUsuarios: number | null
  usuarios: number
  comprobantes: number
}

interface UsuarioPlataforma {
  id: number
  username: string
  nombre: string | null
  platformRole: 'SUPERADMIN' | 'USER'
  activo: boolean
  empresas: number
}

const { isSuperadmin } = useAuth()
const mensaje = ref('')

const { data: empresas, pending: pendingEmpresas, refresh: refrescarEmpresas } =
  useFetch<EmpresaPlataforma[]>('/api/platform/companies', { immediate: true })
const { data: usuarios, pending: pendingUsuarios, refresh: refrescarUsuarios } =
  useFetch<UsuarioPlataforma[]>('/api/platform/users', { immediate: true })

async function guardarEmpresa(id: number, body: Record<string, unknown>) {
  mensaje.value = ''
  try {
    await $fetch(`/api/platform/companies/${id}`, { method: 'PUT', body })
    await refrescarEmpresas()
  } catch (e: any) {
    mensaje.value = e.data?.message || 'No se pudo guardar'
  }
}

function alternarEstado(c: EmpresaPlataforma) {
  return guardarEmpresa(c.id, { estado: c.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA' })
}

function cambiarPlan(c: EmpresaPlataforma, plan: string) {
  return guardarEmpresa(c.id, { plan })
}

async function guardarUsuario(id: number, body: Record<string, unknown>) {
  mensaje.value = ''
  try {
    await $fetch(`/api/platform/users/${id}`, { method: 'PUT', body })
    await refrescarUsuarios()
  } catch (e: any) {
    mensaje.value = e.data?.message || 'No se pudo guardar'
  }
}

function alternarSuperadmin(u: UsuarioPlataforma) {
  return guardarUsuario(u.id, { platformRole: u.platformRole === 'SUPERADMIN' ? 'USER' : 'SUPERADMIN' })
}

function alternarActivo(u: UsuarioPlataforma) {
  return guardarUsuario(u.id, { activo: !u.activo })
}
</script>
