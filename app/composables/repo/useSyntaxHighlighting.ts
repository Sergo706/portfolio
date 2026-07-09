import type { DiffFile } from '~~/shared/types/Git';
import type { useGitRepo } from '~/composables/repo/useGitRepo';


async function fetchHighlightLines(code: string | null, filePath: string): Promise<string[]> {
  if (!code) return [];
  
  try {
    const response = await $fetch<{ html: string }>('/api/highlight', {
      method: 'POST',
      body: { code, filePath }
    });
    
    if (!response.html) return [];
    
    const temp = document.createElement('div');
    temp.innerHTML = response.html;
    return Array.from(temp.querySelectorAll('.line')).map(el => el.innerHTML);
  } catch (err) {
    console.error('Failed to fetch syntax highlighting:', err);
    return [];
  }
}

export function useSyntaxHighlighting(
  file: DiffFile,
  parentHash: string,
  commitHash: string,
  gitRepo: ReturnType<typeof useGitRepo>
) {
  const oldLinesHtml = ref<string[]>([]);
  const newLinesHtml = ref<string[]>([]);

  onMounted(async () => {
    if (file.isBinary) return;


    const [oldText, newText] = await Promise.all([
      file.type !== 'add' ? gitRepo.getFileContent(file.path, parentHash) : Promise.resolve(''),
      file.type !== 'remove' ? gitRepo.getFileContent(file.path, commitHash) : Promise.resolve('')
    ]);

    const [oldHtml, newHtml] = await Promise.all([
      fetchHighlightLines(oldText, file.path),
      fetchHighlightLines(newText, file.path)
    ]);

    oldLinesHtml.value = oldHtml;
    newLinesHtml.value = newHtml;
  });

  return { oldLinesHtml, newLinesHtml };
}
