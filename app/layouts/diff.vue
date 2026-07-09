<!-- eslint-disable vue/multi-word-component-names -->
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
const branch = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(viewType.value) ? (slug.value[2] ?? 'main') : 'main');

const { open } = useSidebar();
const gitRepo = useGitRepo(repoName.value);
const { switchBranch, currentBranch, branches, tags } = gitRepo;

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
let gitCache = {};
watch([branch, () => gitRepo.loading.value], async ([newHash, isLoading]) => {
  if (isLoading || !newHash) return;

  if (viewType.value !== 'commit' && newHash !== currentBranch.value) {
    await switchBranch(newHash, true);
    return;
  }

  if (viewType.value === 'commit') {
    try {
      const logs = await gitRepo.git.log({ fs: gitRepo.fs, dir: gitRepo.dir, ref: newHash, depth: 2, cache: gitCache });
      if (logs[0]) {

        currentCommit.value = {
          hash: logs[0].oid,
          message: logs[0].commit.message.trim(),
          author: logs[0].commit.author.name,
          email: logs[0].commit.author.email,
          date: new Date(logs[0].commit.author.timestamp * 1000),
          parentHash: logs[0].commit.parent[0]
        };

        if (logs[1]) {
          const diffResult = await gitRepo.getCommitDiff(logs[1].oid, logs[0].oid);
          currentDiff.value = diffResult;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (diffResult && 'files' in diffResult) {
            changedFiles.value = diffResult.files;
          }
        } else {
          const fileList = await gitRepo.git.listFiles({ fs: gitRepo.fs, dir: gitRepo.dir, ref: logs[0].oid });
          changedFiles.value = fileList.map((f: string) => ({ path: f, type: 'add' as const }));
        }
      }
    } catch (e) {
      console.warn('Failed to load sidebar diff tree:', e);
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
        Files
      </template>

      <template #default="{ collapsed }">
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
