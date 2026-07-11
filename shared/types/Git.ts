import * as Diff from 'diff';

export interface GitFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  commit?: GitCommit;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  parentHash?: string;
}

export interface FileDiffState {
  filepath: string;
  type: 'equal' | 'modify' | 'add' | 'remove';
  oldOid?: string;
  newOid?: string;
}
export interface DiffFile {
    path: string;
    type: "equal" | "modify" | "add" | "remove";
    oldOid?: string | undefined;
    newOid?: string | undefined;
    isBinary?: boolean;
    isTooLarge?: boolean;
    oldSize?: number;
    newSize?: number;
    patch?: string;
    hunks?: Diff.StructuredPatchHunk[];
    diffLines?: Diff.ChangeObject<string>[];
    additions?: number;
    deletions?: number;
}
export interface GitRepoError {
  statusCode: number;
  message: string;
  data: {
    errorDescription?: string;
    image?: string;
  };
}
export interface CommitCacheEntry {
  headOid: string;
  commitCount: number;
  capped: boolean;
  fileCommits: Record<string, GitCommit>;
}
export interface InitRepoSuccess {
  branches: string[];
  tags: string[];
  currentBranch: string;
  files: GitFile[];
  allFiles: string[];
  lastCommit: GitCommit | null;
  license: string | null;
  readme: string | null;
  commitCount: number;
  commitCountCapped: boolean;
}

export type InitRepoResponse = 
  | { ok: true; data: InitRepoSuccess }
  | { ok: false; error: GitRepoError };