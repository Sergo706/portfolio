import type { ReadCommitResult } from 'isomorphic-git';
import type { CommitCacheEntry, GitFile, GitCommit, DiffFile } from '~~/shared/types/Git';
import type LightningFS from '@isomorphic-git/lightning-fs';
import type { Results } from '@riavzon/utils';
import git from 'isomorphic-git';


export function useGitRepoCache(dir: string, fs: LightningFS, LOG_DEPTH_CAP: number) {
    const commitLogCache = new Map<string, ReadCommitResult[]>();
    const diffCache = new Map<string, Results<{files: DiffFile[], stats: {filesChanged: number, insertions: number, deletions: number}}>>();
    const folderCommitCache = new Map<string, GitFile[]>();
    const gitCache: Record<string, unknown> = {};

    function clearCache() {
        for (const key of Object.keys(gitCache)) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete gitCache[key];
        }
        commitLogCache.clear();
        diffCache.clear();
        folderCommitCache.clear();
    };

    async function loadCommitCacheFromIDB(branch: string, headOid: string): Promise<CommitCacheEntry | null> {
        try {
          const pfs = fs.promises;
          const cachePath = `${dir}/.commit-cache-${branch}.json`;
          const data = await pfs.readFile(cachePath, { encoding: 'utf8' });
          const cached = JSON.parse(data) as CommitCacheEntry;
          if (cached.headOid === headOid) return cached;
          return null;
        } catch {
          return null;
        }
      }

    async function saveCommitCacheToIDB(branch: string, headOid: string, items: GitFile[], count: number, capped: boolean) {
          try {
            const pfs = fs.promises;
            const cachePath = `${dir}/.commit-cache-${branch}.json`;
            const fileCommits: Record<string, GitCommit> = {};
            for (const item of items) {
              if (item.commit) fileCommits[item.path] = item.commit;
            }
            const entry: CommitCacheEntry = { headOid, commitCount: count, capped, fileCommits };
            await pfs.writeFile(cachePath, JSON.stringify(entry));
          } catch {
                console.warn('Failed to write commit cache');
          }
    }

    async function getCachedCommits(ref: string, capped = true): Promise<ReadCommitResult[]> {
        const cached = commitLogCache.get(ref);
        if (cached) {
            if (capped || cached.length < LOG_DEPTH_CAP || cached[cached.length - 1]?.commit.parent.length === 0) {
                return cached;
            }
        }
        
        const commits = await git.log({ 
            fs, 
            dir, 
            ref, 
            ...(capped ? { depth: LOG_DEPTH_CAP } : {}), 
            cache: gitCache 
        });
        
        commitLogCache.set(ref, commits);
        return commits;
    }

  return {
    clearCache,
    gitCache,
    commitLogCache,
    loadCommitCacheFromIDB,
    saveCommitCacheToIDB,
    getCachedCommits,
    diffCache,
    folderCommitCache
  };
}