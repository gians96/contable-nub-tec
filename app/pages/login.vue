<template>
  <div class="w-full max-w-md px-4">
    <div class="card-elevated overflow-hidden p-0">
      <div class="border-b border-line bg-gradient-to-br from-brand-50/80 to-white px-8 pb-8 pt-10 text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/25">
          <span class="text-2xl font-bold text-white">CP</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-content">ContaPYME</h1>
        <p class="mt-1.5 text-sm text-content-soft">Control tributario MYPE — Perú</p>
      </div>

      <form class="space-y-5 px-8 py-8" @submit.prevent="handleLogin">
        <div class="space-y-1.5">
          <label class="label-field" for="login-user">Usuario o correo</label>
          <input
            id="login-user"
            v-model="username"
            type="text"
            class="input-field"
            placeholder="tu usuario o tu@correo.com"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
          />
        </div>
        <div class="space-y-1.5">
          <label class="label-field" for="login-pass">Contraseña</label>
          <input
            id="login-pass"
            v-model="password"
            type="password"
            class="input-field"
            placeholder="••••••••"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="error" class="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-800 dark:text-red-200">
          {{ error }}
        </div>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const { login } = useAuth()

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    navigateTo('/')
  } catch (e: any) {
    error.value = e.data?.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>
