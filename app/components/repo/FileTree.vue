<script setup lang="ts">
import type { GitFile } from '~~/shared/types/Git';
import { getIcon } from '~/utils/useTreeLinks';
import { useTimeAgo } from '@vueuse/core';

defineProps<{
  files: GitFile[];
  repoName: string;
  currentBranch: string;
}>();
</script>

<template>
  <div class="divide-y divide-white/5">
    <div
      v-for="file in files"
      :key="file.path"
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-4 py-2.5 transition-colors hover:bg-white/5 group"
    >
      <NuxtLink
        :to="file.type === 'file' ? `/repo/${repoName}/blob/${currentBranch}/${file.path}` : `/repo/${repoName}/tree/${currentBranch}/${file.path}`"
        class="flex items-center gap-3 truncate min-w-0 sm:w-1/3 group-hover:underline"
      >
        <UIcon
          :name="getIcon(file.path, file.type === 'file')"
          class="size-4 shrink-0"
        />
        <span
          class="text-sm truncate"
          :class="file.type === 'dir' ? 'text-white/90' : 'text-white/70'"
        >
          {{ file.name }}
        </span>
      </NuxtLink>

      <div
        v-if="file.commit"
        class="flex items-center justify-between gap-4 text-xs text-white/50 truncate min-w-0 flex-1 pl-7 sm:pl-0"
      >
        <div class="flex items-center gap-2 truncate min-w-0">
          <UAvatar
            :src="`https://github.com/${file.commit.author}.png`"
            :alt="file.commit.author"
            size="2xs"
          />
          <span class="text-white/60 shrink-0">{{ file.commit.author }}</span>
          <NuxtLink
            :to="`/repo/${repoName}/commit/${file.commit.hash}`"
            class="truncate hover:text-white/70 hover:underline transition-colors"
            :title="file.commit.message"
          >
            {{ file.commit.message }}
          </NuxtLink>
        </div>
        <span class="shrink-0 whitespace-nowrap text-right w-24">{{ useTimeAgo(file.commit.date).value }}</span>
      </div>
    </div>
  </div>
</template>