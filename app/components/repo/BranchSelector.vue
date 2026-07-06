<script setup lang="ts">
import { isCommitHash, formatItem } from '~/utils/useString';
const props = defineProps<{
    currentRef: string
    tags?: string[]
    branches?: string[]
}>();

const currentRefs = ref(props.currentRef);

watch(() => props.currentRef, (newRef) => {
  if (newRef !== currentRefs.value) {
    currentRefs.value = newRef;
  }
});

const activeTabIndex = ref('0');
const searchTerm = ref('');
const defaultBranch = computed(() => props.branches?.includes('main') ? 'main' : props.branches?.[0]);

const orderedBranches = computed(() => {
  if (!props.branches) return [];
  const active = currentRefs.value;
  if (!props.branches.includes(active)) return props.branches;

  const def = defaultBranch.value;
  const rest = props.branches.filter(b => b !== active && b !== def);

  const result: string[] = [active];
  if (def && def !== active) {
    result.push(def);
  }
  result.push(...rest);

  return result;
});

const activeList = computed(() => {
  return activeTabIndex.value === '0'
    ? orderedBranches.value
    : (props.tags ?? []);
});

const filteredItems = computed(() => {
  let items = activeList.value;
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase();
    items = items.filter(item => item.toLowerCase().includes(term));
  }
  
  const active = currentRefs.value;
  if (active && !items.includes(active)) {
    items = [active, ...items];
  }
  
  return items.map(item => ({
    id: item,
    label: formatItem(item)
  }));
});

watch(activeTabIndex, () => {
  searchTerm.value = '';
});

defineEmits<(e: 'changeRef', refName: string) => void>();
</script>

<template>
  <USelectMenu
    v-model="currentRefs"
    value-key="id"
    label-key="label"
    size="md"
    :icon="'i-lucide-git-branch'"
    :items="filteredItems"
    :search-input="false"
    ignore-filter
    class="w-full md:w-54"
    @change="$emit('changeRef', currentRefs)"
  >
    <template #content-top>
      <div class="flex flex-col gap-2 p-2 pb-0">
        <UInput
          v-model="searchTerm"
          icon="i-lucide-search"
          size="sm"
          :placeholder="activeTabIndex === '0' ? 'Search branches...' : 'Search tags...'"
          @keydown.stop
        />

        <UTabs
          v-model="activeTabIndex"
          :items="[{ label: 'Branches' }, { label: 'Tags' }]"
          size="xs"
        />
      </div>
    </template>

    <template #item="{ item }">
      <div class="flex items-center gap-2 w-full">
        <UIcon
          v-if="item.id === currentRefs"
          name="i-lucide-check"
          class="size-4 shrink-0 text-white/70"
        />
        <div
          v-else
          class="size-4 shrink-0"
        />
        <span class="truncate">
          {{ item.label }}
          <span
            v-if="item.id === defaultBranch"
            class="text-white/40 text-xs ml-1"
          >(default)</span>
          <span
            v-if="isCommitHash(item.id)"
            class="text-white/40 text-xs ml-1"
          >(commit)</span>
        </span>
      </div>
    </template>
  </USelectMenu>
</template>