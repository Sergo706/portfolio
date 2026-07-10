<template>
  <div class="space-y-4 px-4 sm:px-6 lg:px-8">
    <USkeleton
      v-for="i in 5"
      :key="i"
      class="h-24 w-full"
    />
  </div>
</template>
