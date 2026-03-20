<template>
  <div
    class="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"
  >
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-100/60 via-slate-100 to-slate-200"
    />
    <div class="relative z-10 flex w-full justify-center">
      <slot />
    </div>
  </div>
</template>
