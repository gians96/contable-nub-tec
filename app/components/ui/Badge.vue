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
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700',
    yellow: 'bg-yellow-100 text-yellow-700',
  }
  return variants[props.variant || 'gray']
})
</script>
