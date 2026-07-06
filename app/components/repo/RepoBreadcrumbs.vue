<script setup lang="ts">
import { getIcon } from '~/utils/useTreeLinks';
import { formatItem } from '~/utils/useString';

const props = defineProps<{
  repoName: string;
  branch: string;
  filePath?: string;
  isTree?: boolean;
}>();

const pathParts = computed(() => {
  if (!props.filePath) return [];
  const parts = props.filePath.split('/');
  let currentPath = '';

  return parts.map((part, index) => {
    currentPath += currentPath ? `/${part}` : part;
    const isLast = index === parts.length - 1;
    const isFile = isLast && !props.isTree;
    return {
      label: part,
      icon: getIcon(currentPath, isFile),
      to: isFile 
        ? `/repo/${props.repoName}/blob/${props.branch}/${currentPath}`
        : `/repo/${props.repoName}/tree/${props.branch}/${currentPath}`
    };
  });
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 sm:gap-1.5 text-sm">
    <NuxtLink
      :to="`/repo/${repoName}/tree/${branch}`"
      class="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/5"
    >
      <UIcon
        name="i-lucide-book-marked"
        class="size-4 shrink-0"
      />
      <span class="font-medium">{{ repoName }}</span>
    </NuxtLink>

    <template
      v-for="(part, idx) in pathParts"
      :key="part.to"
    >
      <UIcon
        name="i-lucide-chevron-right"
        class="size-3.5 shrink-0 text-white/30"
      />
      <NuxtLink
        :to="part.to"
        class="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200"
        :class="idx === pathParts.length - 1 
          ? 'text-white bg-zinc-900 border border-zinc-800 shadow-sm' 
          : 'text-white/60 hover:text-white hover:bg-white/5'"
      >
        <UIcon
          :name="part.icon"
          class="size-3.5 shrink-0"
          :class="idx === pathParts.length - 1 ? 'text-blue-400' : ''"
        />
        <span class="font-mono text-xs sm:text-sm">{{ formatItem(part.label) }}</span>
      </NuxtLink>
    </template>
  </div>
</template>
