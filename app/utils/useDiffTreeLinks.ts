import type { NavigationMenuItem } from '@nuxt/ui';
import type { DiffFile } from '~~/shared/types/Git';
import { computed, type Ref } from 'vue';

export function useDiffTreeLinks(changedFiles: Ref<DiffFile[]>) {
  return computed(() => {
    const root: NavigationMenuItem[] = [];

    for (const file of changedFiles.value) {
      const parts = file.path.split('/');
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
              icon: file.type === 'add' ? 'i-lucide-file-plus' : file.type === 'remove' ? 'i-lucide-file-minus' : 'i-lucide-file-edit',
              class: file.type === 'add' ? 'text-green-400' : file.type === 'remove' ? 'text-red-400' : 'text-yellow-600',
              to: `#diff-${file.path}`,
              exact: false
            };
          } else {
            existingNode = {
              label: part,
              icon: 'i-lucide-folder',
              class: file.type === 'add' ? 'text-green-400' : file.type === 'remove' ? 'text-red-400' : 'text-yellow-600',
              defaultOpen: true, 
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
}
