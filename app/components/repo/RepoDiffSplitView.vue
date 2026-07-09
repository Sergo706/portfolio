<script setup lang="ts">
import type { SplitRow } from '~/composables/repo/useDiffRowsHighlighted';

defineProps<{
  splitRows: SplitRow[];
  isWrapped?: boolean;
}>();
</script>

<template>
  <table
    :class="['w-full text-left font-mono border-collapse diff-table', !isWrapped ? 'min-w-[800px]' : 'table-fixed']"
  >
    <colgroup>
      <col class="w-10 sm:w-12">
      <col class="w-[calc(50%-2.5rem)]">
      <col class="w-10 sm:w-12">
      <col class="w-[calc(50%-2.5rem)]">
    </colgroup>
    <tbody>
      <tr
        v-for="(row, idx) in splitRows"
        :key="idx"
        class="align-top leading-6"
      >
        <template v-if="row.isHunkHeader">
          <td
            colspan="4"
            class="px-3 py-1 text-white/50 bg-zinc-800/50 border-y border-white/5 text-xs font-semibold select-none"
          >
            {{ row.text }}
          </td>
        </template>
        <template v-else>
          <td
            class="px-2 text-right text-white/40 select-none bg-zinc-900/80 border-r border-white/5"
            :class="{'bg-red-500/10 text-red-400/60': row.left?.type === 'removed'}"
          >
            {{ row.left?.lineNum ?? '' }}
          </td>
          <td
            class="px-3 whitespace-pre-wrap break-words"
            :class="{'bg-red-500/5': row.left?.type === 'removed'}"
          >
            <template v-if="row.left">
              <span class="inline-block w-4 opacity-50 select-none">{{ row.left.type === 'removed' ? '-' : ' ' }}</span>
              <span
                v-if="row.left.html"
                v-html="row.left.html"
              />
              <template v-else>
                <span
                  v-for="(word, wIdx) in row.left.words || [{ value: row.left.text, removed: row.left.type === 'removed' }]"
                  :key="wIdx"
                  :class="{'bg-red-500/30 text-white rounded-[2px]': word.removed}"
                >{{ word.value }}</span>
              </template>
            </template>
          </td>

          <td
            class="px-2 text-right text-white/40 select-none bg-zinc-900/80 border-l border-r border-white/5"
            :class="{'bg-green-500/5 text-green-400/60': row.right?.type === 'added'}"
          >
            {{ row.right?.lineNum ?? '' }}
          </td>
          <td
            class="px-3 whitespace-pre-wrap break-words"
            :class="{'bg-green-500/10': row.right?.type === 'added'}"
          >
            <template v-if="row.right">
              <span class="inline-block w-4 opacity-50 select-none">{{ row.right.type === 'added' ? '+' : ' ' }}</span>
              <span
                v-if="row.right.html"
                v-html="row.right.html"
              />
              <template v-else>
                <span
                  v-for="(word, wIdx) in row.right.words || [{ value: row.right.text, added: row.right.type === 'added' }]"
                  :key="wIdx"
                  :class="{'bg-green-500/30 text-white rounded-[2px]': word.added}"
                >{{ word.value }}</span>
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
