<script setup lang="ts">
defineProps<{
  filePath?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <div class="flex flex-wrap items-center gap-2 h-7">
      <USkeleton class="h-5 w-24" />
      <span class="text-zinc-600">></span>
      <USkeleton class="h-5 w-20" />
      <template v-if="filePath">
        <span class="text-zinc-600">></span>
        <USkeleton class="h-5 w-40" />
      </template>
    </div>

    <div class="flex items-center gap-3 border border-zinc-800 rounded-lg p-4">
      <USkeleton class="size-8 rounded-full shrink-0" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-3.5 w-48" />
        <USkeleton class="h-3 w-32" />
      </div>
      <USkeleton class="h-3 w-20 shrink-0" />
    </div>

    <UCard
      :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm shadow-xl' }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <USkeleton class="size-4 rounded" />
          <USkeleton class="h-4 w-28" />
        </div>
      </template>
      <div class="divide-y divide-white/5">
        <div
          v-for="i in 6"
          :key="i"
          class="flex items-center justify-between gap-4 px-4 py-2.5"
        >
          <div class="flex items-center gap-3">
            <USkeleton class="size-4 rounded" />
            <USkeleton
              class="h-3.5"
              :style="{ width: `${60 + (i * 20) % 80}px` }"
            />
          </div>
          <div class="flex items-center gap-4">
            <USkeleton
              class="h-3"
              :style="{ width: `${100 + (i * 30) % 120}px` }"
            />
            <USkeleton class="h-3 w-16" />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
