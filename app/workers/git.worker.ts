import * as Comlink from 'comlink';
import { Buffer } from 'buffer';
import { useGitRepoCache } from '~/composables/repo/useGitRepoCache';
import LightningFS from '@isomorphic-git/lightning-fs';
import git, { type WalkerEntry } from 'isomorphic-git';
import { resolveTreeCommitsAsync } from '~/utils/resolveTreeCommitsAsync';
import { syncBareRepo, wipeDir, updateBareRepo } from '~/utils/useFs';
import type { GitFile, GitCommit, InitRepoResponse } from '~~/shared/types/Git';
import type { Results } from '@riavzon/utils';
import * as Diff from 'diff';
import jszip from 'jszip';


if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}


export class GitWorkerClass {
  fsName: string;
  dir: string;
  corsProxy = '/api/git-proxy';
  repoUrl: string;
  cache: ReturnType<typeof useGitRepoCache>;
  fs: InstanceType<typeof LightningFS>;
  currentBranch: string | undefined;
  initialBranch?: string; 
  LOG_DEPTH_CAP = 1000;

  constructor(
    fsName: string,
    dir: string,
    repoUrl: string,
    initialBranch?: string
  ) {
    this.fsName = fsName;
    this.dir = dir;
    this.repoUrl = repoUrl;
    this.initialBranch = initialBranch;
    this.currentBranch = initialBranch;
    this.fs = new LightningFS(this.fsName);
    this.cache = useGitRepoCache(this.dir, this.fs, this.LOG_DEPTH_CAP);
  }

  async initRepo(
    onProgress?: (items: GitFile[], count: number, capped: boolean) => void, 
    branch?: string,
    isRetry = false
  ): Promise<InitRepoResponse> {
    try {
      if (branch) {
        this.currentBranch = branch;
      }
      
      const pfs = this.fs.promises;
      const exists = await pfs.stat(`${this.dir}/.cloned`).catch(() => null);
      if (!exists) {
        await wipeDir(pfs, this.dir);
        const syncResult = await syncBareRepo(pfs, this.repoUrl, this.dir);

        if (!syncResult.ok) {
          console.error(`[useGitRepo] syncBareRepo failed:`, syncResult.reason);
          return {
            ok: false,
            error: {
              statusCode: 404,
              message: 'Repository not found',
              data: {
                errorDescription: 'We could not clone or locate this repository.',
                image: '/assets/error-tree.png'
              }
            }
          };
        }
      } else {
        // returning visitor
        const updateResult = await updateBareRepo(pfs, this.repoUrl, this.dir);
        if (!updateResult.ok) {
          console.warn(`[useGitRepo] updateBareRepo failed (offline?):`, updateResult.reason);
        } else if (updateResult.data) {
          this.cache.clearCache();
        }
      }

      const branches = await git.listBranches({ fs: this.fs, dir: this.dir });
      this.currentBranch ??= branches.includes('main') ? 'main' : branches[0] ?? '';
      
      const tags = await git.listTags({ fs: this.fs, dir: this.dir });

      if (this.currentBranch) {
        try {
          await git.log({ fs: this.fs, dir: this.dir, ref: this.currentBranch, depth: 1, cache: this.cache.gitCache });
        } catch (e) {
          const errStr = e instanceof Error ? e.message : String(e);
          if (!isRetry && (errStr.includes('null') && errStr.includes('slice'))) {
            console.warn(`[useGitRepo] Detected IDB corruption (${errStr}). Wiping and retrying...`);
            await wipeDir(this.fs.promises, this.dir);
            this.cache.clearCache();
            return await this.initRepo(onProgress, this.currentBranch, true);
          }

          console.error(`[useGitRepo] Ref not found: ${this.currentBranch}`, e);
          return {
            ok: false,
            error: {
              statusCode: 404,
              message: 'Ref not found',
              data: {
                errorDescription: `The branch, tag, or commit '${this.currentBranch}' does not exist in this repository.`,
                image: '/assets/error-tree.png'
              }
            }
          };
        }
      }

      const fileList = await git.listFiles({ fs: this.fs, dir: this.dir, ref: this.currentBranch, cache: this.cache.gitCache });
      const allFiles = fileList;

      const fileMap = new Map<string, GitFile>();
      const dirSet = new Set<string>();

      for (const filePath of fileList) {
        const parts = filePath.split('/');

        if (parts.length > 1) {
          const dirName = String(parts[0]);
          if (!dirSet.has(dirName)) {
            dirSet.add(dirName);
            fileMap.set(dirName, {
              name: dirName,
              path: dirName,
              type: 'dir',
            });
          }
        } else {
          fileMap.set(filePath, {
            name: filePath,
            path: filePath,
            type: 'file',
          });
        }
      }

      const items = Array.from(fileMap.values()).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      const headLog = await git.log({ fs: this.fs, dir: this.dir, ref: this.currentBranch, depth: 1, cache: this.cache.gitCache });
      const headCommit = headLog[0];
      let lastCommit: GitCommit | null = null;
      if (headCommit) {
        lastCommit = {
          hash: headCommit.oid,
          message: headCommit.commit.message.trim(),
          author: headCommit.commit.author.name,
          email: headCommit.commit.author.email,
          date: new Date(headCommit.commit.author.timestamp * 1000),
          parentHash: headCommit.commit.parent[0],
        };
      }

      const licenseFile = "LICENSE";
      let license: string | null = null;
      if (fileList.includes(licenseFile)) {
        try {
          const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: this.currentBranch });
          const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: commitOid, filepath: licenseFile, cache: this.cache.gitCache });
          license = new TextDecoder().decode(blob);
        } catch { }
      }

      let readme: string | null = null;
      const readmeCandidates = ['README.md', 'readme.md', 'Readme.md'];
      for (const candidate of readmeCandidates) {
        if (fileList.includes(candidate)) {
          try {
            const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: this.currentBranch });
            const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: commitOid, filepath: candidate, cache: this.cache.gitCache });
            readme = new TextDecoder().decode(blob);
          } catch { }
          break;
        }
      }

      let commitCount = 0;
      let commitCountCapped = false;
      const headOid = headCommit?.oid;


      if (headOid) {
        void (async () => {
          const cached = await this.cache.loadCommitCacheFromIDB(this.currentBranch ?? '', headOid);
          if (cached) {
            for (const item of items) {
              const commit = cached.fileCommits[item.path];
              if (commit) {
                item.commit = { ...commit, date: new Date(commit.date) };
              }
            }
            commitCount = cached.commitCount;
            commitCountCapped = cached.capped;
            if (onProgress) onProgress(items, commitCount, commitCountCapped);
          } else {
            const allCommits = await this.cache.getCachedCommits(this.currentBranch ?? '');
            commitCount = allCommits.length;
            commitCountCapped = allCommits.length >= this.LOG_DEPTH_CAP;

            await resolveTreeCommitsAsync(items, allCommits, this.fs, this.dir, this.cache.gitCache);
            if (onProgress) onProgress(items, commitCount, commitCountCapped);

            void this.cache.saveCommitCacheToIDB(
              this.currentBranch ?? '',
              headOid,
              items,
              commitCount,
              commitCountCapped
            );
          }
        })();
      }

      return {
        ok: true,
        data: {
          branches,
          tags,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          currentBranch: this.currentBranch ?? '',
          files: items,
          allFiles,
          lastCommit,
          readme,
          license,
          commitCount,
          commitCountCapped
        }
      };

    } catch (e) {
      console.error('[useGitRepo] init error:', e);
      return {
        ok: false,
        error: {
          statusCode: 500,
          message: 'Internal Error',
          data: {
            errorDescription: e instanceof Error ? e.message : 'Failed to load repository',
            image: '/assets/error-tree.png'
          }
        }
      };
    }
  }

 async getPathCommit(filepath: string, branch?: string): Promise<Results<GitCommit>> {
    try {
      const ref = branch ?? this.currentBranch ?? '';
      const logs = await git.log({ fs: this.fs, dir: this.dir, filepath, depth: 1, ref, cache: this.cache.gitCache });
      const commit = logs[0];
      if (commit) {
        return {
          ok: true,
          date: new Date().toISOString(),
          data: {
            hash: commit.oid,
            message: commit.commit.message.trim(),
            author: commit.commit.author.name,
            email: commit.commit.author.email,
            date: new Date(commit.commit.author.timestamp * 1000),
            parentHash: commit.commit.parent[0],
          }
        };
      }
      return { 
        ok: false, 
        reason: `Commit not found for ${filepath}`, 
        date: new Date().toISOString() 
      };
    } catch (e) {
      return { 
        ok: false,
        reason: `Failed to fetch commit for ${filepath}: ${e instanceof Error ? e.message : String(e)}`,
        date: new Date().toISOString() 
      };
    }
  }

  async getFilesInFolder(
    folderPath: string | undefined,
    branch?: string,
    onProgress?: (items: GitFile[], isDone: boolean) => void,
    folderLastCommitHash?: string 
  ): Promise<Results<GitFile[]>> {
     // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
      const ref = branch ?? this.currentBranch as string;
      let searchCommits = await this.cache.getCachedCommits(ref);

      if (folderLastCommitHash) {
        const startIndex = searchCommits.findIndex(c => c.oid === folderLastCommitHash);
        if (startIndex > -1) {
          searchCommits = searchCommits.slice(startIndex);
        }
      }

      const treePath = folderPath ?? undefined;

     try {
      const cacheKey = `${ref}:${folderPath ?? ''}`;
      
      if (this.cache.folderCommitCache.has(cacheKey)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const cachedData = this.cache.folderCommitCache.get(cacheKey)!;
        if (onProgress) onProgress(cachedData, true);
        return {
          ok: true,
          data: cachedData,
          date: new Date().toISOString()
        };
      }

      const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref });
      
      const items: GitFile[] = [];
      try {
        const { tree } = await git.readTree({ 
          fs: this.fs, 
          dir: this.dir, 
          oid: commitOid, 
          filepath: folderPath ?? undefined, 
          cache: this.cache.gitCache 
        });

        const prefix = folderPath ? folderPath + '/' : '';
        for (const entry of tree) {
          if (entry.type === 'tree' || entry.type === 'blob') {
            items.push({
              name: entry.path,
              path: prefix + entry.path,
              type: entry.type === 'tree' ? 'dir' : 'file'
            });
          }
        }
      } catch {
        if (folderPath) {
          return { 
            ok: false, 
            reason: `Folder '${folderPath}' not found`, 
            date: new Date().toISOString() 
          };
        }
      }

      items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      if (onProgress) {
        onProgress(items, false);
      }

      const resolvePromise = async () => {
        try {
          await resolveTreeCommitsAsync(items, searchCommits, this.fs, this.dir, this.cache.gitCache, treePath, 'name');
          this.cache.folderCommitCache.set(cacheKey, items);
          if (onProgress) onProgress(items, true);
        } catch (e) {
          console.error(`[git.worker] Failed to resolve commits for ${folderPath ?? ''}:`, e);
          if (onProgress) onProgress(items, true);
        }
      };

      if (onProgress) {
        void resolvePromise();
        return { ok: true, data: items, date: new Date().toISOString() };
      } else {
        await resolvePromise();
        return { ok: true, data: items, date: new Date().toISOString() };
      }
      
     } catch(e) {
       return { 
         ok: false, 
         reason: `Failed to list files: ${e instanceof Error ? e.message : String(e)}`, 
         date: new Date().toISOString() 
       };
     }
    }

  async  getFileContent(filepath: string, branch?: string): Promise<Results<string>> {
       try {
         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
         const ref = branch ?? this.currentBranch!;
         const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref });
         const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: commitOid, filepath, cache: this.cache.gitCache });
         return { 
           ok: true, 
           data: new TextDecoder().decode(blob), 
           date: new Date().toISOString() 
         };
       } catch (e) {
         return { 
           ok: false, 
           reason: `Failed to fetch file content for ${filepath}: ${e instanceof Error ? e.message : String(e)}`, 
           date: new Date().toISOString() 
         };
       }
     } 

    async getFileBlob(filepath: string, branch?: string): Promise<Results<Uint8Array>> {
         try {
           // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
           const ref = branch ?? this.currentBranch!;
           const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref });
           const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: commitOid, filepath, cache: this.cache.gitCache });
           return { 
             ok: true, 
             data: blob, 
             date: new Date().toISOString() 
           };
         } catch (e) {
           return { 
             ok: false, 
             reason: `Failed to fetch file blob for ${filepath}: ${e instanceof Error ? e.message : String(e)}`, 
             date: new Date().toISOString() 
           };
         }
       }

    async getAllCommits(branch?: string, filepath?: string, capped = true): Promise<Results<GitCommit[]>> {
           try {
             // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
             const ref = branch ?? this.currentBranch!;
             const logs = filepath ? 
                 await git.log({ fs: this.fs, dir: this.dir, ref, filepath, cache: this.cache.gitCache })
               : await this.cache.getCachedCommits(ref, capped);
               
             return { 
               ok: true, 
               data: logs.map(commit => ({
                 hash: commit.oid,
                 message: commit.commit.message.trim(),
                 author: commit.commit.author.name,
                 email: commit.commit.author.email,
                 date: new Date(commit.commit.author.timestamp * 1000),
                 parentHash: commit.commit.parent[0],
               })), 
               date: new Date().toISOString() 
             };
           } catch (e) {
             return { 
               ok: false, 
               reason: `Failed to fetch commits: ${e instanceof Error ? e.message : String(e)}`, 
               date: new Date().toISOString() 
             };
           }
         }

    async getCommitDiff(oldCommitHash: string, newCommitHash: string): Promise<Results<{files: DiffFile[], stats: {filesChanged: number, insertions: number, deletions: number}}>> {
        
        const cacheKey = `${oldCommitHash}_${newCommitHash}`;
        if (this.cache.diffCache.has(cacheKey)) {
          return this.cache.diffCache.get(cacheKey) as Results<{files: DiffFile[], stats: {filesChanged: number, insertions: number, deletions: number}}>;
        }
    
        try {
         const fileStates = await git.walk({
            fs: this.fs,
            dir: this.dir,
            cache: this.cache.gitCache,
            trees: [git.TREE({ ref: oldCommitHash }), git.TREE({ ref: newCommitHash })],
            map: async function(
              filepath: string,
              [A, B]: (WalkerEntry | null)[]): Promise<FileDiffState | undefined>
               {
              if (filepath === '.') return;
              if ((await A?.type()) === 'tree' || (await B?.type()) === 'tree') return;
    
              const Aoid = await A?.oid();
              const Boid = await B?.oid();
    
              let type: 'equal' | 'modify' | 'add' | 'remove' = 'equal';
              if (Aoid !== Boid) {
                type = 'modify';
              }
              if (Aoid === undefined) {
                type = 'add';
              }
              if (Boid === undefined) {
                type = 'remove';
              }
    
              if (type === 'equal') return undefined;
              
              return {
                filepath,
                type,
                oldOid: Aoid,
                newOid: Boid
              };
            }
          }) as (FileDiffState | undefined)[];
    
      const changedFiles = fileStates.filter(Boolean);
      const validDiffs: DiffFile[] = [];
      
      let totalInsertions = 0;
      let totalDeletions = 0;
    
      for (let i = 0; i < changedFiles.length; i++) {
        const file = changedFiles[i];
        if (!file) continue;
    
    
        if (i > 0 && i % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
    
        let oldBlob: Uint8Array | null = null;
        let newBlob: Uint8Array | null = null;
    
        if (file.type === 'modify' || file.type === 'remove') {
          const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: file.oldOid ?? '', cache: this.cache.gitCache });
          oldBlob = blob;
        }
    
        if (file.type === 'modify' || file.type === 'add') {
          const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: file.newOid ?? '', cache: this.cache.gitCache });
          newBlob = blob;
        }
        
        const isBinary = (buffer: Uint8Array | null) => buffer ? buffer.slice(0, 8000).some(byte => byte === 0) : false;
        const fileIsBinary = isBinary(oldBlob) || isBinary(newBlob);
        const isTooLarge = (oldBlob?.byteLength ?? 0) > 5e+6 || (newBlob?.byteLength ?? 0) > 5e+6;
    
        if (fileIsBinary || isTooLarge) {
          validDiffs.push({
            path: file.filepath,
            type: file.type,
            oldOid: file.oldOid,
            newOid: file.newOid,
            isBinary: fileIsBinary,
            isTooLarge,
            oldSize: oldBlob?.byteLength,
            newSize: newBlob?.byteLength,
            patch: fileIsBinary ? 'Binary files differ' : 'Large files differ',
            hunks: [],
            diffLines: [],
            additions: 0,
            deletions: 0
          } as unknown as DiffFile);
          continue;
        }
    
        const oldText = oldBlob ? new TextDecoder('utf8').decode(oldBlob) : '';
        const newText = newBlob ? new TextDecoder('utf8').decode(newBlob) : '';
        const patch = Diff.createTwoFilesPatch(
          file.filepath,
          file.filepath,
          oldText,
          newText,
          `Commit ${oldCommitHash.substring(0, 7)}`,
          `Commit ${newCommitHash.substring(0, 7)}`
        );
    
        const structured = Diff.structuredPatch(
          file.filepath,
          file.filepath,
          oldText,
          newText,
          `Commit ${oldCommitHash.substring(0, 7)}`,
          `Commit ${newCommitHash.substring(0, 7)}`
        );
    
        const diffLines = Diff.diffLines(oldText, newText);
        let additions = 0;
        let deletions = 0;
        
        diffLines.forEach(part => {
          if (part.added) additions += part.count || 0;
          if (part.removed) deletions += part.count || 0;
        });
    
        totalInsertions += additions;
        totalDeletions += deletions;
    
        validDiffs.push({
          path: file.filepath,
          type: file.type,
          oldOid: file.oldOid,
          newOid: file.newOid,
          isBinary: false,
          oldSize: oldBlob?.byteLength,
          newSize: newBlob?.byteLength,
          patch,
          hunks: structured.hunks,
          diffLines,
          additions,
          deletions
        } as unknown as DiffFile);
      }
    
        const result = { 
          ok: true as const, 
          date: new Date().toISOString(), 
          data: {
            files: validDiffs,
            stats: {
              filesChanged: validDiffs.length,
              insertions: totalInsertions,
              deletions: totalDeletions
            }
          }
        };
        this.cache.diffCache.set(cacheKey, result);
        return result as Results<{files: DiffFile[], stats: {filesChanged: number, insertions: number, deletions: number}}>;
       } catch (e) {
          return { 
            ok: false, 
            reason: `Failed to fetch diff: ${e instanceof Error ? e.message : String(e)}`, 
            date: new Date().toISOString() 
          };
        }
      }

    async getCommitLog(ref: string, depth = 2): Promise<Results<GitCommit[]>> {
      try {
        const allLogs = await this.cache.getCachedCommits(ref);
        const logs = allLogs.slice(0, depth);
        return { 
          ok: true, 
          data: logs.map(commit => ({
            hash: commit.oid,
            message: commit.commit.message.trim(),
            author: commit.commit.author.name,
            email: commit.commit.author.email,
            date: new Date(commit.commit.author.timestamp * 1000),
            parentHash: commit.commit.parent[0],
          })), 
          date: new Date().toISOString() 
        };
      } catch (e) {
        return { 
          ok: false, 
          reason: `Failed to fetch commit log: ${e instanceof Error ? e.message : String(e)}`, 
          date: new Date().toISOString() 
        };
      }
    }

    async getCommitFiles(ref: string): Promise<Results<string[]>> {
      try {
        const fileList = await git.listFiles({ fs: this.fs, dir: this.dir, ref, cache: this.cache.gitCache });
        return {
          ok: true,
          data: fileList,
          date: new Date().toISOString()
        };
      } catch (e) {
        return {
          ok: false,
          reason: `Failed to list files: ${e instanceof Error ? e.message : String(e)}`,
          date: new Date().toISOString()
        };
      }
    }
      
  async downloadZip(branch?: string): Promise<Results<Uint8Array>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ref = branch ?? this.currentBranch!;
      const fileList = await git.listFiles({ fs: this.fs, dir: this.dir, ref, cache: this.cache.gitCache });
      const commitOid = await git.resolveRef({ fs: this.fs, dir: this.dir, ref });
      const zip = new jszip();

      for (const file of fileList) {
        const { blob } = await git.readBlob({ fs: this.fs, dir: this.dir, oid: commitOid, filepath: file, cache: this.cache.gitCache });
        zip.file(file, blob);
      }

      const zipData = await zip.generateAsync({ type: 'uint8array' });
      return Comlink.transfer(
        { ok: true, data: zipData, date: new Date().toISOString() },
        [zipData.buffer]
      );
    } catch (e) {
      return {
        ok: false,
        reason: `Failed to generate ZIP: ${e instanceof Error ? e.message : String(e)}`,
        date: new Date().toISOString()
      };
    }
  }

  async getCommitCount(branch?: string): Promise<Results<number>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const ref = branch ?? this.currentBranch!;
      const logs = await git.log({ fs: this.fs, dir: this.dir, ref, cache: this.cache.gitCache });
      return {
        ok: true,
        data: logs.length,
        date: new Date().toISOString()
      };
    } catch (e) {
      return {
        ok: false,
        reason: `Failed to fetch commit count: ${e instanceof Error ? e.message : String(e)}`,
        date: new Date().toISOString()
      };
    }
  }     
}

Comlink.expose(GitWorkerClass);