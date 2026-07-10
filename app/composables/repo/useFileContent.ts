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
        const commitRes = await getPathCommit(path, refBranch);
        if (commitRes.ok) {
          pathLastCommit.value = commitRes.data;
        } else {
          pathLastCommit.value = null;
        }

        if (tree) {
          const filesRes = await getFilesInFolder(path, refBranch);
          if (!filesRes.ok) {
             console.error('[useFileContent] getFilesInFolder failed:', filesRes.reason);
             showError({
                statusCode: 404,
                message: 'Folder not found',
                data: { errorDescription: filesRes.reason, image: '/assets/error-tree.png' }
             });
             return;
          }
          folderFiles.value = filesRes.data;
          fileContent.value = null;
          fileBlob.value = null;
          isBinaryFile.value = false;
        } else if (isImage.value) {
          fileContent.value = null;
          isBinaryFile.value = false;
          const blobRes = await getFileBlob(path, refBranch);
          if (!blobRes.ok) {
             console.error('[useFileContent] getFileBlob (image) failed:', blobRes.reason);
             showError({
                statusCode: 404,
                message: 'Image not found',
                data: { errorDescription: blobRes.reason, image: '/assets/error-tree.png' }
             });
             return;
          }
          fileBlob.value = blobRes.data;
        } else {
          const blobRes = await getFileBlob(path, refBranch);
          if (!blobRes.ok) {
             console.error('[useFileContent] getFileBlob failed:', blobRes.reason);
             showError({
                statusCode: 404,
                message: 'File not found',
                data: { errorDescription: blobRes.reason, image: '/assets/error-tree.png' }
             });
             return;
          }
          const blob = blobRes.data;
          fileBlob.value = blob;
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
