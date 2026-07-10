<script setup lang="ts">
import { useGitRepo } from '~/composables/repo/useGitRepo';
import type { GitCommit } from '~~/shared/types/Git';
import CommitHistoryFilters from '~/components/repo/CommitHistoryFilters.vue';
import RepoBreadcrumbs from '~/components/repo/RepoBreadcrumbs.vue';
import CommitHistoryGroup from '~/components/repo/CommitHistoryGroup.vue';
import { goBack } from '~/utils/goBack';
import { getLocalTimeZone, type CalendarDate } from '@internationalized/date';

interface DateRange { 
  start: CalendarDate | undefined; 
  end: CalendarDate | undefined 
}

const props = defineProps<{
  repoName: string;
  filePath?: string;
  branch?: string;
}>();

const gitRepo = useGitRepo(props.repoName, props.branch);
const allCommits = ref<GitCommit[]>([]);
const fetching = ref(false);

const isTree = computed(() => {
  if (!props.filePath) return true;
  return !gitRepo.allFiles.value.includes(props.filePath);
});

const selectedBranch = ref(props.branch ?? 'main');

watch(() => props.branch, async (newBranch) => {
  if (newBranch && newBranch !== selectedBranch.value) {
    selectedBranch.value = newBranch;
  }
  if (newBranch && newBranch !== gitRepo.currentBranch.value) {
    await gitRepo.switchBranch(newBranch, true);
  }
}, { immediate: true });

const selectedAuthor = ref<string>('All Authors');


const selectedDateRange = shallowRef<DateRange | undefined>(undefined);
const tz = getLocalTimeZone();

const currentPage = ref(1);
const itemsPerPage = 10; 

const loadCommits = async () => {
  fetching.value = true;
  try {
    const res = await gitRepo.getAllCommits(selectedBranch.value, props.filePath);
    if (res.ok) {
      allCommits.value = res.data;
    } else {
      console.error('[RepoCommitHistory] getAllCommits failed:', res.reason);
      showError({
         statusCode: 404,
         message: 'Commits not found',
         data: { errorDescription: res.reason, image: '/assets/error-tree.png' }
      });
    }
  } finally {
    fetching.value = false;
  }
};

watch(() => gitRepo.loading.value, (isLoading) => {
  if (!isLoading) {
    if (!props.branch) {
      selectedBranch.value = gitRepo.currentBranch.value || 'main';
    }
    void loadCommits();
  }
}, { immediate: true });

watch(selectedBranch, async (newBranch, oldBranch) => {
  if (newBranch && newBranch !== oldBranch && !gitRepo.loading.value) {
    if (newBranch !== props.branch) {
      await gitRepo.switchBranch(newBranch, false);
    } else {
      currentPage.value = 1;
      void loadCommits();
    }
  }
});

watch([selectedAuthor, selectedDateRange], () => {
  currentPage.value = 1;
});

const authors = computed(() => {
  const authorSet = new Set<string>();
  for (const c of allCommits.value) {
    authorSet.add(c.author);
  }
  return ['All Authors', ...Array.from(authorSet)];
});

const filteredCommits = computed(() => {
  return allCommits.value.filter(c => {
    if (selectedAuthor.value !== 'All Authors' && c.author !== selectedAuthor.value) return false;
    
    if (selectedDateRange.value?.start) {
      const commitTime = c.date.getTime();

      const startDate = selectedDateRange.value.start.toDate(tz);
      startDate.setHours(0, 0, 0, 0);
      const startTime = startDate.getTime();

      let endTime = startTime; 
      
      if (selectedDateRange.value.end) {
        const endDate = selectedDateRange.value.end.toDate(tz);
        endDate.setHours(23, 59, 59, 999);
        endTime = endDate.getTime();
      } else {
        const endDate = new Date(startTime);
        endDate.setHours(23, 59, 59, 999);
        endTime = endDate.getTime();
      }

      if (commitTime < startTime || commitTime > endTime) {
        return false;
      }
    }
    return true;
  });
});

const paginatedCommits = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredCommits.value.slice(start, end);
});


const handlePageChange = (page: number) => {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

</script>

<template>
  <UPage class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm"
        label="Back"
        aria-label="Back to repository"
        @click.prevent="goBack(`/repo/${repoName}`)"
      />
    </div>

    <UPageHeader 
      :headline="repoName" 
      title="Commit History" 
      :ui="{
        root: 'relative border-default py-8 mb-4',
      }"
    >
      <template #description>
        <div class="flex-col sm:flex-row sm:items-center gap-4 mt-2">
          <span class="text-white/50">History for</span>
          <RepoBreadcrumbs
            v-if="filePath"
            :repo-name="repoName"
            :branch="selectedBranch"
            :file-path="filePath"
            :is-tree="isTree"
          />

          <span
            v-else
            class="text-white/70"
          >{{ repoName }} 
            repository
          </span>

          <span class="text-white/50 ml-1">on</span>
          <UBadge
            variant="subtle"
            color="neutral"
            size="lg"
            class="font-mono ml-1 mt-2"
          >
            {{ selectedBranch }}
          </UBadge>
        </div>
      </template>
    </UPageHeader>
    
    <CommitHistoryFilters
      v-model:branch="selectedBranch"
      v-model:author="selectedAuthor"
      v-model:date-range="selectedDateRange"
      :authors="authors"
      :tags="gitRepo.tags.value || []"
      :branches="gitRepo.branches.value || []"
    />

    <UPageBody>
      <RepoSkeletonsCommitHistory v-if="fetching || gitRepo.loading.value" />
      
      <div
        v-else-if="filteredCommits.length === 0"
        class="text-center py-12 text-white/50"
      >
        No commits found for the selected filters.
      </div>
      
      <div
        v-else
        class="space-y-12"
      >
        <CommitHistoryGroup
          :commits="paginatedCommits"
          :repo-name="repoName"
          :file-path="filePath"
          :is-tree="isTree"
        />
        
        <div class="flex justify-center mt-12 pb-12">
          <UPagination
            :page="currentPage"
            :total="filteredCommits.length"
            :items-per-page="itemsPerPage"
            @update:page="handlePageChange"
          />
        </div>
      </div>
    </UPageBody>
  </UPage>
</template>
