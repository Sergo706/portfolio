<script setup lang="ts">
import { useFormatBytes } from '~/utils/useFileStats.js';

defineProps<{
  fileStats: { lines: number; loc: number; size: number } | null;
}>();
</script>

<template>
  <template v-if="fileStats">
    <span class="text-xs text-white/50">{{ fileStats.lines }} lines ({{ fileStats.loc }} loc) · {{ useFormatBytes(fileStats.size) }}</span>
  </template>
</template>
