<script setup lang="ts">
import type { ProjectsCollectionItem } from '@nuxt/content';

const props = defineProps<{
  repoName: string
}>();

const currentRepo = ref(props.repoName);
const searchTerm = ref('');
const router = useRouter();

const { data: projects } = await useAsyncData('repo-switcher-projects', () => queryCollection('projects').all());

const repos = computed<string[]>(() => {
  if (!projects.value) return [];
  
  return projects.value
    .filter((p: ProjectsCollectionItem) => p.github)
    .map((p: ProjectsCollectionItem) => {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const parts = (p.github || '').split('/');
      return parts.pop() ?? '';
    });
});

const filteredItems = computed(() => {
  if (!searchTerm.value) return repos.value;
  const term = searchTerm.value.toLowerCase();
  return repos.value.filter(item => item.toLowerCase().includes(term));
});

async function onChange(newRepo: string) {
  if (newRepo && newRepo !== props.repoName) {
    await router.push(`/repo/${newRepo}`);
  }
}

watch(() => props.repoName, (newVal) => {
  currentRepo.value = newVal;
});
</script>

<template>
  <USelectMenu
    v-model="currentRepo"
    size="md"
    icon="i-lucide-book-marked"
    :items="filteredItems"
    :search-input="false"
    ignore-filter
    class="w-54"
    @update:model-value="onChange"
  >
    <template #content-top>
      <div class="flex flex-col gap-2 p-2 pb-0">
        <span class="px-1 text-xs font-medium text-white/60 uppercase tracking-wider">
          Change Repositories
        </span>
        <UInput
          v-model="searchTerm"
          icon="i-lucide-search"
          size="sm"
          placeholder="Search repositories..."
          @keydown.stop
        />
      </div>
    </template>

    <template #item="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon
          v-if="item === currentRepo"
          name="i-lucide-check"
          class="size-4 shrink-0 text-white/70"
        />
        <div
          v-else
          class="size-4 shrink-0"
        />
        <span class="truncate">
          {{ item }}
        </span>
      </div>
    </template>
  </USelectMenu>
</template>
