import type { GitCommit, GitFile } from '~~/shared/types/Git';
import type { useGitRepo } from '~/composables/repo/useGitRepo';
import { useIsImage } from './useDownload';

export function useFileContent(
  filePath: Ref<string | undefined>,
  branch: Ref<string | undefined>,
  isTree: Ref<boolean | undefined> = ref(false)
) {
  const gitRepo = inject<ReturnType<typeof useGitRepo>>('gitRepo');
  if (!gitRepo) throw new Error('gitRepo not provided');
  
  const { getPathCommit, getFilesInFolder, getFileBlob, loading } = gitRepo;
  const isImage = useIsImage(filePath);

  const pathLastCommit = ref<GitCommit | null>(null);
  const folderFiles = ref<GitFile[]>([]);
  const fileContent = ref<string | null>(null);
  const fileBlob = ref<Uint8Array | null>(null);
  const isBinaryFile = ref(false);
  const fetching = ref(false);

  watchEffect(() => {
    if (!filePath.value || !branch.value) {
      fileContent.value = null;
      fileBlob.value = null;
      isBinaryFile.value = false;
      return;
    }
    if (loading.value) return;

    const path = filePath.value;
    const refBranch = branch.value;
    const tree = isTree.value;

    fetching.value = true;

    const fetchData = async () => {
      try {
        pathLastCommit.value = await getPathCommit(path, refBranch);

        if (tree) {
          folderFiles.value = await getFilesInFolder(path, refBranch);
          fileContent.value = null;
          fileBlob.value = null;
          isBinaryFile.value = false;
        } else if (isImage.value) {
          fileContent.value = null;
          isBinaryFile.value = false;
          fileBlob.value = await getFileBlob(path, refBranch);
        } else {
          const blob = await getFileBlob(path, refBranch);
          fileBlob.value = blob;
          if (blob) {
            const isBinary = blob.slice(0, 8000).some(byte => byte === 0);
            if (isBinary) {
              isBinaryFile.value = true;
              fileContent.value = null;
            } else {
              const text = new TextDecoder().decode(blob);
              if (text.startsWith('version https://git-lfs.github.com/spec/v1')) {
                isBinaryFile.value = true;
                fileContent.value = null;
              } else {
                isBinaryFile.value = false;
                fileContent.value = text;
              }
            }
          } else {
            isBinaryFile.value = false;
            fileContent.value = null;
          }
        }
      } finally {
        fetching.value = false;
      }
    };

    void fetchData();
  });

  return {
    pathLastCommit,
    folderFiles,
    fileContent,
    fileBlob,
    isBinaryFile,
    fetching
  };
}
