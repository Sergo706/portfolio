import * as Diff from 'diff';
import type { DiffFile } from '~~/shared/types/Git';
import type { Ref } from 'vue';
import type { Results } from '@riavzon/utils';

export function useFullFileDiff(
  isExpanded: Ref<boolean>,
  file: DiffFile,
  parentHash: string,
  commitHash: string,
  gitRepo: { getFileContent: (path: string, hash: string) => Promise<Results<string>> }
) {
  const fullFileHunks = ref<Diff.StructuredPatchHunk[] | null>(null);
  const isLoadingFull = ref(false);

  watch(isExpanded, async (expanded) => {
    if (expanded && !fullFileHunks.value && file.type !== 'add' && file.type !== 'remove') {
      isLoadingFull.value = true;
      try {
        const oldRes = await gitRepo.getFileContent(file.path, parentHash);
        const oldText = oldRes.ok ? oldRes.data : '';
        const newRes = await gitRepo.getFileContent(file.path, commitHash);
        const newText = newRes.ok ? newRes.data : '';
        
        const patch = Diff.structuredPatch(
          file.path,
          file.path,
          oldText,
          newText,
          '',
          '',
          { context: 99999 }
        );
        
        fullFileHunks.value = patch.hunks;
      } catch (e) {
        console.error(e);
      } finally {
        isLoadingFull.value = false;
      }
    }
  });

  return { fullFileHunks, isLoadingFull };
}
