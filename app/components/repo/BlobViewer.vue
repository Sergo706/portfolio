<script setup lang="ts">
import type { useGitRepo } from '~/composables/repo/useGitRepo';

const props = defineProps<{
  content: string;
  filePath: string;
}>();

const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');

const lang = computed(() => {
  const name = props.filePath.split('/').pop()?.toLowerCase() ?? '';
  if (name.endsWith('.md')) return 'md';
  if (name.endsWith('.svg')) return 'xml';
  if (name.startsWith('.env')) return 'dotenv';
  if (name.endsWith('.iss')) return 'bash';

  if (name.startsWith('.')) return 'bash';
  if (name === 'dockerfile') return 'dockerfile';
  return name.split('.').pop() ?? 'text';
});

const isMarkdown = computed(() => lang.value === 'md');
const code = computed(() => {
  if (!isMarkdown.value) return `\`\`\`${lang.value}\n${props.content}\n\`\`\``;
  
  if (!gitRepo) return props.content;
  const baseUrl = `https://cdn.jsdelivr.net/gh/Sergo706/${gitRepo.repoName}@${gitRepo.currentBranch.value}/`;
  
  return props.content
    .replace(/!\[(.*?)\]\((?!http)(.*?)\)/g, `![$1](${baseUrl}$2)`)
    .replace(/<img([^>]+)src=["'](?!http)(.*?)["']/g, `<img$1src="${baseUrl}$2"`);
});

</script>

<template>
  <div
    class="file-viewer overflow-x-auto text-sm w-full"
    :class="{ 'is-code': !isMarkdown, 'markdown-body prose dark:prose-invert max-w-none': isMarkdown }"
  >
    <MDC :value="code" />
  </div>
</template>

<style scoped>
.file-viewer.markdown-body {
  padding: 2rem;
}

.file-viewer.is-code :deep(pre) {
  counter-reset: line;
  padding: 0.2rem 0;
  margin: 0;
  background: transparent !important;
  border: none !important;
  border-radius: 0;
}

.file-viewer.is-code :deep(pre code) {
  display: block;
  min-width: 100%;
}

.file-viewer.is-code :deep(pre code .line) {
  display: block;
  min-width: 100%;
  width: max-content;
}

.file-viewer.is-code :deep(pre code .line::before) {
  counter-increment: line;
  content: counter(line);
  display: inline-block;
  width: 2rem;
  margin-right: 1.3rem;
  text-align: right;
  color: rgba(255, 255, 255, 0.3);
  user-select: none;
}

/* images in the first paragraph or inside links */
.file-viewer.markdown-body :deep(p:first-of-type img),
.file-viewer.markdown-body :deep(a img),
.file-viewer.markdown-body :deep(img[src*="badge"]),
.file-viewer.markdown-body :deep(img[src*="shield"]) {
  display: inline-block;
  height: 28px;
  width: auto;
  margin: 0 4px 0 0;
}

.file-viewer.markdown-body :deep(img) {
  max-width: 100%;
}

.file-viewer.is-code :deep(.group > button) {
  display: none !important;
}

.file-viewer.is-code :deep(pre) {
  overflow-x: auto !important;
  white-space: pre !important;
}

.file-viewer.is-code :deep(pre code),
.file-viewer.is-code :deep(pre code .line) {
  white-space: pre !important;
}

.file-viewer,
.file-viewer :deep(*) {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.file-viewer::-webkit-scrollbar,
.file-viewer :deep(*)::-webkit-scrollbar {
  height: 4px;
}

.file-viewer::-webkit-scrollbar-track,
.file-viewer :deep(*)::-webkit-scrollbar-track {
  background: transparent;
}

.file-viewer::-webkit-scrollbar-thumb,
.file-viewer :deep(*)::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.file-viewer::-webkit-scrollbar-thumb:hover,
.file-viewer :deep(*)::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.4);
}

</style>