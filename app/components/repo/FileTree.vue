<script setup lang="ts">
import type { GitFile } from '~~/shared/types/Git';
import { getIcon } from '~/utils/useTreeLinks';
import { useTimeAgo } from '@vueuse/core';
import { useGitAvatar } from '~/composables/repo/useGitAvatar';

const getAvatar = (commit: GitCommit) => useGitAvatar(ref(commit)).value;
defineProps<{
  files: GitFile[];
  repoName: string;
  currentBranch: string;
  isResolvingCommits: boolean;
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
        class="flex items-center justify-between text-xs text-white/50 pt-1 truncate min-w-0 flex-1 pl-0 sm:pt-0"
      >
        <div class="flex items-center gap-2 truncate min-w-0">
          <UUser
            :name="file.commit.author"
            :avatar="{ 
              src: getAvatar(file.commit),
              alt: file.commit.author
            }"
            size="2xs"
          />
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
      <div
        v-else-if="isResolvingCommits"
        class="flex items-center justify-between text-xs text-white/50 pt-1 truncate min-w-0 flex-1 pl-0 sm:pt-0 gap-4"
      >
        <div class="flex items-center gap-2 flex-1 w-full truncate">
          <USkeleton class="h-5 w-5 rounded-full bg-white/5 shrink-0" />
          <USkeleton class="h-4 w-3/4 sm:w-64 bg-white/5" />
        </div>
        <USkeleton class="h-4 w-16 bg-white/5 shrink-0" />
      </div>
      <div
        v-else
        class="flex items-center justify-between text-xs text-white/50 pt-1 truncate min-w-0 flex-1 pl-0 sm:pt-0"
      >
        <UUser
          name="View History"
          :to="file.type === 'file' ? `/repo/${repoName}/blob/${currentBranch}/${file.path}` : `/repo/${repoName}/tree/${currentBranch}/${file.path}`"
          :avatar="{ 
            icon: 'i-lucide-history',
            class: 'bg-white/5 text-white/40'
          }"
          size="2xs"
          class="truncate min-w-0 text-white/40"
          :ui="{ name: 'text-white/40' }"
        />
      </div>
    </div>
  </div>
</template>