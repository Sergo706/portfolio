<script lang="ts" setup>
import type { FsClient } from 'isomorphic-git';
import { useDownloadZip } from '~/composables/repo/useDownload';
import BranchSelector from './BranchSelector.vue';

const props = defineProps<{
    currentRef: string
    tags?: string[]
    branches: string[]
    fs: FsClient,
    dir: string,
    repoName: string
}>();
defineEmits<(e: 'changeRef', refName: string) => void>();

const currentRefs = ref(props.currentRef);
const download = useDownloadZip({fs: props.fs, dir: props.dir, ref: currentRefs, repoName: props.repoName });

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
        @click="async () => await download()"
      >
        Download ZIP
      </UButton>
    </div>
  </UCard>
</template>