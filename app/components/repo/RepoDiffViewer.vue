<script setup lang="ts">
import { useGitRepo } from '~/composables/repo/useGitRepo';
import type { GitCommit, DiffFile } from '~~/shared/types/Git';
import type { Ref } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';

defineProps<{
  repoName: string;
  hash: string;
}>();

const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');
const currentDiff = inject<Ref<{
    files: DiffFile[];
    stats: {
        filesChanged: number;
        insertions: number;
        deletions: number;
    };
} | null>>('currentDiff');

const currentCommit = inject<Ref<GitCommit | null>>('currentCommit');

const viewMode = ref<'unified' | 'split'>('split');
const isWrapped = ref(true);

const itemsPerPage = 6;
const page = ref(1);

const visibleFiles = computed(() => {
  if (!currentDiff?.value) return [];
  return currentDiff.value.files.slice(0, page.value * itemsPerPage);
});

const hasMoreFiles = computed(() => {
  if (!currentDiff?.value) return false;
  return visibleFiles.value.length < currentDiff.value.files.length;
});

const loadMoreTrigger = ref<HTMLElement | null>(null);

useIntersectionObserver(
  loadMoreTrigger,
  (entries) => {
    if (entries[0]?.isIntersecting && hasMoreFiles.value) {
      page.value++;
    }
  },
  { rootMargin: '200px' }
);

const route = useRoute();

watch(
  [() => currentDiff?.value, () => route.hash] as const,
  async ([newDiff, newHash], oldVals) => {
    const oldDiff = oldVals[0];

    if (newDiff !== oldDiff) {
      page.value = 1;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!newDiff || !newHash?.startsWith('#diff-')) return;

    const rawPath = newHash.slice(6);
    const filePath = decodeURIComponent(rawPath);
    
    const fileIndex = newDiff.files.findIndex(f => f.path === filePath || f.path === rawPath);
    
    if (fileIndex !== -1) {
      const targetPage = Math.ceil((fileIndex + 1) / itemsPerPage);
      if (page.value < targetPage) {
        page.value = targetPage;
      }

      await nextTick();
      setTimeout(() => {
        const actualPath = newDiff.files[fileIndex]?.path;
        if (actualPath) {
          const el = document.getElementById(`diff-${actualPath}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-6 w-full max-w-full pb-10">
    <template v-if="currentCommit && currentDiff">
      <RepoCommitSummaryCard 
        :commit="currentCommit"
        :repo-name="repoName"
        :files-changed="currentDiff.stats.filesChanged"
        :additions="currentDiff.stats.insertions"
        :deletions="currentDiff.stats.deletions"
        :current-branch="gitRepo!.currentBranch.value"
      />
    
      <div class="flex flex-col gap-4">
        <RepoDiffLayoutControls
          v-model:is-wrapped="isWrapped"
          v-model:view-mode="viewMode"
          class="mb-5"
        />

        <RepoCommitDiffCard
          v-for="file in visibleFiles"
          :id="`diff-${file.path}`"
          :key="file.path"
          :file="file"
          :commit-hash="currentCommit.hash"
          :parent-hash="currentCommit.parentHash ?? ''"
          :repo-name="repoName"
          :view-mode="viewMode"
          :is-wrapped="isWrapped"
        />

        <div
          v-if="hasMoreFiles"
          ref="loadMoreTrigger"
          class="h-10 w-full flex items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-white/50 w-5 h-5"
          />
        </div>
      </div>
    </template>
    
    <template v-else>
      <UCard
        variant="outline"
        :ui="{ root: 'backdrop-blur-sm border border-white/10', body: 'p-0', header: 'p-4 bg-zinc-900/80 border-b border-white/10' }"
      >
        <template #header>
          <div class="flex items-center justify-items-normal gap-4 w-full flex-wrap">
            <USkeleton class="h-6 w-24 sm:w-32" />
            <USkeleton class="h-6 w-16" />
            <div class="flex items-center gap-2 sm:ml-auto shrink-0">
              <USkeleton class="h-8 w-20" />
              <USkeleton class="h-8 w-28" />
            </div>
          </div>
        </template>
        <div class="flex flex-col w-full p-4 gap-4">
          <div class="flex flex-col gap-2 w-full">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
          </div>
          <div class="flex items-center gap-3">
            <USkeleton class="h-8 w-8 rounded-full" />
            <div class="flex flex-col gap-1.5">
              <USkeleton class="h-3 w-32" />
              <USkeleton class="h-3 w-24" />
            </div>
          </div>
        </div>
      </UCard>

      <div class="flex justify-end px-1 mt-[-8px]">
        <USkeleton class="h-8 w-40 rounded-lg" />
      </div>

      <div class="flex flex-col gap-4">
        <UCard
          v-for="i in 3"
          :key="i"
          :ui="{ root: 'border border-white/10 bg-zinc-900/60 overflow-hidden', body: 'p-4', header: 'p-2 sm:px-4 bg-zinc-900/80 border-b border-white/10' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <USkeleton class="h-4 w-4" />
                <USkeleton class="h-4 w-48 sm:w-64" />
              </div>
              <div class="flex items-center gap-3">
                <USkeleton class="h-4 w-8" />
                <USkeleton class="h-4 w-8" />
                <USkeleton class="h-6 w-6" />
              </div>
            </div>
          </template>
          <div class="flex flex-col gap-2">
            <USkeleton class="h-4 w-full opacity-50" />
            <USkeleton class="h-4 w-4/5 opacity-50" />
            <USkeleton class="h-4 w-11/12 opacity-50" />
            <USkeleton class="h-4 w-2/3 opacity-50" />
            <USkeleton class="h-4 w-full opacity-50" />
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
