import * as Diff from 'diff';
import type { DiffFile } from '~~/shared/types/Git';
import type { Ref } from 'vue';

export function useFullFileDiff(
  isExpanded: Ref<boolean>,
  file: DiffFile,
  parentHash: string,
  commitHash: string,
  gitRepo: { getFileContent: (path: string, hash: string) => Promise<string | null> }
) {
  const fullFileHunks = ref<Diff.StructuredPatchHunk[] | null>(null);
  const isLoadingFull = ref(false);

  watch(isExpanded, async (expanded) => {
    if (expanded && !fullFileHunks.value && file.type !== 'add' && file.type !== 'remove') {
      isLoadingFull.value = true;
      try {
        const oldText = await gitRepo.getFileContent(file.path, parentHash) ?? '';
        const newText = await gitRepo.getFileContent(file.path, commitHash) ?? '';
        
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
