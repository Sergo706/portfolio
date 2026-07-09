<script setup lang="ts">
const props = defineProps<{
  repoName: string;
  filePath: string;
  branch: string;
  reason?: string;
  customGithubUrl?: string;
}>();

const githubUrl = computed(() => props.customGithubUrl ?? `https://github.com/Sergo706/${props.repoName}/blob/${props.branch}/${props.filePath}`);

const emit = defineEmits<(e: 'download') => void>();
</script>

<template>
  <div class="p-16 flex flex-col items-center justify-center text-center gap-4 text-white/60 bg-zinc-900/50">
    <UIcon
      name="i-lucide-file-archive"
      class="size-16 opacity-50"
    />
    <p>{{ reason || 'This file is binary or too large and cannot be rendered this time.' }}</p>

    <div class="flex items-center gap-4 mt-2 flex-wrap justify-center">
      <UButton
        variant="soft"
        color="neutral"
        icon="i-lucide-download"
        @click="emit('download')"
      >
        Download File
      </UButton>
      
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-simple-icons-github"
        :to="githubUrl"
        target="_blank"
      >
        View on GitHub
      </UButton>
    </div>
  </div>
</template>
