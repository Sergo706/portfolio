import git from 'isomorphic-git';
import LightningFS from '@isomorphic-git/lightning-fs';
import { syncBareRepo, wipeDir } from '~/utils/useFs';
import type { GitFile, GitCommit } from '~~/shared/types/Git';

export function useGitRepo(repoName: string, initialBranch?: string) {
  const files = ref<GitFile[]>([]);
  const allFiles = ref<string[]>([]);
  const lastCommit = ref<GitCommit | null>(null);
  const commitCount = ref<number | null>(null);
  const readme = ref<string | null>(null);
  const license = ref<string | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const currentBranch = ref<string>(initialBranch ?? '');
  const branches = ref<string[]>([]);
  const tags = ref<string[]>();
  
  const route = useRoute();
  const router = useRouter();

  const fsName = `portfolio-${repoName}`;
  const dir = `/${repoName}`;
  const corsProxy = '/api/git-proxy';
  const repoUrl = import.meta.client ? `${window.location.origin}${corsProxy}/${repoName}.git` : '';
  const fs = new LightningFS(fsName);

  async function init() {
    loading.value = true;
    error.value = null;

    try {
      const pfs = fs.promises;
      const exists = await pfs.stat(`${dir}/.cloned`).catch(() => null);
      if (!exists) {
          await wipeDir(pfs, dir);
          await syncBareRepo(pfs, repoUrl, dir);
      }

      branches.value = await git.listBranches({ fs, dir });

      if (!currentBranch.value) {
        currentBranch.value = branches.value.includes('main') ? 'main' : branches.value[0] ?? ''; 
      }

      tags.value = await git.listTags({ fs, dir });

      const fileList = await git.listFiles({ fs, dir, ref: currentBranch.value });
      allFiles.value = fileList;
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

      await Promise.all(items.map(async (item) => {
        try {
          const logs = await git.log({ fs, dir, filepath: item.path, depth: 1, ref: currentBranch.value });
          const commit = logs[0];
          if (commit) {
            item.commit = {
              hash: commit.oid,
              message: commit.commit.message.trim(),
              author: commit.commit.author.name,
              email: commit.commit.author.email,
              date: new Date(commit.commit.author.timestamp * 1000),
            };
          }
        } catch (e) {
          console.warn(`Failed to fetch log for ${item.path}`, e);
        }
      }));

      files.value = items;

      const repoLogs = await git.log({ fs, dir, ref: currentBranch.value });
      commitCount.value = repoLogs.length;

      const repoCommit = repoLogs[0];
      if (repoCommit) {
        lastCommit.value = {
          hash: repoCommit.oid,
          message: repoCommit.commit.message.trim(),
          author: repoCommit.commit.author.name,
          email: repoCommit.commit.author.email,
          date: new Date(repoCommit.commit.author.timestamp * 1000),
        };
      }

      const licenseFile = "LICENSE";
      if (fileList.includes(licenseFile)) {
        try {
          const commitOid = await git.resolveRef({ fs, dir, ref: currentBranch.value });
          const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath: licenseFile });
          license.value = new TextDecoder().decode(blob);
        } catch { }
      }

      const readmeCandidates = ['README.md', 'readme.md', 'Readme.md'];
      for (const candidate of readmeCandidates) {
        if (fileList.includes(candidate)) {
          try {
            const commitOid = await git.resolveRef({ fs, dir, ref: currentBranch.value });
            const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath: candidate });
            readme.value = new TextDecoder().decode(blob);
          } catch { }
          break;
        }
      }

    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load repository';
      console.error('useGitRepo error:', e);
    } finally {
      loading.value = false;
    }
  }

  if (import.meta.client) {
    void init();
  }


  async function switchBranch(branchName: string) {
    if (branchName === currentBranch.value) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (route && router) {
      const slug = Array.isArray(route.params.slug) ? route.params.slug : [route.params.slug];
      const viewType = slug[1] ?? 'main';
      
      if (['tree', 'blob', 'commits'].includes(viewType)) {
        const newSlug = [...slug];
        newSlug[2] = branchName;
        void router.push(`/repo/${repoName}/${newSlug.slice(1).join('/')}`);
      } else {
        void router.push(`/repo/${repoName}/tree/${branchName}`);
      }
    }

    currentBranch.value = branchName;
    await init();
  }

  async function getPathCommit(filepath: string, branch?: string): Promise<GitCommit | null> {
    try {
      const ref = branch ?? currentBranch.value;
      const logs = await git.log({ fs, dir, filepath, depth: 1, ref });
      const commit = logs[0];
      if (commit) {
        return {
          hash: commit.oid,
          message: commit.commit.message.trim(),
          author: commit.commit.author.name,
          email: commit.commit.author.email,
          date: new Date(commit.commit.author.timestamp * 1000),
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch commit for ${filepath}`, e);
    }
    return null;
  }

  async function getFilesInFolder(folderPath: string | undefined, branch?: string): Promise<GitFile[]> {
    const ref = branch ?? currentBranch.value;
    const fileList = await git.listFiles({ fs, dir, ref }).catch(() => [] as string[]);
    
    const prefix = folderPath ? folderPath + '/' : '';
    const fileMap = new Map<string, GitFile>();
    const dirSet = new Set<string>();

    for (const f of fileList) {
      if (prefix && !f.startsWith(prefix)) continue;
      const rest = prefix ? f.slice(prefix.length) : f;
      const parts = rest.split('/');

      if (parts.length > 1) {
        const dirName = parts[0];
        if (dirName && !dirSet.has(dirName)) {
          dirSet.add(dirName);
          fileMap.set(dirName, {
            name: dirName,
            path: prefix + dirName,
            type: 'dir',
          });
        }
      } else {
        fileMap.set(rest, {
          name: rest,
          path: f,
          type: 'file',
        });
      }
    }

    const items = Array.from(fileMap.values()).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });

    await Promise.all(items.map(async (item) => {
      try {
        const logs = await git.log({ fs, dir, filepath: item.path, depth: 1, ref });
        const commit = logs[0];
        if (commit) {
          item.commit = {
            hash: commit.oid,
            message: commit.commit.message.trim(),
            author: commit.commit.author.name,
            email: commit.commit.author.email,
            date: new Date(commit.commit.author.timestamp * 1000),
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch log for ${item.path}`, e);
      }
    }));

    return items;
  }
  
  async function getFileContent(filepath: string, branch?: string): Promise<string | null> {
    try {
      const ref = branch ?? currentBranch.value;
      const commitOid = await git.resolveRef({ fs, dir, ref });
      const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath });
      return new TextDecoder().decode(blob);
    } catch (e) {
      console.warn(`Failed to fetch file content for ${filepath}`, e);
      return null;
    }
  }

  async function getFileBlob(filepath: string, branch?: string): Promise<Uint8Array | null> {
    try {
      const ref = branch ?? currentBranch.value;
      const commitOid = await git.resolveRef({ fs, dir, ref });
      const { blob } = await git.readBlob({ fs, dir, oid: commitOid, filepath });
      return blob;
    } catch (e) {
      console.warn(`Failed to fetch file blob for ${filepath}`, e);
      return null;
    }
  }

  async function getAllCommits(branch?: string, filepath?: string): Promise<GitCommit[]> {
    try {
      const ref = branch ?? currentBranch.value;
      const logs = await git.log({ fs, dir, ref, filepath: filepath ?? undefined });
      return logs.map(commit => ({
        hash: commit.oid,
        message: commit.commit.message.trim(),
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        date: new Date(commit.commit.author.timestamp * 1000),
      }));
    } catch (e) {
      console.warn(`Failed to fetch all commits for ${String(branch)}`, e);
      return [];
    }
  }

  return {
    files,
    allFiles,
    lastCommit,
    commitCount,
    readme,
    license,
    loading,
    error,
    refresh: init,
    switchBranch,
    currentBranch,
    branches,
    tags,
    fs,
    dir,
    git,
    repoName,
    getPathCommit,
    getFilesInFolder,
    getFileContent,
    getFileBlob,
    getAllCommits,
  };
}