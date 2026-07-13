<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useSidebar } from '~/composables/repo/useSideBar';
import { useGitRepo } from '~/composables/repo/useGitRepo';
import type { CommandPaletteGroup } from '@nuxt/ui';
import BranchSelector from '~/components/repo/BranchSelector.vue';

const { open } = useSidebar();
const route = useRoute();
const slug = computed(() => {
  const params = route.params.slug;
  return Array.isArray(params) ? params : [params];
});

const repoName = computed(() => slug.value[0] ?? '');
const viewType = computed(() => slug.value[1] ?? 'main');

const gitRepo = useGitRepo(repoName.value);
const { allFiles, switchBranch, currentBranch, branches, tags } = gitRepo;
provide<ReturnType<typeof useGitRepo>>('gitRepo', gitRepo);

const branch = computed(() => {
  const urlBranch = ['tree', 'blob', 'commits', 'commit'].includes(viewType.value) ? slug.value[2] : undefined;

  if (urlBranch) return urlBranch;
  
  return branches.value.includes('main') ? 'main' : (branches.value.includes('master') ? 'master' : 'main');
});

watch(branch, async (newBranch) => {
  if (newBranch && newBranch !== currentBranch.value) {
    await switchBranch(newBranch, true);
  }
}, { immediate: true });

const links = useTreeLinks(allFiles, repoName, branch, route);

const searchGroups = computed<CommandPaletteGroup[]>(() => [{
  id: 'files',
  label: 'Files',
  items: allFiles.value.map(file => ({
    label: file.split('/').pop() ?? file,
    suffix: file,
    icon: 'i-lucide-file',
    to: `/repo/${repoName.value}/blob/${branch.value}/${file}`
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
            :key="route.path"
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
    <UDashboardPanel :id="repoName">
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