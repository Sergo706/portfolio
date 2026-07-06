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
}>();

</script>

<template>
  <div
    v-if="lastCommit"
    class="flex flex-wrap items-center gap-3"
  >
    <UAvatar
      :src="avatarUrl"
      :alt="lastCommit.author"
      size="xs"
    />
    <span class="text-sm text-white/80">
      {{ lastCommit.author }}
    </span>

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
        variant="subtle"
        color="neutral"
        class="font-mono text-xs"
      />
    </NuxtLink>

    <div class="mt-2 flex w-full items-center justify-between gap-3 sm:mt-0 sm:w-auto sm:ml-auto">
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
          <span v-if="showCommitCount.count !== null">{{ showCommitCount.count }}
            <span class="inline">Commits</span></span>
          <span v-else>Commits</span>
        </template>
      </UButton>
    </div>
  </div>
</template>