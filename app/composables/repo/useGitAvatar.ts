import { computed } from 'vue';
import type { Ref } from 'vue';
import type { GitCommit } from '~~/shared/types/Git';

export function useGitAvatar(commitRef: Ref<GitCommit | null>) {
  return computed(() => {
    const commit = commitRef.value;
    if (!commit?.email) return '';

    const email = commit.email.trim().toLowerCase();

    if (email.endsWith('@users.noreply.github.com')) {
      // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
      const match = email.match(/^(?:[0-9]+\+)?([^@]+)@/);
      if (match?.[1]) {
        const username = match[1];
        return `https://unavatar.io/github/${username}`;
      }
    }

    return `https://unavatar.io/${email}?fallback=https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp`;
  });
}