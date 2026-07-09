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
    patch?: string;
    hunks?: Diff.StructuredPatchHunk[];
    diffLines?: Diff.ChangeObject<string>[];
    additions?: number;
    deletions?: number;
}