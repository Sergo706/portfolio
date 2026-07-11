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

const { files, repoName, lastCommit, commitCount, isResolvingCommits, readme, license, loading, error, switchBranch, currentBranch, branches, tags, downloadZip } = useGitRepo(props.repoName, props.branch);
const timeAgo  = useTimeAgo(() => lastCommit.value?.date ?? new Date());
const avatarUrl = useGitAvatar(lastCommit);

watch(() => props.branch, async (newBranch) => {
  if (newBranch && newBranch !== currentBranch.value) {
    await switchBranch(newBranch, true);
  }
}, { immediate: true });

watch(error, (err) => {
  if (err) {
    showError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Error',
      data: err.data
    });
  }
}, { immediate: true });

const activeDocTab = ref('0');
const resolvedReadme = useMarkdownImageResolver(readme, repoName, currentBranch, props.projectContent.owner);

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
  <UPage class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 relative">
    <div class="absolute top-16 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 h-[480px] z-0 overflow-hidden pointer-events-none opacity-15 mix-blend-screen rounded-3xl">
      <NuxtImg 
        src="/assets/private-repo-cover.png" 
        class="w-full h-full object-cover"
        style="mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%); -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%);"
      />
    </div>

    <div class="flex items-center gap-3 relative z-10">
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
      <RepoSkeletonsMainView v-if="loading" />

      <template v-if="!loading && !error">
        <UPageHeader
          :title="props.projectContent.name"
          :description="props.projectContent.description"
          :headline="repoName"
          class="px-2 py-4 sm:px-10 lg:px-6 pt-6"
          :ui="{
            title: 'text-2xl sm:text-4xl font-bold',
            description: 'text-sm sm:text-lg',
            headline: 'text-xs sm:text-sm'
          }"
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
          :repo-name="repoName"
          :download-zip="downloadZip"
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
              :is-resolving-commits="isResolvingCommits"
            />
          </template>

          <FileTree
            :files="files"
            :repo-name="repoName"
            :current-branch="currentBranch"
            :is-resolving-commits="isResolvingCommits"
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
            root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden',
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="flex flex-col items-center justify-center relative group">
            <NuxtImg
              src="/assets/tree-with-eyes.png" 
              class="w-full h-auto object-cover opacity-60 mix-blend-luminosity group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-700" 
              alt="No README Cover"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
            <div class="absolute bottom-0 left-0 w-full p-8 text-center">
              <h3 class="text-xl sm:text-2xl font-bold text-white mb-2 font-mono drop-shadow-md">
                No README.md
              </h3>
              <p class="text-sm sm:text-base text-zinc-300 drop-shadow-md">
                Sorry, this repo doesn't have a README
              </p>
            </div>
          </div>
        </UCard>
      </template>
    </UPageBody>
  </UPage>
</template>

<style scoped>
.prose :deep(p:has(img[src*="badge" i])),
.prose :deep(p:has(img[src*="shield" i])) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.prose :deep(p:first-of-type img:not([src*="banner" i]):not([alt*="banner" i])),
.prose :deep(a img:not([src*="banner" i]):not([alt*="banner" i])),
.prose :deep(img[src*="badge" i]),
.prose :deep(img[src*="shield" i]) {
  display: inline-block;
  height: 20px;
  width: auto;
  margin: 0;
}

.prose :deep(img[src*="banner" i]),
.prose :deep(img[alt*="banner" i]) {
  width: 100% !important;
  height: auto !important;
  max-width: 100% !important;
  display: block !important;
  margin: 1.5rem 0 !important;
}

.prose :deep(img:not([src*="banner" i]):not([alt*="banner" i])) {
  max-width: 100%;
}
</style>
