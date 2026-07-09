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

const { data: projects } = await useAsyncData(`project-${repoName.value}`, async () => {
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
  <NuxtLayout :name="['file', 'tree'].includes(viewType) ? 'tree' : (viewType === 'diff' ? 'diff' : 'default')">
    <div :class="['file', 'tree', 'diff'].includes(viewType) ? 'h-full flex flex-col w-full' : ''">
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
          <div
            v-if="viewType === 'diff'"
            class="flex flex-col gap-6 w-full max-w-full pb-10"
          >
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
          </div>
          <div
            v-else
            class="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6 lg:px-8"
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
        </template>
      </ClientOnly>
    </div>
  </NuxtLayout>
</template>
