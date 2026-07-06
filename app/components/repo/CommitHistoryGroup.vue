<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { toast } from 'vue-sonner';
import { useGitAvatar } from '~/composables/repo/useGitAvatar';
import type { GitCommit } from '~~/shared/types/Git';

const props = defineProps<{
  commits: GitCommit[];
  repoName: string;
  filePath?: string;
  isTree?: boolean;
}>();

const { copy } = useClipboard();

const copyHash = (hash: string) => {
  void copy(hash);
  toast.success('Copied commit hash');
};

const groupedCommits = computed(() => {
  const groups = new Map<string, GitCommit[]>();
  for (const commit of props.commits) {
    const dateStr = commit.date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const group = groups.get(dateStr) ?? [];
    group.push(commit);
    groups.set(dateStr, group);
  }
  return Array.from(groups.entries()).map(([date, commits]) => ({ date, commits }));
});
</script>

<template>
  <UCard
    v-for="group in groupedCommits"
    :key="group.date"
    variant="soft"
    :ui="{
      root: 'border border-white/10 bg-zinc-900/60 backdrop-blur-sm',
      body: 'p-0',
    }"
  >
    <template #header>
      <h3 class="text-sm font-semibold text-white/70 flex items-center gap-2">
        <UIcon
          name="i-lucide-calendar"
          class="w-4 h-4"
        />
        {{ group.date }}
      </h3>
    </template>
    
    <UTimeline
      :items="group.commits.map(c => ({ 
        title: c.message.split('\n')[0] || 'No message',
        avatar: {
          src: useGitAvatar(ref(c)).value,
          loading: 'lazy' as const
        },
        ...c,
        date: c.date.toISOString()
      }))"
      class="ml-2"
    >
      <template #description="{ item }">
        <div class="flex flex-col gap-2 pb-6 mt-1">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
            <div class="flex items-center gap-1.5">
              <span class="font-medium text-white/70">{{ item.author }}</span>
              <span>committed on {{ new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
            </div>
          </div>
            
     
          <div class="hidden sm:flex items-center gap-2 mt-2">
            <UTooltip text="View Diff">
              <UButton
                :to="`/repo/${repoName}/commit/${item.hash}`"
                color="neutral"
                variant="subtle"
                size="xs"
                icon="i-lucide-git-commit-horizontal"
                class="font-mono"
              >
                {{ item.hash.substring(0, 7) }}
              </UButton>
            </UTooltip>
              
            <UTooltip text="Copy Hash">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-copy"
                @click="copyHash(item.hash)"
              />
            </UTooltip>
              
            <UTooltip text="Browse Repo at this Commit">
              <UButton
                :to="filePath ? `/repo/${repoName}/${isTree ? 'tree' : 'blob'}/${item.hash}/${filePath}` : `/repo/${repoName}/tree/${item.hash}`"
                color="primary"
                variant="ghost"
                size="xs"
                icon="i-lucide-folder-git-2"
              >
                Browse Repo
              </UButton>
            </UTooltip>
          </div>


          <div class="sm:hidden mt-2">
            <UDropdownMenu
              :items="[
                { label: 'View Diff (' + item.hash.substring(0, 7) + ')', icon: 'i-lucide-git-commit-horizontal', to: `/repo/${repoName}/commit/${item.hash}` },
                { label: 'Copy Hash', icon: 'i-lucide-copy', onSelect: () => copyHash(item.hash) },
                { label: 'Browse Repo', icon: 'i-lucide-folder-git-2', color: 'primary', to: filePath ? `/repo/${repoName}/${isTree ? 'tree' : 'blob'}/${item.hash}/${filePath}` : `/repo/${repoName}/tree/${item.hash}` }
              ]"
            >
              <UButton
                color="neutral"
                variant="outline"
                size="xs"
                icon="i-lucide-more-horizontal"
                class="w-full justify-center"
              >
                Actions
              </UButton>
            </UDropdownMenu>
          </div>
        </div>
      </template>
    </UTimeline>
  </UCard>
</template>
