import { MiniCache } from "@riavzon/utils";
import { createGitRepo } from "./createRepo";

let gitRepoCache: MiniCache<ReturnType<typeof createGitRepo>> | null = null;


export function useGitRepo(repoName: string, initialBranch?: string) {
  gitRepoCache ??= new MiniCache<ReturnType<typeof createGitRepo>>(10);
  let repo = gitRepoCache.get(repoName);
  if (!repo) {
    repo = createGitRepo(repoName, initialBranch);
    gitRepoCache.set(repoName, repo, Infinity);
  }

  if (initialBranch && !repo.currentBranch.value && !repo.loading.value) {
    repo.currentBranch.value = initialBranch;
  }
  return repo;
}