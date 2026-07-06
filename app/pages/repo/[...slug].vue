<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
const route = useRoute();
import RepoFileViewer from '~/components/repo/RepoFileViewer.vue';
import RepoMainView from '~/components/repo/RepoMainView.vue';
import RepoDiffViewer from '~/components/repo/RepoDiffViewer.vue';

const slug = computed(() => {
  const params = route.params.slug;
  return Array.isArray(params) ? params : [params];
});

const repoName = computed(() => slug.value[0] ?? '');

const { data: projects } = await useAsyncData('projects', async () => {
  return await queryCollection('projects')
    .where('github', 'LIKE', `%/${repoName.value}`)
    .first();
});

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

const branch = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(slug.value[1] ?? '') ? (slug.value[2] ?? 'main') : 'main');
const path = computed(() => ['tree', 'blob', 'commits', 'commit'].includes(slug.value[1] ?? '') ? slug.value.slice(3).join('/') : undefined);

definePageMeta({
  layout: false
});

useHead({
  title: () => repoName.value ? `${repoName.value} — Repository` : 'Repository',
});

</script>

<template>
  <NuxtLayout :name="['file', 'tree'].includes(viewType) ? 'tree' : 'default'">
    <div>
      <ClientOnly>
        <RepoMainView
          v-if="viewType === 'main' && repoName && projects"
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
          :branch="branch"
          :file-path="path"
          :is-tree="viewType === 'tree'"
        />

        <template #fallback>
          <div class="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
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
        </template>
      </ClientOnly>
    </div>
  </NuxtLayout>
</template>
