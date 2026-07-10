<script setup lang="ts">
import { useGitRepo } from '~/composables/repo/useGitRepo';
import type { DiffFile } from '~~/shared/types/Git';
import { useDiffRows } from '~/composables/repo/useDiffRows';
import { useDiffRowsHighlighted } from '~/composables/repo/useDiffRowsHighlighted';
import RepoUnsupportedFile from './RepoUnsupportedFile.vue';
import { useSyntaxHighlighting } from '~/composables/repo/useSyntaxHighlighting';
import { useFullFileDiff } from '~/composables/repo/useFullFileDiff';
import { useDownloadFile, useIsImage, useImageBlobUrl } from '~/composables/repo/useDownload';
import { useFileContent } from '~/composables/repo/useFileContent';

const props = defineProps<{
  file: DiffFile;
  commitHash: string;
  parentHash: string;
  repoName: string;
  viewMode: 'unified' | 'split';
  isWrapped?: boolean;
}>();

const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');
if (!gitRepo) {
  throw createError({
    status: 404,
    statusText: 'Not Found',
    message: 'There is nothing to see here'
  });
}

const isCollapsed = ref(false);
const isExpanded = ref(false);

const { fullFileHunks, isLoadingFull } = useFullFileDiff(
  isExpanded,
  props.file,
  props.parentHash,
  props.commitHash,
  gitRepo
);

const activeHunks = computed(() => {
  if (isExpanded.value && fullFileHunks.value) return fullFileHunks.value;
  return props.file.hunks ?? [];
});

const { splitRows, unifiedRows } = useDiffRows(activeHunks);

const { oldLinesHtml, newLinesHtml } = useSyntaxHighlighting(props.file, props.parentHash, props.commitHash, gitRepo);

const { syntaxSplitRows, syntaxUnifiedRows } = useDiffRowsHighlighted(
  computed(() => splitRows.value),
  computed(() => unifiedRows.value),
  oldLinesHtml,
  newLinesHtml
);

const fileBlob = ref<Uint8Array | null>(null);
const executeDownload = useDownloadFile(computed(() => props.file.path), fileBlob, ref(null));
const downloadLargeFile = async () => {
  if (!fileBlob.value) {
    const res = await gitRepo.getFileBlob(props.file.path, props.commitHash);
    fileBlob.value = res.ok ? res.data : null;
  }
  executeDownload();
};

const isImage = useIsImage(computed(() => props.file.path));
const oldFileContent = useFileContent(
  computed(() => isImage.value && props.file.type !== 'add' ? props.file.path : undefined),
  computed(() => props.parentHash)
);
const newFileContent = useFileContent(
  computed(() => isImage.value && props.file.type !== 'remove' ? props.file.path : undefined),
  computed(() => props.commitHash)
);

const oldImageUrl = useImageBlobUrl(computed(() => props.file.path), oldFileContent.fileBlob);
const newImageUrl = useImageBlobUrl(computed(() => props.file.path), newFileContent.fileBlob);

</script>

<template>
  <UCard
    :ui="{ 
      root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden', 
      body: 'p-0 sm:p-0',
      header: 'p-2 sm:px-4 bg-zinc-900/80 border-b border-white/10' 
    }"
  >
    <template #header>
      <RepoDiffCardHeader 
        v-model:is-collapsed="isCollapsed"
        v-model:is-expanded="isExpanded"
        :file="file"
        :commit-hash="commitHash"
        :parent-hash="parentHash"
        :repo-name="repoName"
      />
    </template>

    <div
      v-if="!isCollapsed"
      class="text-xs md:text-sm w-full relative group diff-viewer-scroll"
      :class="isWrapped ? 'overflow-hidden' : 'overflow-x-auto'"
    >
      <div
        v-if="isLoadingFull"
        class="p-8 flex items-center justify-center w-full"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-6 h-6 animate-spin text-white/50"
        />
      </div>

      <div
        v-else-if="isImage"
        class="p-4 sm:p-8 flex flex-col lg:flex-row items-center justify-center bg-zinc-900/50 gap-4 sm:gap-8 overflow-x-auto min-h-[300px]"
      >
        <div
          v-if="oldImageUrl"
          class="flex flex-col items-center gap-4 relative"
        >
          <UBadge
            color="error"
            variant="subtle"
            size="sm"
            class="font-mono shadow-sm border border-red-500/20  absolute top-0 right-0"
          >
            Old
          </UBadge>
          <NuxtImg
            :src="oldImageUrl"
            class="max-h-[500px] max-w-full rounded border border-white/10 shadow-lg object-contain bg-zinc-950 p-2"
          />
        </div>
        <div
          v-if="newImageUrl"
          class="flex flex-col items-center gap-4 relative"
        >
          <UBadge
            color="success"
            variant="subtle"
            size="sm"
            class="font-mono shadow-sm border border-green-500/20  absolute top-0 right-0"
          >
            New
          </UBadge>
          <NuxtImg
            :src="newImageUrl"
            class="max-h-[500px] max-w-full rounded border border-white/10 shadow-lg object-contain bg-zinc-950 p-2"
          />
        </div>
      </div>

      <UCard
        v-else-if="file.isBinary"
        :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm' }"
      >
        <UEmpty
          icon="i-lucide-file-question"
          title="Binary file"
          description="Binary files differ."
          class="text-white/50"
        />
      </UCard>

      <UCard
        v-else-if="file.isTooLarge"
        :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm' }"
      >
        <RepoUnsupportedFile
          :repo-name="repoName"
          :file-path="file.path"
          :branch="commitHash"
          reason="This file's diff is too large to render locally."
          :custom-github-url="`https://github.com/Sergo706/${repoName}/commit/${commitHash}`"
          @download="downloadLargeFile"
        />
      </UCard>
      
      <RepoDiffSplitView
        v-else-if="viewMode === 'split'"
        :split-rows="syntaxSplitRows"
        :is-wrapped="isWrapped"
      />

      <RepoDiffUnifiedView
        v-else
        :unified-rows="syntaxUnifiedRows"
        :is-wrapped="isWrapped"
      />
    </div>
  </UCard>
</template>

<style scoped>
.diff-table td {
  vertical-align: top;
}

.diff-table tbody tr:hover td {
  background-color: rgba(255, 255, 255, 0.02);
}

.diff-viewer-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.diff-viewer-scroll::-webkit-scrollbar {
  height: 6px; 
  width: 6px;
}

.diff-viewer-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.diff-viewer-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.diff-viewer-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.4);
}
</style>