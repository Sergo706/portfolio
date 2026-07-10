<template>
  <div class="space-y-4">
    <USkeleton class="h-10 w-64" />
    <USkeleton class="h-6 w-full" />
    <div class="space-y-2">
      <USkeleton
        v-for="i in 8"
        :key="i"
        class="h-8 w-full"
      />
    </div>
    <USkeleton class="h-48 w-full" />
  </div>
</template>
