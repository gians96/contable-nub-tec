<template>
  <UiModal :model-value="modelValue" title="Mi cuenta" size="sm" @update:model-value="cerrar">
    <div class="space-y-6">
      <!-- Datos de acceso -->
      <form id="form-perfil" class="space-y-4" @submit.prevent="guardarPerfil">
        <div>
          <label class="label-field" for="mc-usuario">Usuario</label>
          <input id="mc-usuario" :value="user?.username" type="text" class="input-field" disabled />
          <p class="hint-field">El nombre de usuario no se puede cambiar.</p>
        </div>
        <div>
          <label class="label-field" for="mc-nombre">Nombre</label>
          <input id="mc-nombre" v-model="perfil.nombre" type="text" class="input-field" placeholder="Como quieres que te vean" />
        </div>
        <div>
          <label class="label-field" for="mc-email">Correo</label>
          <input
            id="mc-email"
            v-model="perfil.email"
            type="email"
            class="input-field"
            placeholder="tu@correo.com"
            autocapitalize="none"
            spellcheck="false"
          />
          <p class="hint-field">Podrás iniciar sesión con tu usuario <strong>o</strong> con este correo.</p>
        </div>

        <div v-if="perfilMsg" class="rounded-lg px-3 py-2 text-sm" :class="claseAviso(perfilError)">
          {{ perfilMsg }}
        </div>

        <button type="submit" class="btn-secondary w-full" :disabled="guardandoPerfil">
          {{ guardandoPerfil ? 'Guardando…' : 'Guardar datos' }}
        </button>
      </form>

      <!-- Contraseña -->
      <form id="form-password" class="space-y-4 border-t border-line pt-6" @submit.prevent="cambiarPassword">
        <div>
          <h3 class="text-sm font-semibold text-content">Cambiar contraseña</h3>
          <p v-if="user?.debeCambiarPassword" class="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Estás usando una contraseña temporal. Cámbiala para que solo tú la conozcas.
          </p>
        </div>

        <div>
          <label class="label-field" for="pw-actual">Contraseña actual</label>
          <input id="pw-actual" v-model="form.passwordActual" type="password" autocomplete="current-password" class="input-field" />
        </div>
        <div>
          <label class="label-field" for="pw-nueva">Nueva contraseña</label>
          <input id="pw-nueva" v-model="form.passwordNueva" type="password" autocomplete="new-password" class="input-field" />
          <p class="hint-field">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label class="label-field" for="pw-repetir">Repetir nueva contraseña</label>
          <input id="pw-repetir" v-model="form.repetir" type="password" autocomplete="new-password" class="input-field" />
        </div>

        <div v-if="mensaje" class="rounded-lg px-3 py-2 text-sm" :class="claseAviso(error)">
          {{ mensaje }}
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Cambiar contraseña' }}
        </button>
      </form>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <button type="button" class="btn-secondary" @click="cerrar">Cerrar</button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { user, checkAuth } = useAuth()

const perfil = reactive({ nombre: '', email: '' })
const guardandoPerfil = ref(false)
const perfilMsg = ref('')
const perfilError = ref(false)

const form = reactive({ passwordActual: '', passwordNueva: '', repetir: '' })
const guardando = ref(false)
const mensaje = ref('')
const error = ref(false)

function claseAviso(hayError: boolean) {
  return hayError
    ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
    : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
}

function cerrar() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (abierto) => {
  if (!abierto) return
  perfil.nombre = user.value?.nombre ?? ''
  perfil.email = user.value?.email ?? ''
  perfilMsg.value = ''
  form.passwordActual = ''
  form.passwordNueva = ''
  form.repetir = ''
  mensaje.value = ''
})

async function guardarPerfil() {
  guardandoPerfil.value = true
  perfilMsg.value = ''
  try {
    await $fetch('/api/auth/profile', { method: 'PUT', body: { ...perfil } })
    await checkAuth()
    perfilMsg.value = '✓ Datos actualizados'
    perfilError.value = false
  } catch (e: any) {
    perfilMsg.value = e.data?.message || 'No se pudieron guardar los datos'
    perfilError.value = true
  } finally {
    guardandoPerfil.value = false
  }
}

async function cambiarPassword() {
  if (form.passwordNueva !== form.repetir) {
    mensaje.value = 'Las contraseñas nuevas no coinciden'
    error.value = true
    return
  }
  if (form.passwordNueva.length < 8) {
    mensaje.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    error.value = true
    return
  }

  guardando.value = true
  mensaje.value = ''
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { passwordActual: form.passwordActual, passwordNueva: form.passwordNueva },
    })
    await checkAuth()
    mensaje.value = '✓ Contraseña actualizada'
    error.value = false
    form.passwordActual = ''
    form.passwordNueva = ''
    form.repetir = ''
  } catch (e: any) {
    mensaje.value = e.data?.message || 'No se pudo cambiar la contraseña'
    error.value = true
  } finally {
    guardando.value = false
  }
}
</script>
