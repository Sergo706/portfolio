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
}
