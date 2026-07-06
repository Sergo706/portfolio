<script setup lang="ts">
import BranchSelector from '~/components/repo/BranchSelector.vue';

defineProps<{
  authors: string[];
  tags: string[];
  branches: string[];
}>();

const branch = defineModel<string>('branch', { required: true });
const author = defineModel<string>('author', { required: true });
const date = defineModel<string>('date', { required: true });
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
    <UInput 
      v-model="date" 
      type="date" 
      icon="i-lucide-calendar" 
      class="w-full sm:w-48 ml-auto"
    />
  </div>
</template>
