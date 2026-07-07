<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { DateFormatter, getLocalTimeZone, today, type CalendarDate } from '@internationalized/date';
import BranchSelector from '~/components/repo/BranchSelector.vue';

defineProps<{
  authors: string[];
  tags: string[];
  branches: string[];
}>();

const branch = defineModel<string>('branch', { required: true });
const author = defineModel<string>('author', { required: true });

interface DateRange { 
  start: CalendarDate | undefined; 
  end: CalendarDate | undefined 
}

const dateRange = defineModel<DateRange | undefined>('dateRange');

const df = new DateFormatter('en-US', { dateStyle: 'medium' });
const tz = getLocalTimeZone();
const maxDate = today(tz);
const breakpoints = useBreakpoints(breakpointsTailwind);
const isDesktop = breakpoints.greaterOrEqual('sm');

const ranges = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', months: 3 },
  { label: 'Last 6 months', months: 6 },
  { label: 'Last year', years: 1 }
];

const label = computed(() => {
  const start = dateRange.value?.start;
  const end = dateRange.value?.end;
  if (!start) return 'Filter by date';
  if (!end) return df.format(start.toDate(tz));
  return `${df.format(start.toDate(tz))} - ${df.format(end.toDate(tz))}`;
});

function computeStart(range: typeof ranges[number]) {
  const end = today(tz);
  const start = end.subtract({
    days: range.days ?? 0,
    months: range.months ?? 0,
    years: range.years ?? 0
  });
  return { start, end };
}

function isRangeSelected(range: typeof ranges[number]) {
  if (!dateRange.value?.start || !dateRange.value.end) return false;
  const { start, end } = computeStart(range);
  return dateRange.value.start.compare(start) === 0 && dateRange.value.end.compare(end) === 0;
}

function selectRange(range: typeof ranges[number]) {
  dateRange.value = computeStart(range);
}
</script>

<template>
  <div class="flex flex-col sm:flex-row gap-4 items-center pb-6 mb-6 border-b border-white/10">
    <BranchSelector
      :current-ref="branch"
      :tags="tags"
      :branches="branches"
      class="w-full sm:w-70 z-20"
      @change-ref="branch = $event"
    />
    
    <USelectMenu 
      v-model="author" 
      :items="authors" 
      icon="i-lucide-users" 
      class="w-full sm:w-48"
      placeholder="Author"
    />

    <UPopover
      :content="{ align: 'center' }"
      class="w-full sm:w-auto ml-auto z-20"
    >
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-lucide-calendar"
        class="w-full sm:w-64 justify-start text-white/70"
      >
        {{ label }}
      </UButton>

      <template #content>
        <div class="flex items-stretch divide-x divide-white/10 bg-zinc-900 shadow-xl border border-white/10 rounded-lg">
          <div class="hidden sm:flex flex-col justify-start py-2">
            <UButton
              v-for="(range, index) in ranges"
              :key="index"
              :label="range.label"
              color="neutral"
              variant="ghost"
              class="rounded-none px-4"
              :class="[isRangeSelected(range) ? 'bg-white/10' : 'hover:bg-white/5']"
              truncate
              @click="selectRange(range)"
            />
            <hr class="border-white/5 my-1">
            <UButton
              label="Clear filter"
              color="error"
              variant="ghost"
              class="rounded-none px-4 text-red-400 hover:bg-red-400/10 hover:text-red-300"
              truncate
              @click="dateRange = undefined"
            />
          </div>

          <div class="flex flex-col">
            <UCalendar
              v-model="dateRange"
              :max-value="maxDate"
              class="p-2"
              :number-of-months="isDesktop ? 2 : 1"
              range
            />
            
            <div class="flex sm:hidden border-t border-white/10 p-2">
              <UButton
                label="Clear filter"
                color="error"
                variant="soft"
                class="w-full justify-center text-red-400 bg-red-400/10 hover:bg-red-400/20"
                @click="dateRange = undefined"
              />
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>