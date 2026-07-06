export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const isCommitHash = (ref: string) => {
  return ref.length === 40 && /^[0-9a-f]{40}$/.test(ref);
};

export const formatItem = (item: string) => {
  return isCommitHash(item) ? item.substring(0, 7) : item;
};
