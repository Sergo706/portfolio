<script setup lang="ts">
const props = defineProps<{
  title: string;
  description: string;
  date: string;
  image?: string;
  path: string;
  contentType: 'guide' | 'tutorial' | 'recipe';
  category: string;
  readingTime: string;
  tags: string[];
}>();

const contentTypeIcon = computed(() => {
  if (props.contentType === 'guide') return 'i-lucide-book-open';
  if (props.contentType === 'recipe') return 'i-lucide-file-code-2';
  return 'i-lucide-graduation-cap';
});

const contentTypeColor = computed(() => {
  if (props.contentType === 'guide') return 'primary';
  if (props.contentType === 'recipe') return 'warning';
  return 'info';
});
</script>

<template>
  <NuxtLink
    :to="path"
    :aria-label="title"
    class="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
  >
    <UCard
      class="h-full flex flex-col transition-all duration-300 hover:border-primary/60 bg-neutral-900/40 backdrop-blur-md border border-white/10 overflow-hidden relative"
      :ui="{ 
        root: '', 
        header: 'p-0 sm:p-0 border-b border-white/5', 
        body: 'flex-1 flex flex-col gap-4 p-5 sm:p-6', 
        footer: 'p-5 sm:p-6 pt-0 sm:pt-0 border-t-0' 
      }"
    >
      <template
        v-if="image"
        #header
      >
        <div class="relative w-full h-48 overflow-hidden bg-neutral-800">
          <NuxtImg
            :src="image"
            :alt="`${title} image`"
            width="800"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-neutral-900/90 via-neutral-900/20 to-transparent" />
        </div>
      </template>

      <div class="relative z-10 flex flex-col flex-1 gap-4">
        <div class="flex items-center justify-between">
          <UBadge
            :icon="contentTypeIcon"
            :color="contentTypeColor"
            variant="subtle"
            size="sm"
            class="capitalize font-medium tracking-wide shadow-sm"
          >
            {{ contentType }}
          </UBadge>
          <span class="flex items-center gap-1.5 text-xs font-medium text-muted/80">
            <UIcon
              name="i-lucide-clock"
              class="size-3.5"
            />
            {{ readingTime }} min read
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="text-xl font-bold leading-tight text-white group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {{ title }}
          </h3>
          <p class="text-sm text-muted line-clamp-3 leading-relaxed font-light">
            {{ description }}
          </p>
        </div>

        <div
          v-if="tags?.length"
          class="flex flex-wrap gap-2 mt-auto pt-2"
        >
          <UBadge
            v-for="tag in tags.slice(0, 3)"
            :key="tag"
            color="neutral"
            variant="soft"
            size="md"
            class="bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            {{ tag }}
          </UBadge>
        </div>
      </div>

      <template #footer>
        <div class="relative z-10 flex items-center justify-between text-xs font-medium text-muted/70  border-white/5 pt-4 mt-2">
          <span class="flex items-center gap-1.5">
            <UIcon
              name="i-lucide-folder"
              class="size-3.5 text-primary/70"
            />
            <span class="uppercase tracking-wider text-[10px]">{{ category }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <UIcon
              name="i-lucide-calendar"
              class="size-3.5"
            />
            <NuxtTime
              :datetime="date"
              month="short"
              day="numeric"
              year="numeric"
            />
          </span>
        </div>
      </template>
    </UCard>
  </NuxtLink>
</template>