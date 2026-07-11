/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { Results } from '@riavzon/utils';

export function useDownloadZip(options: {
  downloadZip: (branch?: string) => Promise<Results<Uint8Array>>;
  repoName: string;
  ref: Ref<string>;
}) {
  const isDownloading = ref(false);

  const download = async () => {
    if (isDownloading.value) return;
    isDownloading.value = true;
    try {
      const result = await options.downloadZip(options.ref.value);
      if (result.ok) {
        if (!result.data) throw new Error('Download failed: No data');
        const url = URL.createObjectURL(new Blob([result.data as BlobPart]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${options.repoName}-${options.ref.value}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
        toast.success(`Downloaded ${options.repoName}`);
      } else {
        throw new Error(result.reason || 'Download failed');
      }
    } catch (e) {
      console.error('Download ZIP error:', e);
      toast.error(`Error downloading ${options.repoName}`);
    } finally {
      isDownloading.value = false;
    }
  };

  return { download, isDownloading };
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