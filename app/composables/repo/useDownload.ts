import git, { type FsClient } from 'isomorphic-git';
import jszip from 'jszip';

export function useDownloadZip(options: {
  fs: FsClient;
  dir: string;
  ref: Ref<string>;
  repoName: string;
}) {
  const { fs, dir, repoName } = options;
  // eslint-disable-next-line prefer-const
  let gitCache = {};
  
  const download = async () => {
    const currentRef = options.ref.value;
    try {
      const fileList = await git.listFiles({ fs, dir, ref: currentRef, cache: gitCache });
      const commitOid = await git.resolveRef({ fs, dir, ref: currentRef });
      const zip = new jszip();

      for (const file of fileList) {
        const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath: file, cache: gitCache });
        zip.file(file, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${repoName}-${currentRef}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    
    setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
    toast.success(`Downloading ${repoName}...`);
  } catch (error) {
    console.error('Failed to download ZIP:', error);
    toast.error(`Error downloading ${repoName}`);
  }
};


return download;
}


export const useDownloadFile = (
  filePath: Ref<string | undefined>, 
  fileBlob: Ref<Uint8Array | null>,
  fileContent: Ref<string | null>
) => {
  return () => {
    if (!filePath.value) return;
    
    let blob: Blob;
    if (fileBlob.value) {
      const ext = filePath.value.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
      };
      const mime = mimeTypes[ext ?? ''] ?? 'application/octet-stream';
      blob = new Blob([fileBlob.value as BlobPart], { type: mime });
    } else if (fileContent.value) {
      blob = new Blob([fileContent.value], { type: 'text/plain' });
    } else {
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.value.split('/').pop() ?? 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
};

export const useIsImage = (filePath: Ref<string | undefined>) => {
  const isImage = computed(() => {
    if (!filePath.value) return false;
    const ext = filePath.value.split('.').pop()?.toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'].includes(ext ?? '');
  });

  return isImage;
};

export const useImageBlobUrl = (
  filePath: Ref<string | undefined>,
  fileBlob: Ref<Uint8Array | null>
) => {
  const imageBlobUrl = ref<string | null>(null);

  watchEffect((onCleanup) => {
    if (!fileBlob.value || !filePath.value) {
      if (imageBlobUrl.value) {
        URL.revokeObjectURL(imageBlobUrl.value);
        imageBlobUrl.value = null;
      }
      return;
    }

    const ext = filePath.value.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
    };
    const mime = mimeTypes[ext ?? ''] ?? 'application/octet-stream';
    const blob = new Blob([fileBlob.value as BlobPart], { type: mime });
    const url = URL.createObjectURL(blob);
    imageBlobUrl.value = url;

    onCleanup(() => {
      URL.revokeObjectURL(url);
    });
  });

  return imageBlobUrl;
};