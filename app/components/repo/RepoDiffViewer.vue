<script setup lang="ts">
import { useGitRepo } from '~/composables/repo/useGitRepo';
import { useTimeAgo } from '@vueuse/core';
import type { GitCommit } from '~~/shared/types/Git';

const props = defineProps<{
  repoName: string;
  hash: string;
}>();

const gitRepo = useGitRepo(props.repoName);
const commit = ref<GitCommit | null>(null);
const fetching = ref(true);

onMounted(async () => {
  fetching.value = true;
  try {
    const logs = await gitRepo.git.log({ fs: gitRepo.fs, dir: gitRepo.dir, ref: props.hash, depth: 1 });
    if (logs[0]) {
      commit.value = {
        hash: logs[0].oid,
        message: logs[0].commit.message.trim(),
        author: logs[0].commit.author.name,
        email: logs[0].commit.author.email,
        date: new Date(logs[0].commit.author.timestamp * 1000),
      };
    }
  } catch (e) {
    console.error(e);
  } finally {
    fetching.value = false;
  }
});
</script>

<template>
  <UPage class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm"
        label="Back to Commits"
        @click.prevent="goBack(`/repo/${repoName}`)"
      />
    </div>

    <UCard :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm shadow-xl' }">
      <div
        v-if="fetching"
        class="space-y-4 p-4"
      >
        <USkeleton class="h-6 w-1/3" />
        <USkeleton class="h-4 w-1/4" />
      </div>
      <div
        v-else-if="commit"
        class="p-4 space-y-4"
      >
        <h2 class="text-xl font-semibold text-white/90 whitespace-pre-wrap">
          {{ commit.message }}
        </h2>
        <div class="flex items-center gap-2 text-sm text-white/50">
          <UAvatar
            :src="`https://github.com/${commit.author}.png`"
            size="xs"
          />
          <span class="font-medium text-white/70">{{ commit.author }}</span>
          <span>committed {{ useTimeAgo(commit.date).value }}</span>
        </div>
        <div class="pt-4 mt-4 border-t border-white/10 flex flex-wrap items-center gap-4">
          <UButton
            :to="`https://github.com/Sergo706/${repoName}/commit/${hash}`"
            icon="custom:github"
            external
            target="_blank"
            color="neutral"
            variant="outline"
          >
            View Full Diff on GitHub
          </UButton>
          <UButton
            :to="`/repo/${repoName}/tree/${hash}`"
            icon="i-lucide-folder-git-2"
            color="primary"
            variant="soft"
          >
            Browse Repo at this Commit
          </UButton>
        </div>
      </div>
      <div
        v-else
        class="p-8 text-center text-white/50"
      >
        Commit not found.
      </div>
    </UCard>
  </UPage>
</template>
