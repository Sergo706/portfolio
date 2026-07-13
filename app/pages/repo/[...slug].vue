<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
const route = useRoute();
import RepoFileViewer from '~/components/repo/RepoFileViewer.vue';
import RepoMainView from '~/components/repo/RepoMainView.vue';
import RepoDiffViewer from '~/components/repo/RepoDiffViewer.vue';

const slug = computed(() => {
  const params = route.params.slug;
  
  if (!params) return [];

  if (typeof params === 'string') {
    return params.split(/[,/]/).filter(Boolean);
  }
  return Array.isArray(params) ? params : [params];
});
const repoName = computed(() => slug.value[0] ?? '');
console.log(`slug`, slug.value);

const { data: projects } = await useAsyncData(`project-repo-${repoName.value}`, async () => {
  return await queryCollection('projects')
    .where('github', 'LIKE', `%/${repoName.value}%`)
    .first();
});
console.log(`project from main page view`, projects.value);
if (!projects.value) {
  throw createError({
      statusCode: 404,
      message: 'Repository not found',
      data: {
        errorDescription: 'There is nothing to see here...',
        image: '/assets/error-tree.png'
      }
  });
}

const viewType = computed(() => {
  if (slug.value.length === 1) return 'main';
  if (slug.value[1] === 'tree') {
    if (slug.value.length === 3) return 'main';
    return 'tree';
  }
  if (slug.value[1] === 'commits') return 'commits';
  if (slug.value[1] === 'commit' && slug.value[2]) return 'diff';
  if (slug.value[1] === 'blob') return 'file';
  return 'main';
});

const branch = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(slug.value[1] ?? '') ? slug.value[2] : undefined);
const path = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(slug.value[1] ?? '') ? slug.value.slice(3).join('/') : undefined);

definePageMeta({
  layout: false
});
</script>

<template>
  <NuxtLayout :name="['file', 'tree'].includes(viewType) ? 'tree' : (viewType === 'diff' ? 'diff' : 'default')">
    <div
      v-if="projects"
      :class="['file', 'tree', 'diff'].includes(viewType) ? 'h-full flex flex-col w-full' : ''"
    >
      <FolioMeta
        :page="projects"
        :is-writing="false"
      />
      <ClientOnly>
        <RepoMainView
          v-if="viewType === 'main' && repoName"
          :project-content="projects"
          :repo-name="repoName"
          :branch="branch"
        />

        <RepoCommitHistory
          v-else-if="viewType === 'commits' && repoName"
          :repo-name="repoName"
          :branch="branch"
          :file-path="path"
        />
        
        <RepoDiffViewer
          v-else-if="viewType === 'diff' && repoName "
          :repo-name="repoName"
          :hash="slug[2] ?? ''"
        />

        <RepoFileViewer
          v-else-if="viewType === 'file' || viewType === 'tree'"
          :repo-name="repoName"
          :branch="branch ?? ''"
          :file-path="path"
          :is-tree="viewType === 'tree'"
          :owner="projects.owner"
        />

        <template #fallback>
          <div
            v-if="viewType === 'main'"
            class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
          >
            <div class="flex items-center gap-3">
              <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                size="sm"
                label="Back"
                disabled
              />
            </div>
            <RepoSkeletonsMainView />
          </div>

          <div
            v-else-if="viewType === 'commits'"
            class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
          >
            <div class="flex flex-col gap-2 border-b border-white/10 pb-6 mb-6">
              <USkeleton class="h-8 w-64" />
              <USkeleton class="h-4 w-96" />
            </div>
            <div class="flex flex-col sm:flex-row gap-4 mb-6">
              <USkeleton class="h-8 w-40" />
              <USkeleton class="h-8 w-40" />
              <USkeleton class="h-8 w-64" />
            </div>
            <RepoSkeletonsCommitHistory />
          </div>

          <RepoSkeletonsDiffViewer v-else-if="viewType === 'diff'" />
          
          <RepoSkeletonsFileViewer
            v-else-if="viewType === 'file' || viewType === 'tree'"
            :file-path="path"
          />
        </template>
      </ClientOnly>
    </div>
  </NuxtLayout>
</template>
