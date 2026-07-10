<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { useGitAvatar } from '~/composables/repo/useGitAvatar';
import { useGitRepo } from '~/composables/repo/useGitRepo';
import ActionsSwitcher from './ActionsSwitcher.vue';
import type { ProjectsCollectionItem } from '@nuxt/content';
import AuthorLastCommit from './AuthorLastCommit.vue';
import FileTree from './FileTree.vue';
import { useMarkdownImageResolver } from '~/composables/repo/useMarkdownImageResolver.js';

const props = defineProps<{
  repoName: string;
  projectContent: ProjectsCollectionItem;
  branch?: string;
}>();

const { files, fs, dir, repoName, lastCommit, commitCount, readme, license, loading, error, switchBranch, currentBranch, branches, tags } = useGitRepo(props.repoName);
const timeAgo  = useTimeAgo(() => lastCommit.value?.date ?? new Date());
const avatarUrl = useGitAvatar(lastCommit);

watch(() => props.branch, async (newBranch) => {
  if (newBranch && newBranch !== currentBranch.value) {
    await switchBranch(newBranch, true);
  }
}, { immediate: true });

const activeDocTab = ref('0');
const resolvedReadme = useMarkdownImageResolver(readme, repoName, currentBranch);

const docTabs = computed(() => {
  const tabs = [];
  if (resolvedReadme.value) {
    tabs.push({ label: 'README.md', icon: 'i-lucide-book-open' });
  }
  if (license.value) {
    tabs.push({ label: 'LICENSE', icon: 'i-lucide-scale' });
  }
  return tabs;
});

</script>

<template>
  <UPage class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm"
        label="Back"
        to="/works"
        aria-label="Back to projects"
      />
    </div>
    <UPageBody>
      <UAlert
        v-if="error"
        color="error"
        icon="i-lucide-alert-circle"
        title="Failed to load repository"
        :description="error ?? 'Server Error try again later'"
      />

      <div
        v-if="loading"
        class="space-y-4"
      >
        <USkeleton class="h-10 w-64" />
        <USkeleton class="h-6 w-full" />
        <div class="space-y-2">
          <USkeleton
            v-for="i in 8"
            :key="i"
            class="h-8 w-full"
          />
        </div>
        <USkeleton class="h-48 w-full" />
      </div>

      <template v-if="!loading && !error">
        <UPageHeader
          :title="props.projectContent.name"
          :description="props.projectContent.description"
          :headline="repoName"
        > 
          <template #links>
            <UButton
              v-if="projectContent.npm"
              size="lg"
              variant="ghost"
              color="primary"
              class="transition-all duration-300 text-[#cb3837] sm:text-white/70 hover:text-[#cb3837]"
              :to="projectContent.npm"
              :external="true"
              :icon="'custom:npm'"
            />
            <UButton
              size="lg"
              variant="ghost"
              color="primary"
              :to="projectContent.link"
              :external="true"
              :icon="'i-lucide-globe'"
              class="transition-all duration-300 text-white sm:text-white/70 hover:text-white"
            />
            <UButton
              size="lg"
              variant="ghost"
              color="primary"
              :to="projectContent.github"
              :external="true"
              :icon="'custom:github'"
              class="transition-all duration-300 text-white sm:text-white/70 hover:text-white"
            />
          </template>
        </UPageHeader>
        <ActionsSwitcher
          :current-ref="currentBranch"
          :branches="branches"
          :tags="tags"
          :fs="fs"
          :dir="dir"
          :repo-name="repoName"
          @change-ref="switchBranch"
        />
      
        <UCard
          :ui="{
            root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm',
            body: 'p-0',
          }"
        >
          <template #header>
            <AuthorLastCommit 
              :last-commit="lastCommit"
              :avatar-url="avatarUrl"
              :repo-name="repoName"
              :time-ago="timeAgo"
              :show-commit-count="{ show: true, count: commitCount, currentBranch }"
            />
          </template>

          <FileTree
            :files="files"
            :repo-name="repoName"
            :current-branch="currentBranch"
          />
        </UCard>

        
        <UCard
          v-if="resolvedReadme || license"
          :ui="{
            root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm',
            body: 'p-0',
          }"
        >
          <template #header>
            <UTabs
              v-model="activeDocTab"
              :items="docTabs"
              variant="link"
              size="sm"
              class="w-fit"
            />
          </template>

          <div class="prose prose-invert prose-sm max-w-none p-4">
            <MDC
              v-if="activeDocTab === '0' && resolvedReadme"
              :value="resolvedReadme"
            />
            <pre
              v-else-if="activeDocTab === '1' && license"
              class="whitespace-pre-wrap break-words font-mono text-sm text-white/70 not-prose"
            >{{ license }}</pre>
          </div>
        </UCard>

        <UCard
          v-else
          :ui="{
            root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm',
          }"
        >
          <UEmpty
            icon="i-lucide-file-question"
            title="No README"
            description="This repository does not contain a README file."
          />
        </UCard>
      </template>
    </UPageBody>
  </UPage>
</template>
