/* eslint-disable @typescript-eslint/no-non-null-assertion */
import git, { type ReadCommitResult, type TreeEntry } from 'isomorphic-git';
import type LightningFS from '@isomorphic-git/lightning-fs';
import type { GitFile } from '~~/shared/types/Git';


export async function resolveTreeCommitsAsync(
    items: GitFile[],
    allCommits: ReadCommitResult[],
    fs: LightningFS,
    dir: string,
    gitCache: object,
    treePath?: string,
    keyField: 'path' | 'name' = 'path',
    parsedTreeCache?: Map<string, Promise<TreeEntry[]>>
  ): Promise<void> {
    const unresolvedKeys = new Set(items.map(i => i[keyField]));
    const itemsByKey = new Map(items.map(i => [i[keyField], i]));

    let iteration = 0;

    const getTreeByOid = (oid: string): Promise<TreeEntry[]> => {
      if (parsedTreeCache?.has(oid)) return parsedTreeCache.get(oid)!;
      const promise = git.readTree({ fs, dir, oid, cache: gitCache }).then(res => res.tree).catch(() => []);
      if (parsedTreeCache) parsedTreeCache.set(oid, promise);
      return promise;
    };

    const folderTreeCache = new Map<string, Promise<{ oid: string, tree: TreeEntry[] } | null>>();

    const getFolderTree = (commitOid: string) => {
      if (folderTreeCache.has(commitOid)) return folderTreeCache.get(commitOid)!;
      
      const promise = (async () => {
        try {
          let currentOid = commitOid;
          if (treePath) {
            const parts = treePath.split('/');
            for (const part of parts) {
              const tree = await getTreeByOid(currentOid);
              const entry = tree.find(e => e.path === part);
              if (!entry) return null;
              currentOid = entry.oid;
            }
          }
          const tree = await getTreeByOid(currentOid);
          return { oid: currentOid, tree };
        } catch {
          return null;
        }
      })();
      
      folderTreeCache.set(commitOid, promise);
      return promise;
    };

    for (const commit of allCommits) {
      if (unresolvedKeys.size === 0) break;

      if (++iteration % 25 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      try {
        const currentTreeData = await getFolderTree(commit.oid);
        const currentTreeOid = currentTreeData?.oid;

        const parentOid = commit.commit.parent[0];
        const parentTreeData = parentOid ? await getFolderTree(parentOid) : null;
        const parentTreeOid = parentTreeData?.oid;

        if (currentTreeOid === parentTreeOid) continue;
        

        const currentTree = currentTreeData?.tree;
        const parentTree = parentTreeData?.tree;

        const currentMap = new Map(currentTree?.map(e => [e.path, e.oid]) ?? []);
        const parentMap = new Map(parentTree?.map(e => [e.path, e.oid]) ?? []);

        for (const key of unresolvedKeys) {
          const currentOid = currentMap.get(key);
          const parentOidForEntry = parentMap.get(key);

          if (currentOid !== parentOidForEntry) {
            const item = itemsByKey.get(key);
            if (item) {
              item.commit = {
                hash: commit.oid,
                message: commit.commit.message.trim(),
                author: commit.commit.author.name,
                email: commit.commit.author.email,
                date: new Date(commit.commit.author.timestamp * 1000),
                parentHash: commit.commit.parent[0],
              };
              unresolvedKeys.delete(key);
            }
          }
        }
      } catch {
      }
    }
  }