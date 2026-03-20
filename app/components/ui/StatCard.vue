<template>
  <div class="card relative">
    <div class="flex items-start justify-between mb-2">
      <h3 class="text-sm font-medium text-gray-500">{{ title }}</h3>
      <div v-if="tooltip" class="group relative">
        <svg class="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
        </svg>
        <div class="invisible group-hover:visible absolute right-0 top-6 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
          {{ tooltip }}
        </div>
      </div>
    </div>
    <p class="text-2xl font-bold" :class="valueColor">
      {{ prefix }}{{ formattedValue }}
    </p>
    <p v-if="subtitle" class="text-xs text-gray-400 mt-1">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  value: number
  prefix?: string
  subtitle?: string
  tooltip?: string
  color?: 'green' | 'red' | 'blue' | 'orange' | 'gray'
}>()

const valueColor = computed(() => {
  const colors = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    gray: 'text-gray-700',
  }
  return colors[props.color || 'gray']
})

const formattedValue = computed(() => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(props.value)
})
</script>
