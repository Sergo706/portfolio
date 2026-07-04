import { Webhooks } from "@octokit/webhooks";
import type { PushEvent } from "@octokit/webhooks-types";

  
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const secret = config.webhookSecret;

  if (!secret) {
    console.error('Missing webhooks Secret');
    throw createError({
      statusCode: 500,
      statusMessage: 'Server error',
    });
  }

  const webhooks = new Webhooks({ secret });
  const signature = getHeader(event, "x-hub-signature-256");
  const textBody = await readRawBody(event, 'utf-8');

  if (!signature || !textBody) {
    setResponseStatus(event, 400, "Bad request");
    return;
  }

  if (!(await webhooks.verify(textBody, signature))) {
    setResponseStatus(event, 401, "Unauthorized");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const payload = JSON.parse(textBody);
  const pushPayload = payload as PushEvent;
  const isPublic = pushPayload.repository.public;
  const repoName = pushPayload.repository.name;

  
  if (!isPublic) {
    return { status: "ignored", reason: "private repo" };
  }

  const token = config.githubToken;
  const owner = pushPayload.repository.owner.login;
  const portfolioRepo = "portfolio"; 


  await $fetch(`https://api.github.com/repos/${owner}/${portfolioRepo}/actions/workflows/sync-repos.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: {
      ref: "main", 
      inputs: {
        repo: repoName,
      },
    },
  });

  console.log(`Triggered sync for ${repoName}`);
  return { status: "success", repo: repoName };
});
