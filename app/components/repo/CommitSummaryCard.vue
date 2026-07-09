<script setup lang="ts">
import type { GitCommit } from '~~/shared/types/Git';
import { useTimeAgo, useDateFormat, useClipboard } from '@vueuse/core';
import { useGitAvatar } from '~/composables/repo/useGitAvatar';

const props = defineProps<{
  commit: GitCommit;
  repoName: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  currentBranch: string;
}>();

const { copy, copied } = useClipboard();

const exactDate = useDateFormat(() => props.commit.date, 'MMM D, YYYY, HH:mm');
const timeAgo = useTimeAgo(() => props.commit.date);
const commitMsg = computed(() =>  `\`\`\`md\n${props.commit.message}\n\`\`\``);
const avatarUrl = useGitAvatar(ref(props.commit));

const diffBlocks = computed<string[]>(() => {
  const total = props.additions + props.deletions;
  if (total === 0) return Array<string>(5).fill('bg-white/10');

  let green = 0;
  let red = 0;

  if (total <= 5) {
    green = props.additions;
    red = props.deletions;
  } else {
    green = Math.round((props.additions / total) * 5);
    red = Math.round((props.deletions / total) * 5);
    
    if (props.additions > 0 && green === 0) green = 1;
    if (props.deletions > 0 && red === 0) red = 1;
    while (green + red > 5) {
      if (green > red) green--; else red--;
    }
  }

  const blocks: string[] = [];
  for (let i = 0; i < green; i++) blocks.push('bg-green-500');
  for (let i = 0; i < red; i++) blocks.push('bg-red-500');
  while (blocks.length < 5) blocks.push('bg-white/10');
  
  return blocks;
});
</script>

<template>
  <UCard
    variant="outline"
    :ui="{
      root: 'backdrop-blur-sm rounded-none sm:rounded-lg',
      body: 'p-0 sm:p-0 m-0',
    }"
  >
    <template #header>
      <div class="flex items-center justify-items-normal gap-4 w-full flex-wrap">
        <h1 class="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <UIcon
            name="i-lucide-git-commit-horizontal"
            class="size-5 sm:size-6 text-white/50"
          />
          Commit 
        </h1>
        <UButton
          variant="soft"
          size="sm"
          color="neutral"
          :label="commit.hash.slice(0, 7)"
          :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
          trailing
          class="font-mono cursor-pointer"
          @click="copy(commit.hash)"
        />
        <div class="flex items-center gap-2 sm:ml-auto shrink-0">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            size="sm"
            variant="ghost"
            @click="goBack(`/repo/${repoName}`)"
          >
            Back
          </UButton>
          <UButton
            :to="`/repo/${repoName}/tree/${commit.hash}`"
            icon="i-lucide-folder-git-2"
            color="neutral"
            size="sm"
            variant="soft"
          >
            Browse files
          </UButton>
        </div>
      </div>
    </template>

    <div class="flex flex-col w-full">
      <MDC 
        class="text-base sm:text-sm p-3 w-full border-0 border-b border-white/5 prose prose-invert prose-sm max-w-none [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!bg-transparent [&_pre]:!ring-0 [&_pre]:!border-0 [&_button]:!hidden" 
        :value="commitMsg"
      />
      <UUser
        :name="commit.author"
        class="p-3 min-w-0 [&_p]:!truncate [&_span]:!truncate [&>div]:min-w-0"
        :avatar="{ 
          src: avatarUrl,
          alt: commit.author
        }"
        size="xs"
      >
        <template #description>
          <span :title="exactDate">committed {{ timeAgo }}</span>
        </template>
      </UUser>
      <div class="flex items-center px-3 pb-3 pt-1">
        <UBadge
          icon="i-lucide-git-branch"
          color="primary"
          variant="outline"
          class="hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <NuxtLink
            :to="`/repo/${repoName}/tree/${currentBranch}`"
          >
            {{ currentBranch }}
          </NuxtLink>
        </UBadge>
      </div>
    </div> 
    <template #footer>
      <div class="flex items-center justify-between sm:justify-start flex-wrap gap-4 text-sm w-full">
        <div class="flex items-center gap-1.5 text-white/70 whitespace-nowrap text-xs sm:text-sm">
          <UIcon
            name="i-lucide-files"
            class="size-4"
          />
          <span class="font-medium">{{ filesChanged }}</span>
          <span class="text-white/50">files changed</span>
        </div>
      
        <div class="flex items-center gap-3 font-mono flex-wrap">
          <UBadge
            v-if="commit?.parentHash"
            icon="i-lucide-arrow-left-to-line"
            color="primary"
            variant="outline"
            class="hover:bg-gray-800 transition-colors cursor-pointer"
          > 
            <NuxtLink 
              :to="`/repo/${repoName}/commit/${commit.parentHash}`"
            >
              {{ `Parent ${commit.parentHash.slice(0, 7)}` }}
            </NuxtLink>
          </UBadge>
          <div class="flex gap-2 flex-wrap">
            <UBadge
              color="success"
              variant="soft"
              size="sm"
              :label="`+${additions}`"
            />
            <UBadge
              color="error"
              variant="soft"
              size="sm"
              :label="`-${deletions}`"
            />
            <div class="flex gap-0.5 items-center">
              <div 
                v-for="(colorClass, i) in diffBlocks" 
                :key="i"
                class="h-2 w-2 rounded-sm"
                :class="colorClass"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>