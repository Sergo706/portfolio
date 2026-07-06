export function useFileStats(fileContent: Ref<string | null>) {

const fileStats = computed(() => {
  if (fileContent.value === null) return null;
  const lines = fileContent.value.split('\n');
  const loc = lines.filter(l => l.trim().length > 0).length;
  const size = new TextEncoder().encode(fileContent.value).length;
  return { lines: lines.length, loc, size };
});

 return fileStats;
}

export function useFormatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2)).toString()} ${String(sizes[i])}`;
}