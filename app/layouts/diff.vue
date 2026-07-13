<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script setup lang="ts">
import { useGitRepo } from '~/composables/repo/useGitRepo';
import { useSidebar } from '~/composables/repo/useSideBar';
import type { CommandPaletteGroup } from '@nuxt/ui';
import BranchSelector from '~/components/repo/BranchSelector.vue';
import type { DiffFile } from '~~/shared/types/Git';
import { useDiffTreeLinks } from '~/utils/useDiffTreeLinks';

const route = useRoute();
const slug = computed(() => {
  const params = route.params.slug;
  return Array.isArray(params) ? params : [params];
});

const repoName = computed(() => slug.value[0] ?? '');
const viewType = computed(() => slug.value[1] ?? 'main');

const { open } = useSidebar();
const gitRepo = useGitRepo(repoName.value);
const { switchBranch, currentBranch, branches, tags } = gitRepo;

const branch = computed(() => {
  const urlBranch = ['tree', 'blob', 'commits', 'commit'].includes(slug.value[1] ?? '') ? slug.value[2] : undefined;
  
  if (urlBranch) return urlBranch;
  return branches.value.includes('main') ? 'main' : (branches.value.includes('master') ? 'master' : 'main');
});

provide<ReturnType<typeof useGitRepo>>('gitRepo', gitRepo);
const currentDiff = ref<{ 
  files: DiffFile[],     
  stats: {
        filesChanged: number;
        insertions: number;
        deletions: number;
    }; } | null>(null);
provide('currentDiff', currentDiff);

const currentCommit = ref<GitCommit | null>(null);
provide('currentCommit', currentCommit);

const changedFiles = ref<DiffFile[]>([]);

watch([branch, () => gitRepo.loading.value], async ([newHash, isLoading]) => {
  if (!import.meta.client) return;
  if (isLoading || !newHash) return;

  if (viewType.value !== 'commit' && newHash !== currentBranch.value) {
    await switchBranch(newHash, true);
    return;
  }

  if (viewType.value === 'commit') {
    try {
      const logsResult = await gitRepo.getCommitLog(newHash, 2);
      if (logsResult.ok && logsResult.data.length > 0) {
        const logs = logsResult.data;

        currentCommit.value = logs[0]!;

        if (logs[1]) {
          const diffResult = await gitRepo.getCommitDiff(logs[1].hash, logs[0]!.hash);
          if (!diffResult.ok) {
             console.error('[diff.vue] getCommitDiff failed:', diffResult.reason);
             showError({
                statusCode: 500,
                message: 'Failed to load diff',
                data: { errorDescription: diffResult.reason, image: '/assets/error-tree.png' }
             });
             return;
          }
          currentDiff.value = diffResult.data;
          changedFiles.value = diffResult.data.files;
        } else {
          const filesResult = await gitRepo.getCommitFiles(logs[0]!.hash);
          if (filesResult.ok) {
             changedFiles.value = filesResult.data.map((f: string) => ({ path: f, type: 'add' as const } as unknown as DiffFile));
          }
        }
      }
    } catch (e) {
      console.error('[diff.vue] Failed to load sidebar diff tree:', e);
      showError({
         statusCode: 500,
         message: 'Failed to load commit',
         data: { errorDescription: e instanceof Error ? e.message : String(e), image: '/assets/error-tree.png' }
      });
    }
  }
}, { immediate: true });

const links = useDiffTreeLinks(changedFiles);

const searchGroups = computed<CommandPaletteGroup[]>(() => [{
  id: 'diff-files',
  label: 'Changed Files',
  items: changedFiles.value.map(file => ({
    id: file.path,
    label: file.path.split('/').pop() ?? file.path,
    suffix: file.path,
    icon: 'i-lucide-file-diff',
    to: `#diff-${file.path}`
  }))
}]);
</script>

<template>
  <UDashboardGroup 
    unit="rem" 
    :ui="{ base: 'fixed inset-0 top-10 flex overflow-hidden' }"
  >
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      :auto-close="false"
      collapsible
      resizable
      toggle-side="right"
      :toggle="{
        color: 'primary',
        variant: 'subtle',
        class: 'rounded-full'
      }"
      class="bg-elevated/25"
    >   
      <template #header>
        <USkeleton
          v-if="gitRepo.loading.value"
          class="h-6 w-16"
        />
        <template v-else>
          Files
        </template>
      </template>

      <template #default="{ collapsed }">
        <template v-if="gitRepo.loading.value">
          <div
            v-if="!collapsed"
            class="w-full flex items-center justify-between gap-2 px-1 mb-2 mt-1"
          >
            <USkeleton class="h-5 w-32" />
            <USkeleton class="h-4 w-4" />
          </div>
          <div class="px-2 mb-2">
            <USkeleton class="h-8 w-full" />
          </div>
          <div class="flex flex-col gap-1 mt-4 px-2">
            <USkeleton
              v-for="i in 12"
              :key="i"
              class="h-7 w-full"
            />
          </div>
        </template>
        <template v-else>
          <BranchSelector
            v-if="!collapsed"
            :current-ref="currentBranch || 'main'"
            :tags="tags"
            :branches="branches"
            class="!w-full"
            @change-ref="switchBranch"
          />
          <UDashboardSearchButton
            :collapsed="collapsed"
            :label="'Search files...'"
          />

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links"
            orientation="vertical"
            :tooltip="true"
            :popover="true"
          />
        </template>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch
      :groups="searchGroups"
      :color-mode="false"
    />

    <UDashboardPanel 
      :id="repoName"
      :ui="{
        body: 'flex flex-col gap-4 sm:gap-6 flex-1 overflow-y-auto p-0 sm:p-6'
      }"
    >
      <template #header>
        <UDashboardNavbar :title="repoName">
          <template #left>
            <UDashboardSidebarCollapse />
            <RepoSwitcher :repo-name="repoName" />
            <UDashboardNavbarToggle />
          </template>


          <template #right>
            <UButton
              to="/"
              icon="i-lucide-home"
              color="neutral"
              variant="ghost"
              size="sm"
            >
              <span class="hidden sm:inline">Back to Home</span>
            </UButton>
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
