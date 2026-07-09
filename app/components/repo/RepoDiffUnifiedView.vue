<script setup lang="ts">
import type { UnifiedRow } from '~/composables/repo/useDiffRowsHighlighted';

defineProps<{
  unifiedRows: UnifiedRow[];
  isWrapped?: boolean;
}>();
</script>

<template>
  <table
    :class="['w-full text-left font-mono border-collapse diff-table', !isWrapped ? 'min-w-[400px]' : 'table-fixed']"
  >
    <colgroup>
      <col class="w-10 sm:w-12">
      <col class="w-10 sm:w-12">
      <col class="w-full">
    </colgroup>
    <tbody>
      <tr
        v-for="(row, idx) in unifiedRows"
        :key="idx"
        class="align-top leading-6" 
        :class="{
          'bg-red-500/10': row.type === 'removed',
          'bg-green-500/10': row.type === 'added',
          'bg-[#161b22]/50': row.type === 'hunk'
        }"
      >
        <template v-if="row.type === 'hunk'">
          <td
            colspan="3"
            class="px-3 py-1 text-white/50 border-y border-white/5 text-xs font-semibold select-none bg-zinc-800/50"
          >
            {{ row.text }}
          </td>
        </template>
        <template v-else>
          <td class="px-2 text-right text-white/40 select-none bg-zinc-900/80 border-r border-white/5">
            {{ row.oldLineNum ?? '' }}
          </td>
          <td class="px-2 text-right text-white/40 select-none bg-zinc-900/80 border-r border-white/5">
            {{ row.newLineNum ?? '' }}
          </td>
          <td class="px-3 whitespace-pre-wrap break-words">
            <span class="inline-block w-4 opacity-50 select-none">{{ row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' ' }}</span>
            <span
              v-if="row.html"
              v-html="row.html"
            />
            <template v-else>
              <template v-if="row.words">
                <span
                  v-for="(word, wIdx) in row.words"
                  :key="wIdx" 
                  :class="{'bg-red-500/30 text-white rounded-[2px]': word.removed, 'bg-green-500/30 text-white rounded-[2px]': word.added}"
                >{{ word.value }}</span>
              </template>
              <template v-else>
                {{ row.text }}
              </template>
            </template>
          </td>
        </template>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.diff-table td {
  vertical-align: top;
}
.diff-table tbody tr:hover td {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
