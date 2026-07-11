export function useMarkdownImageResolver(
  content: Ref<string | null> | string | null,
  repoName: Ref<string> | string,
  branch: Ref<string> | string,
  owner =  'Sergo706'
) {
  return computed(() => {
    const _content = unref(content);
    if (!_content) return '';
    
    const _repoName = unref(repoName);
    const _branch = unref(branch);

    if (!_repoName || !_branch) return _content;

    const baseUrl = `https://cdn.jsdelivr.net/gh/${owner}/${_repoName}@${_branch}/`;

    return _content
      .replace(/!\[(.*?)\]\((?!http)(.*?)\)/g, `![$1](${baseUrl}$2)`)
      .replace(/<img([^>]+)src=["'](?!http)(.*?)["']/g, `<img$1src="${baseUrl}$2"`);
  });
}
