<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/50" @click="close" />
      <!-- Modal -->
      <div class="relative bg-white rounded-xl shadow-xl w-full z-10 max-h-[90vh] flex flex-col"
        :class="sizeClass">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 class="text-lg font-semibold text-gray-800">{{ title }}</h2>
          <button @click="close" class="p-1 rounded-lg hover:bg-gray-100">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <slot />
        </div>
        <!-- Footer -->
        <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const sizeClass = computed(() => {
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }
  return sizes[props.size || 'md']
})

function close() {
  emit('update:modelValue', false)
}
</script>
