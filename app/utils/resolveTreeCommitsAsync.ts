import git, { type ReadCommitResult } from 'isomorphic-git';
import type LightningFS from '@isomorphic-git/lightning-fs';


export async function resolveTreeCommitsAsync(
    items: GitFile[],
    allCommits: ReadCommitResult[],
    fs: LightningFS,
    dir: string,
    gitCache: object,
    treePath?: string,
    keyField: 'path' | 'name' = 'path',
  ): Promise<void> {
    const unresolvedKeys = new Set(items.map(i => i[keyField]));
    const itemsByKey = new Map(items.map(i => [i[keyField], i]));

    let iteration = 0;

    for (const commit of allCommits) {
      if (unresolvedKeys.size === 0) break;

      if (++iteration % 25 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      try {
        const { tree: currentTree } = await git.readTree({ fs, dir, oid: commit.oid, filepath: treePath, cache: gitCache });
        const currentMap = new Map(currentTree.map(e => [e.path, e.oid]));

        const parentOid = commit.commit.parent[0];
        let parentMap: Map<string, string>;

        if (parentOid) {
          try {
            const { tree: parentTree } = await git.readTree({ fs, dir, oid: parentOid, filepath: treePath, cache: gitCache });
            parentMap = new Map(parentTree.map(e => [e.path, e.oid]));
          } catch {
            parentMap = new Map();
          }
        } else {
          parentMap = new Map();
        }

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