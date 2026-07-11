<script setup lang="ts">
import type { GitCommit } from '~~/shared/types/Git';

type Commits = 
  | { show: false }
  | { show: true; count: number | null; currentBranch: string; historyPath?: string };

defineProps<{
    lastCommit: GitCommit | null;
    avatarUrl: string;
    repoName: string;
    timeAgo: string;
    showCommitCount: Commits;
    isResolvingCommits: boolean;
}>();

</script>

<template>
  <div
    v-if="lastCommit"
    class="flex flex-wrap items-center gap-2"
  >
    <UUser
      :name="lastCommit.author"
      :avatar="{ 
        src: avatarUrl,
        alt: lastCommit.author
      }"
      size="xs"
    />

    <NuxtLink
      :to="`/repo/${repoName}/commit/${lastCommit.hash}`"
      class="min-w-0 flex-1 truncate text-sm text-white/60 hover:text-white/80 hover:underline transition-colors"
    >
      {{ lastCommit.message }}
    </NuxtLink>

    <NuxtLink
      :to="`/repo/${repoName}/commit/${lastCommit.hash}`"
      class="hover:opacity-80 transition-opacity"
    >
      <UBadge
        :label="lastCommit.hash.slice(0, 7)"
        variant="outline"
        class="font-mono text-xs"
      />
    </NuxtLink>

    <div class="mt-2 flex w-full items-center  gap-3 sm:mt-0 sm:w-auto sm:ml-auto">
      <span class="text-xs text-white/40">
        {{ timeAgo }}
      </span>

      <UButton
        v-if="showCommitCount.show"
        :to="showCommitCount.historyPath 
          ? `/repo/${repoName}/commits/${showCommitCount.currentBranch}/${showCommitCount.historyPath}` 
          : `/repo/${repoName}/commits/${showCommitCount.currentBranch}`"
        icon="i-lucide-history"
        variant="ghost"
        size="xs"
      >
        <template v-if="showCommitCount.historyPath">
          History
        </template>
        <template v-else>
          <template v-if="showCommitCount.count !== null">
            <span>{{ showCommitCount.count >= 1000 ? '1000+' : showCommitCount.count }}</span>
            <span class="inline">Commits</span>
          </template>
          <template v-else-if="isResolvingCommits">
            <USkeleton class="h-3 w-6 bg-white/10" />
            <span class="inline">Commits</span>
          </template>
          <template v-else>
            <span>0</span>
            <span class="inline">Commits</span>
          </template>
        </template>
      </UButton>
    </div>
  </div>
  <div
    v-else-if="isResolvingCommits"
    class="flex flex-wrap items-center gap-2 w-full"
  >
    <USkeleton class="h-6 w-6 rounded-full bg-white/5" />
    <USkeleton class="h-4 w-1/3 bg-white/5" />
    <USkeleton class="h-4 w-16 bg-white/5" />
    <div class="mt-2 flex w-full items-center gap-3 sm:mt-0 sm:w-auto sm:ml-auto">
      <USkeleton class="h-4 w-20 bg-white/5" />
      <USkeleton class="h-6 w-24 bg-white/5" />
    </div>
  </div>
  <div
    v-else
    class="flex w-full items-center justify-center p-4"
  >
    <span class="text-sm text-white/40">No commits yet</span>
  </div>
</template>