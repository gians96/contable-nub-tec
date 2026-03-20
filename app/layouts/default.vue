<template>
  <div class="flex min-h-screen bg-slate-100">
    <!-- Sidebar -->
    <LayoutSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- Overlay mobile -->
    <div
      v-if="!sidebarCollapsed && isMobile"
      class="fixed inset-0 bg-black/40 z-30 lg:hidden"
      @click="sidebarCollapsed = true"
    />

    <!-- Main -->
    <div class="flex-1 flex flex-col min-h-screen transition-all duration-300"
      :class="sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'">
      <!-- Topbar -->
      <header class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <button
          type="button"
          class="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex flex-1 items-center justify-center gap-2 lg:flex-none lg:justify-start">
          <span class="text-sm font-semibold text-slate-800">ContaPYME</span>
          <span class="hidden rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 sm:inline">MYPE</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-slate-600">{{ user?.username }}</span>
          <button type="button" class="text-sm font-medium text-red-600 hover:text-red-700" @click="logout">Salir</button>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarCollapsed = ref(false)
const isMobile = ref(false)

const { data: user } = useFetch('/api/auth/me')

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
  if (isMobile.value) sidebarCollapsed.value = true
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  navigateTo('/login')
}
</script>
