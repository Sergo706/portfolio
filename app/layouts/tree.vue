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
const branch = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(viewType.value) ? (slug.value[2] ?? 'main') : 'main');

const gitRepo = useGitRepo(repoName.value);
const { allFiles, switchBranch, currentBranch, branches, tags } = gitRepo;
provide<ReturnType<typeof useGitRepo>>('gitRepo', gitRepo);

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
          :key="route.path"
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