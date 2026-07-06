import type { NavigationMenuItem } from "@nuxt/ui";

const folderAliases: Record<string, string> = {
  '.github': 'github',
  '.vscode': 'vscode',
  'components': 'component',
  'composables': 'hook',
  'layouts': 'view',
  'pages': 'view',
  'assets': 'asset',
  'public': 'public',
  'utils': 'tools',
  'server': 'server',
  'api': 'api',
  'src': 'src',
  'test': 'test',
  'tests': 'test',
  'scripts': 'script',
  'workflows': 'github',
  'node_modules': 'node',
  'dist': 'dist',
  '.nuxt': 'nuxt',
  'docs': 'docs',
  'docker': 'docker'
};

const fileAliases: Record<string, string> = {
  'ts': 'typescript',
  'tsx': 'typescript',
  'vue': 'vue',
  'md': 'markdown',
  'yml': 'yaml',
  'yaml': 'yaml',
  'json': 'json',
  'png': 'image',
  'jpg': 'image',
  'jpeg': 'image',
  'svg': 'image',
  'gif': 'image',
  'webp': 'image',
  'ico': 'image',
  'sh': 'shell',
  'bash': 'shell',
  'py': 'python',
  'pyc': 'python',
  'dockerfile': 'docker',
  'package.json': 'npm',
  '.npmignore': 'npm',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  'license': 'license',

  'html': 'html',
  'css': 'css',
  'js': 'js',
  'mjs': 'js',
  'jsx': 'jsx',
  'txt': 'txt',
  'csv': 'csv',
  'xml': 'xml',
  'zip': 'zip',
  'pdf': 'pdf',
  'lock': 'lock',
  'env': 'env',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'h': 'h',
  'hpp': 'hpp',
  'cs': 'cs',
  'go': 'go',
  'rs': 'rs',
  'rb': 'rb',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kt',
  'dart': 'dart',
  'sql': 'sql',
  'graphql': 'graphql',
  'gql': 'graphql',
  'woff': 'woff',
  'woff2': 'woff',
  'ttf': 'font',
  'eot': 'font',
  'mp3': 'audio',
  'wav': 'audio',
  'mp4': 'video',
  'avi': 'video',
  'mkv': 'video',
  'webm': 'video',
  'doc': 'word',
  'docx': 'word',
  'xls': 'excel',
  'xlsx': 'excel',
  'ppt': 'powerpoint',
  'pptx': 'powerpoint',
  'mmdb': 'database'
};

export const getIcon = (itemPath: string, isFile: boolean) => {
  const name = itemPath.split('/').pop()?.toLowerCase() ?? '';

  if (!isFile) {
    const mappedFolder = folderAliases[name];
    return mappedFolder 
      ? `i-vscode-icons-folder-type-${mappedFolder}` 
      : 'i-vscode-icons-default-folder';
  }

  if (name.includes('.test.') || name.includes('.spec.')) {
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'i-vscode-icons-file-type-testts';
    if (name.endsWith('.js') || name.endsWith('.jsx')) return 'i-vscode-icons-file-type-testjs';
    return 'i-vscode-icons-file-type-test';
  }

  if (name.includes('nuxt.config')) return 'i-vscode-icons-file-type-nuxt';
  if (name.includes('tailwind.config')) return 'i-vscode-icons-file-type-tailwind';
  if (name.includes('vite.config')) return 'i-vscode-icons-file-type-vite';
  if (name.includes('tsconfig')) return 'i-vscode-icons-file-type-tsconfig';
  if (name.includes('eslint')) return 'i-vscode-icons-file-type-eslint';
  if (name.includes('prettier')) return 'i-vscode-icons-file-type-prettier';
  if (name.startsWith('.env')) return 'i-vscode-icons-file-type-dotenv';

  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() ?? '' : '';
  
  const mappedFile = fileAliases[name] ?? fileAliases[ext];
  
  return mappedFile 
    ? `i-vscode-icons-file-type-${mappedFile}` 
    : 'i-vscode-icons-default-file';
};

export function useTreeLinks(files: Ref<string[]>, repoName: Ref<string>, branch: Ref<string>) {
  const links = computed(() => {
    const root: NavigationMenuItem[] = [];

    for (const path of files.value) {
      const parts = path.split('/');
      let currentLevel = root;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        
        const isFile = i === parts.length - 1;
        let existingNode = currentLevel.find(n => n.label === part);
        
        if (!existingNode) {
          if (isFile) {
            existingNode = {
              label: part,
              icon: getIcon(path, true),
              to: `/repo/${repoName.value}/blob/${branch.value}/${path}`
            };
          } else {
            const folderPath = parts.slice(0, i + 1).join('/');
            existingNode = {
              label: part,
              icon: getIcon(folderPath, false),
              to: `/repo/${repoName.value}/tree/${branch.value}/${folderPath}`,
              children: []
            };
          }
          currentLevel.push(existingNode);
        }
        
        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      }
    }

    const sortNodes = (nodes: NavigationMenuItem[]) => {
      nodes.sort((a, b) => {
        const aIsDir = !!a.children;
        const bIsDir = !!b.children;
        if (aIsDir === bIsDir) return (a.label ?? '').localeCompare(b.label ?? '');
        return aIsDir ? -1 : 1;
      });
      nodes.forEach(n => {
        if (n.children) sortNodes(n.children);
      });
    };
    
    sortNodes(root);
    return root;
  });

  return links;
}