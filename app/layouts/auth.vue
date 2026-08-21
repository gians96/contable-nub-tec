<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/60 via-transparent to-transparent dark:from-brand-500/15"
    />
    <div class="relative z-10 flex w-full justify-center">
      <slot />
    </div>
  </div>
</template>
