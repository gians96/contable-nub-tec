<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Tema resuelto en el servidor a partir de la cookie: el HTML sale ya con la
// clase puesta. El modo "sistema" lo completa el script inline de nuxt.config,
// que es lo único capaz de saber la preferencia del SO antes del primer pintado.
const modo = useCookie<'light' | 'dark' | 'system'>('cp-theme', {
  default: () => 'system',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
})

useHead({
  htmlAttrs: {
    class: computed(() => (modo.value === 'dark' ? 'dark' : '')),
  },
})
</script>
