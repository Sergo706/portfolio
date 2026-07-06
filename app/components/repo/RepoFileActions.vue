<script setup lang="ts">
import { computed } from 'vue';
import { useClipboard } from '@vueuse/core';

const props = defineProps<{
  fileContent: string | null;
  githubUrl: string;
  downloadFile: () => void;
}>();

const { copy, copied } = useClipboard();

const mobileActionItems = computed(() => [
  {
    label: 'Download',
    icon: 'i-lucide-download',
    onSelect: () => {
      props.downloadFile();
      toast.success("Downloading file...");
    }
  },
  {
    label: copied.value ? 'Copied!' : 'Copy contents',
    icon: copied.value ? 'i-lucide-check' : 'i-lucide-copy',
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    color: (copied.value ? 'success' : 'neutral') as 'success' | 'neutral',
    onSelect: () => {
      if (props.fileContent) {
        void copy(props.fileContent);
        toast.success("Copied to clipboard");
      }
    }
  },
  {
    label: 'View on GitHub',
    icon: 'i-simple-icons-github',
    to: props.githubUrl,
    target: '_blank'
  }
]);
</script>

<template>
  <div class="flex items-center gap-2 shrink-0">
    <div class="hidden sm:flex items-center bg-white/5 rounded-lg overflow-hidden border border-white/10">
      <UTooltip text="Download">
        <UButton
          icon="i-lucide-download"
          variant="ghost"
          color="neutral"
          class="rounded-none border-r border-white/10 hover:bg-white/10"
          @click="downloadFile"
        />
      </UTooltip>
      <UTooltip :text="copied ? 'Copied!' : 'Copy contents'">
        <UButton
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          :color="copied ? 'success' : 'neutral'"
          variant="ghost"
          class="rounded-none border-r border-white/10 hover:bg-white/10"
          @click="fileContent ? copy(fileContent) : undefined"
        />
      </UTooltip>
      <UTooltip text="View on GitHub">
        <UButton
          icon="i-simple-icons-github"
          variant="ghost"
          color="neutral"
          class="rounded-none hover:bg-white/10"
          :to="githubUrl"
          target="_blank"
        />
      </UTooltip>
    </div>

    <div class="sm:hidden flex items-center">
      <UDropdownMenu :items="mobileActionItems">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          variant="ghost"
          color="neutral"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
