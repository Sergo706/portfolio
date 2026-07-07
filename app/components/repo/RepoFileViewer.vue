<script setup lang="ts">
import { getIcon } from '~/utils/useTreeLinks';
import type { GitCommit, GitFile } from '~~/shared/types/Git';
import { useTimeAgo } from '@vueuse/core';
import AuthorLastCommit from '~/components/repo/AuthorLastCommit.vue';
import type { useGitRepo } from '~/composables/repo/useGitRepo';
import FileTree from './FileTree.vue';
import BlobViewer from './BlobViewer.vue';
import RepoFileActions from './RepoFileActions.vue';
import RepoFileStats from './RepoFileStats.vue';
import { useFileStats } from '~/utils/useFileStats.js';
import { useDownloadFile, useIsImage } from '~/composables/repo/useDownload';

const props = defineProps<{
  repoName: string;
  branch: string;
  filePath?: string;
  isTree?: boolean;
}>();

const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');
if (!gitRepo) throw new Error('gitRepo not provided');
const { getPathCommit, getFilesInFolder, getFileBlob, currentBranch, loading } = gitRepo;
const isImage = useIsImage(computed(() => props.filePath));

const pathLastCommit = ref<GitCommit | null>(null);
const folderFiles = ref<GitFile[]>([]);
const fileContent = ref<string | null>(null);
const fileBlob = ref<Uint8Array | null>(null);
const downloadFile = useDownloadFile(computed(() => props.filePath), fileBlob, fileContent);

const imageBlobUrl = ref<string | null>(null);
const isBinaryFile = ref(false);
const fetching = ref(true);
const fileStats = useFileStats(fileContent);
const githubUrl = computed(() => {
  return `https://github.com/Sergo706/${props.repoName}/blob/${props.branch}/${String(props.filePath)}`;
});




watchEffect(() => {
  if (!props.filePath || !props.branch) return;
  if (loading.value) return;

  const filePath = props.filePath;
  const branch = props.branch;
  const isTree = props.isTree;

  fetching.value = true;

  const fetchData = async () => {
    try {
      pathLastCommit.value = await getPathCommit(filePath, branch);

      if (imageBlobUrl.value) {
        URL.revokeObjectURL(imageBlobUrl.value);
        imageBlobUrl.value = null;
      }

      if (isTree) {
        folderFiles.value = await getFilesInFolder(filePath, branch);
        fileContent.value = null;
        fileBlob.value = null;
        isBinaryFile.value = false;
      } else if (isImage.value) {
        fileContent.value = null;
        isBinaryFile.value = false;
        fileBlob.value = await getFileBlob(filePath, branch);
        if (fileBlob.value) {
           const ext = filePath.split('.').pop()?.toLowerCase();
           const mimeTypes: Record<string, string> = {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              gif: 'image/gif',
              webp: 'image/webp',
              bmp: 'image/bmp',
              ico: 'image/x-icon',
           };
           const mime = mimeTypes[ext ?? ''] ?? 'application/octet-stream';
           const blob = new Blob([fileBlob.value as BlobPart], { type: mime });
           imageBlobUrl.value = URL.createObjectURL(blob);
        }
      } else {
        const blob = await getFileBlob(filePath, branch);
        fileBlob.value = blob;
        if (blob) {
          const isBinary = blob.slice(0, 8000).some(byte => byte === 0);
          if (isBinary) {
            isBinaryFile.value = true;
            fileContent.value = null;
          } else {
            const text = new TextDecoder().decode(blob);
            if (text.startsWith('version https://git-lfs.github.com/spec/v1')) {
              isBinaryFile.value = true;
              fileContent.value = null;
            } else {
              isBinaryFile.value = false;
              fileContent.value = text;
            }
          }
        } else {
          isBinaryFile.value = false;
          fileContent.value = null;
        }
      }
    } finally {
      fetching.value = false;
    }
  };

  void fetchData();
});

const isLoading = computed(() => loading.value || fetching.value);
const isCodeWrapped = ref(false);
const isMd = computed(() => props.filePath?.endsWith('.md') ?? false);
const showRawMd = ref(false);

</script>

<template>
  <div class="flex flex-col gap-4">
    <RepoBreadcrumbs
      :repo-name="repoName"
      :branch="branch"
      :file-path="filePath"
      :is-tree="isTree"
    />

    <div
      v-if="isLoading"
      class="flex items-center gap-3 border border-zinc-800 rounded-lg p-4"
    >
      <USkeleton class="size-8 rounded-full shrink-0" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-3.5 w-48" />
        <USkeleton class="h-3 w-32" />
      </div>
      <USkeleton class="h-3 w-20 shrink-0" />
    </div>

    <AuthorLastCommit
      v-else-if="pathLastCommit"
      :last-commit="pathLastCommit"
      :avatar-url="`https://github.com/${pathLastCommit.author}.png`"
      :repo-name="repoName"
      class="text-white bg-transparent border border-zinc-800 shadow-sm p-4 rounded-lg"
      :time-ago="useTimeAgo(pathLastCommit.date).value"
      :show-commit-count="{ show: true, count: null, currentBranch: branch || 'main', historyPath: filePath }"
    />

    <div
      v-if="!isTree && fileStats"
      class="flex sm:hidden items-center justify-center gap-2 py-2 border border-zinc-800 bg-zinc-900/50 rounded-lg"
    >
      <RepoFileStats :file-stats="fileStats" />
    </div>

    <UCard
      v-if="isLoading"
      :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm shadow-xl' }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <USkeleton class="size-4 rounded" />
          <USkeleton class="h-4 w-28" />
        </div>
      </template>
      <div class="divide-y divide-white/5">
        <div
          v-for="i in 6"
          :key="i"
          class="flex items-center justify-between gap-4 px-4 py-2.5"
        >
          <div class="flex items-center gap-3">
            <USkeleton class="size-4 rounded" />
            <USkeleton
              class="h-3.5"
              :style="{ width: `${60 + (i * 20) % 80}px` }"
            />
          </div>
          <div class="flex items-center gap-4">
            <USkeleton
              class="h-3"
              :style="{ width: `${100 + (i * 30) % 120}px` }"
            />
            <USkeleton class="h-3 w-16" />
          </div>
        </div>
      </div>
    </UCard>

    <UCard
      v-else
      :ui="{ root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm shadow-xl', body: !isTree ? 'p-0 sm:p-0' : '' }"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 text-sm text-white/70">
            <div class="flex items-center gap-2">
              <UIcon
                :name="getIcon(filePath || '', !isTree)"
                class="size-4 text-blue-400"
              />
              <span class="font-mono font-medium">{{ filePath ? filePath.split('/').pop() : '' }}</span>
            </div>
            
            <div class="hidden sm:flex items-center gap-3">
              <span
                v-if="!isTree && fileStats"
                class="text-white/30"
              >|
              </span>

              <RepoFileStats
                v-if="!isTree"
                :file-stats="fileStats"
              />
            </div>
          </div>

          <RepoFileActions
            v-if="!isTree"
            v-model="isCodeWrapped"
            v-model:show-raw-md="showRawMd"
            :file-content="fileContent"
            :is-md="isMd"
            :github-url="githubUrl"
            :download-file="downloadFile"
            @wrapped="isCodeWrapped = !isCodeWrapped"
          />
        </div>
      </template>
      <FileTree
        v-if="isTree"
        :files="folderFiles"
        :repo-name="repoName"
        :current-branch="currentBranch"
      />
      <div
        v-else-if="isImage && imageBlobUrl"
        class="p-8 flex items-center justify-center bg-zinc-900/50"
      >
        <NuxtImg
          :src="imageBlobUrl"
          :alt="filePath"
          class="max-w-full rounded border border-white/10 shadow-lg"
        />
      </div>
      <div
        v-else-if="isBinaryFile || (fileStats?.size ?? 0) > 5e+6"
        class="p-16 flex flex-col items-center justify-center text-center gap-4 text-white/60"
      >
        <UIcon
          name="i-lucide-file-archive"
          class="size-16 opacity-50"
        />
        <p>This file is binary or to large and cannot be rendered this time.</p>

        <UButton
          variant="soft"
          color="neutral"
          icon="i-lucide-download"
          @click="downloadFile"
        >
          Download File
        </UButton>
      </div>
      <BlobViewer
        v-else-if="fileContent !== null"
        v-model="isCodeWrapped"
        v-model:show-raw-md="showRawMd"
        :content="fileContent"
        :file-path="filePath || ''"
      />
    </UCard>
  </div>
</template>