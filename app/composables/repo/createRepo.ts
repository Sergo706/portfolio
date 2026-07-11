import type { GitFile, GitCommit, DiffFile, GitRepoError } from '~~/shared/types/Git';
import type { GitWorkerClass } from '~/workers/git.worker';
import GitWorkerInstance from '~/workers/git.worker?worker';
import type { Results } from '@riavzon/utils';
import * as Comlink from 'comlink';


export function createGitRepo(repoName: string, initialBranch?: string) {
  const files = ref<GitFile[]>([]);
  const allFiles = ref<string[]>([]);
  const lastCommit = ref<GitCommit | null>(null);
  const commitCount = ref<number | null>(null);
  const commitCountCapped = ref(false);
  const isResolvingCommits = ref(true);
  const readme = ref<string | null>(null);
  const license = ref<string | null>(null);
  const loading = ref(true);
  const error = ref<GitRepoError | null>(null);
  const currentBranch = ref<string>(initialBranch ?? '');
  const branches = ref<string[]>([]);
  const tags = ref<string[]>();
  
  const router = useRouter();

  const fsName = `portfolio-${repoName}`;
  const dir = `/${repoName}`;
  const corsProxy = '/api/git-proxy';
  const repoUrl = import.meta.client ? `${window.location.origin}${corsProxy}/${repoName}.git` : '';
  
  let nativeWorker: Worker | null = null;
  let remoteWorker: Comlink.Remote<typeof GitWorkerClass> | null = null;
  let gitRepoInstance: Comlink.Remote<GitWorkerClass> | null = null;

  async function init() {
    if (!import.meta.client) return;
    
    loading.value = true;
    error.value = null;

    try {
      if (!gitRepoInstance) {
        nativeWorker = new GitWorkerInstance();
        remoteWorker = Comlink.wrap<typeof GitWorkerClass>(nativeWorker);
        gitRepoInstance = await new remoteWorker(fsName, dir, repoUrl, initialBranch);
      }

    const onProgressProxy = Comlink.proxy((updatedFiles: GitFile[], count: number, capped: boolean) => {
        files.value = updatedFiles;
        commitCount.value = count;
        commitCountCapped.value = capped;
        isResolvingCommits.value = false;
      });

    const response = await gitRepoInstance.initRepo(onProgressProxy, currentBranch.value);


      if (!response.ok) {
        error.value = response.error;
        return;
      }

      const treeData = response.data;
      branches.value = treeData.branches;
      tags.value = treeData.tags;
      currentBranch.value = treeData.currentBranch;
      files.value = treeData.files;
      allFiles.value = treeData.allFiles;
      lastCommit.value = treeData.lastCommit;
      readme.value = treeData.readme;
      license.value = treeData.license;
      commitCount.value = treeData.commitCount;
      commitCountCapped.value = treeData.commitCountCapped;
      
      if (!treeData.lastCommit) {
        isResolvingCommits.value = false;
      }

    } catch (e) {
      console.error('[useGitRepo] init error:', e);
      error.value = {
        statusCode: 500,
        message: 'Internal Error',
        data: {
          errorDescription: e instanceof Error ? e.message : 'Failed to load repository',
          image: '/assets/error-tree.png'
        }
      };
    } finally {
      loading.value = false;
    }
  }

  if (import.meta.client) {
    void init();
  }


async function switchBranch(branchName: string, skipRoute = false) {
    if (branchName === currentBranch.value) return;
    
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!skipRoute && router) {
      const currentPath = router.currentRoute.value.path;
      
      const parts = currentPath.split('/').filter(Boolean);
      const viewType = parts[2] ?? '';
      let newPath = '';

      if (['tree', 'blob', 'commits', 'commit'].includes(viewType)) {
        parts[3] = branchName;
        newPath = '/' + parts.join('/');
      } else {
        newPath = `/repo/${repoName}/tree/${branchName}`;
      }

      if (currentPath !== newPath) {
        void router.push(newPath);
      }
    }

    currentBranch.value = branchName;
    await init();
  }

  async function getPathCommit(filepath: string, branch?: string): Promise<Results<GitCommit>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getPathCommit(filepath, branch ?? currentBranch.value);
  }

  async function getFilesInFolder(folderPath: string | null, branch?: string, onProgress?: (items: GitFile[], complete: boolean) => void, folderLastCommitHash?: string): Promise<Results<GitFile[]>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getFilesInFolder(folderPath ?? undefined, branch ?? currentBranch.value, onProgress ? Comlink.proxy(onProgress) : undefined, folderLastCommitHash);
  }

  async function getFileContent(filepath: string, branch?: string): Promise<Results<string>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getFileContent(filepath, branch ?? currentBranch.value);
  }

  async function getFileBlob(filepath: string, branch?: string): Promise<Results<Uint8Array>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getFileBlob(filepath, branch ?? currentBranch.value);
  }

  async function getAllCommits(branch?: string, filepath?: string, capped = true): Promise<Results<GitCommit[]>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getAllCommits(branch ?? currentBranch.value, filepath, capped);
  }

  async function getCommitDiff(oldCommitHash: string, newCommitHash: string): Promise<Results<{files: DiffFile[], stats: {filesChanged: number, insertions: number, deletions: number}}>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getCommitDiff(oldCommitHash, newCommitHash);
  }

  async function getCommitCount(branch?: string): Promise<Results<number>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.getCommitCount(branch ?? currentBranch.value);
  }

  async function downloadZip(branch?: string): Promise<Results<Uint8Array>> {
    if (!gitRepoInstance) {
      return { 
        ok: false, 
        reason: 'Worker not initialized', 
        date: new Date().toISOString() 
      };
    }
    return await gitRepoInstance.downloadZip(branch ?? currentBranch.value);
  }
  async function getCommitLog(ref: string, depth = 2): Promise<Results<GitCommit[]>> {
    if (!gitRepoInstance) {
      return { ok: false, reason: 'Worker not initialized', date: new Date().toISOString() };
    }
    return await gitRepoInstance.getCommitLog(ref, depth);
  }

  async function getCommitFiles(ref: string): Promise<Results<string[]>> {
    if (!gitRepoInstance) {
      return { ok: false, reason: 'Worker not initialized', date: new Date().toISOString() };
    }
    return await gitRepoInstance.getCommitFiles(ref);
  }

  return {
    files,
    allFiles,
    lastCommit,
    commitCount,
    commitCountCapped,
    isResolvingCommits,
    readme,
    license,
    loading,
    error,
    refresh: init,
    switchBranch,
    currentBranch,
    branches,
    tags,
    repoName,
    getPathCommit,
    getFilesInFolder,
    getFileContent,
    getFileBlob,
    getAllCommits,
    getCommitDiff,
    getCommitCount,
    downloadZip,
    getCommitLog,
    getCommitFiles
  };
}