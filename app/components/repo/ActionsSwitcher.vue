<script lang="ts" setup>
import BranchSelector from './BranchSelector.vue';
import type { Results } from '@riavzon/utils';
import { useDownloadZip } from '~/composables/repo/useDownload';

const props = defineProps<{
    currentRef: string
    tags?: string[]
    branches: string[]
    downloadZip: (branch?: string) => Promise<Results<Uint8Array>>
    repoName: string
}>();
defineEmits<(e: 'changeRef', refName: string) => void>();

const currentRefs = ref(props.currentRef);

const { download: handleDownload, isDownloading } = useDownloadZip({
  downloadZip: props.downloadZip,
  repoName: props.repoName,
  ref: currentRefs
});

</script>

<template>
  <UCard
    :ui="{
      root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-2',
      body: 'p-0',
    }"
  >
    <div class="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2"> 
      <BranchSelector 
        :current-ref="currentRef"
        :tags="tags"
        :branches="branches"
        @change-ref="(val) => { currentRefs = val; $emit('changeRef', val) }"
      />

      <UButton
        size="lg"
        variant="ghost"
        :icon="'i-lucide-git-branch'"
        class="hover:bg-transparent cursor-default"
      >
        Branches {{ branches.length }}
      </UButton>
      <UButton
        v-if="tags"
        size="lg"
        variant="ghost"
        :icon="'i-lucide-tag'"
        class="hover:bg-transparent cursor-default"
      >
        Tags {{ tags.length }}
      </UButton>

      <UButton
        size="md"
        variant="ghost"
        loading-auto
        icon="i-lucide-file-archive"
        class="w-full md:w-auto md:ml-auto"
        :loading="isDownloading"
        @click="handleDownload"
      >
        Download ZIP
      </UButton>
    </div>
  </UCard>
</template>