<template>
  <UiModal :model-value="modelValue" title="Cambiar contraseña" size="sm" @update:model-value="cerrar">
    <form id="form-password" class="space-y-4" @submit.prevent="guardar">
      <div>
        <label class="label-field" for="pw-actual">Contraseña actual</label>
        <input
          id="pw-actual"
          v-model="form.passwordActual"
          type="password"
          autocomplete="current-password"
          class="input-field"
          required
        />
      </div>
      <div>
        <label class="label-field" for="pw-nueva">Nueva contraseña</label>
        <input
          id="pw-nueva"
          v-model="form.passwordNueva"
          type="password"
          autocomplete="new-password"
          class="input-field"
          required
        />
        <p class="hint-field">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label class="label-field" for="pw-repetir">Repetir nueva contraseña</label>
        <input
          id="pw-repetir"
          v-model="form.repetir"
          type="password"
          autocomplete="new-password"
          class="input-field"
          required
        />
      </div>

      <div
        v-if="mensaje"
        class="rounded-lg px-3 py-2 text-sm"
        :class="error
          ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'"
      >
        {{ mensaje }}
      </div>
    </form>

    <template #footer>
      <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" class="btn-secondary" @click="cerrar">Cancelar</button>
        <button type="submit" form="form-password" class="btn-primary" :disabled="guardando">
          {{ guardando ? 'Guardando…' : 'Cambiar contraseña' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const form = reactive({ passwordActual: '', passwordNueva: '', repetir: '' })
const guardando = ref(false)
const mensaje = ref('')
const error = ref(false)

function reset() {
  form.passwordActual = ''
  form.passwordNueva = ''
  form.repetir = ''
  mensaje.value = ''
  error.value = false
}

function cerrar() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (abierto) => {
  if (abierto) reset()
})

async function guardar() {
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
    mensaje.value = '✓ Contraseña actualizada'
    error.value = false
    setTimeout(cerrar, 900)
  } catch (e: any) {
    mensaje.value = e.data?.message || 'No se pudo cambiar la contraseña'
    error.value = true
  } finally {
    guardando.value = false
  }
}
</script>
