<template>
  <div class="rounded-lg p-4 flex items-start gap-3" :class="alertClass">
    <svg v-if="type === 'info'" class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
    </svg>
    <svg v-else-if="type === 'warning'" class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    <svg v-else class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div class="text-sm">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  type?: 'info' | 'warning' | 'success'
}>()

const alertClass = computed(() => {
  const types: Record<string, string> = {
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }
  return types[props.type || 'info']
})
</script>
