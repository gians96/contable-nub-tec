<template>
  <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    :class="badgeClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  variant?: 'green' | 'red' | 'blue' | 'orange' | 'gray' | 'purple' | 'yellow'
}>()

const badgeClass = computed(() => {
  const variants: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200',
    gray: 'bg-surface-muted text-content-soft',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
  }
  return variants[props.variant || 'gray']
})
</script>
