<script setup lang="ts">
import { getIcon } from '~/utils/useTreeLinks';
import { useTimeAgo } from '@vueuse/core';
import AuthorLastCommit from '~/components/repo/AuthorLastCommit.vue';
import type { useGitRepo } from '~/composables/repo/useGitRepo';
import FileTree from './FileTree.vue';
import BlobViewer from './BlobViewer.vue';
import RepoFileActions from './RepoFileActions.vue';
import RepoFileStats from './RepoFileStats.vue';
import { useFileStats } from '~/utils/useFileStats.js';
import { useDownloadFile, useIsImage, useImageBlobUrl } from '~/composables/repo/useDownload';
import { useGitAvatar } from '~/composables/repo/useGitAvatar.js';
import { useFileContent } from '~/composables/repo/useFileContent';

const props = defineProps<{
  repoName: string;
  branch: string;
  filePath?: string;
  isTree?: boolean;
}>();

const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');
if (!gitRepo) throw new Error('gitRepo not provided');
const { loading, currentBranch } = gitRepo;
const isImage = useIsImage(computed(() => props.filePath));

const {
  pathLastCommit,
  folderFiles,
  fileContent,
  fileBlob,
  isBinaryFile,
  fetching
} = useFileContent(
  computed(() => props.filePath),
  computed(() => props.branch),
  computed(() => props.isTree)
);

const downloadFile = useDownloadFile(computed(() => props.filePath), fileBlob, fileContent);
const imageBlobUrl = useImageBlobUrl(computed(() => props.filePath), fileBlob);

const fileStats = useFileStats(fileContent);
const githubUrl = computed(() => {
  return `https://github.com/Sergo706/${props.repoName}/blob/${props.branch}/${String(props.filePath)}`;
});
const avatarUrl = useGitAvatar(pathLastCommit);

const isLoading = computed(() => loading.value || fetching.value);
const isCodeWrapped = ref(false);
const isMd = computed(() => props.filePath?.endsWith('.md') ?? false);
const showRawMd = ref(false);

</script>

<template>
  <RepoSkeletonsFileViewer
    v-if="isLoading"
    :file-path="filePath"
  />
  <div
    v-else
    class="flex flex-col gap-4"
  >
    <RepoBreadcrumbs
      :repo-name="repoName"
      :branch="branch"
      :file-path="filePath"
      :is-tree="isTree"
    />

    <AuthorLastCommit
      v-if="pathLastCommit"
      :last-commit="pathLastCommit"
      :avatar-url="avatarUrl"
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
      <RepoUnsupportedFile
        v-else-if="isBinaryFile || (fileStats?.size ?? 0) > 5e+6"
        :repo-name="repoName"
        :file-path="filePath || ''"
        :branch="branch"
        @download="downloadFile"
      />
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