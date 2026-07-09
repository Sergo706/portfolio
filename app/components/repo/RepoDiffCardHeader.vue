<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';
import type { DiffFile } from '~~/shared/types/Git';

const props = defineProps<{
  file: DiffFile;
  commitHash: string;
  parentHash: string;
  repoName: string;
}>();

const isCollapsed = defineModel<boolean>('isCollapsed', { required: true });
const isExpanded = defineModel<boolean>('isExpanded', { default: false });

const { copy, copied } = useClipboard();

const stats = computed(() => {
  return {
    add: props.file.additions ?? 0,
    del: props.file.deletions ?? 0
  };
});

const options = computed(() => {
  const items = [];

  if (props.file.type !== 'remove') {
    items.push({
      label: 'View File',
      icon: 'i-lucide-file-code',
      to: `/repo/${props.repoName}/blob/${props.commitHash}/${props.file.path}`,
      target: '_blank'
    });
  }
  if (props.parentHash && props.file.type !== 'add') {
    items.push({
      label: 'View Previous',
      icon: 'i-lucide-history',
      to: `/repo/${props.repoName}/blob/${props.parentHash}/${props.file.path}`,
      target: '_blank'
    });
  }

  items.push({
    label: 'View on GitHub',
    icon: 'i-simple-icons-github',
    to: `https://github.com/Sergo706/${props.repoName}/commit/${props.commitHash}`,
    target: '_blank'
  });

  items.push({
    label: copied.value ? 'Copied!' : 'Copy Path',
    icon: copied.value ? 'i-lucide-check' : 'i-lucide-copy',
    class: 'sm:hidden',
    onSelect: () => copy(props.file.path)
  });

  return items.length > 0 ? [items] : [];
});
</script>

<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2 text-sm min-w-0">
      <UButton
        :icon="isCollapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
        color="neutral"
        variant="ghost"
        size="xs"
        class="mr-1 shrink-0"
        @click="() => { isCollapsed = !isCollapsed }"
      />
      <span class="font-mono text-white/80 truncate">{{ file.path }}</span>
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        color="neutral"
        variant="ghost"
        size="xs"
        class="hidden sm:inline-flex text-white/40 hover:text-white shrink-0"
        @click="copy(file.path)"
      />
      <UTooltip :text="isExpanded ? 'Collapse non-diff lines' : 'Expand non-diff lines'">
        <UButton
          v-if="!file.isBinary && file.type !== 'add' && file.type !== 'remove'"
          :icon="isExpanded ? 'i-lucide-fold-vertical' : 'i-lucide-unfold-vertical'"
          color="neutral"
          variant="ghost"
          size="xs"
          class="hidden sm:inline-flex text-white/40 hover:text-white shrink-0"
          @click="() => { isExpanded = !isExpanded }"
        />
      </UTooltip>
      <UBadge
        v-if="file.type === 'add' || file.type === 'remove'"
        :color="file.type === 'add' ? 'success' : 'error'"
        variant="subtle"
        size="xs"
        class="mr-2 uppercase text-[10px] tracking-wider"
      >
        {{ file.type === 'add' ? 'New' : 'Deleted' }}
      </UBadge>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <UBadge
        v-if="stats.add > 0"
        color="success"
        variant="subtle"
        size="sm"
        class="font-mono"
      >
        +{{ stats.add }}
      </UBadge>
      <UBadge
        v-if="stats.del > 0"
        color="error"
        variant="subtle"
        size="sm"
        class="font-mono"
      >
        -{{ stats.del }}
      </UBadge>
      
      <UDropdownMenu
        v-if="options.length > 0"
        :items="options"
      >
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-more-horizontal"
          size="xs"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
