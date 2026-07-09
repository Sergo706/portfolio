import type { PushEvent } from "@octokit/webhooks-types";

async function verifyGitHubSignature(secret: string, payload: string, signature: string) {
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
 
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const expectedSignature = `sha256=${hashHex}`;

  console.log("====== WEBHOOK VERIFICATION DEBUG ======");
  console.log("Secret Length:", secret.length);
  console.log("Payload Length:", payload.length);
  console.log("Received Signature:", signature);
  console.log("Calculated Signature:", expectedSignature);
  console.log("Exact Match:", signature === expectedSignature);
  console.log("Payload snippet (first 100 chars):", payload.substring(0, 100).replace(/\n/g, '\\n'));
  console.log("========================================");

  return signature === expectedSignature;
}

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

  const signature = getHeader(event, "x-hub-signature-256");
  const textBody = await readRawBody(event, 'utf-8');

  if (!signature || !textBody) {
    console.log("Signature mismatch", {
      received: signature,
      secretLength: secret.length,
      bodyLength: textBody.length,
    });
    setResponseStatus(event, 400, "Bad request");
    return;
  }

  const isValid = await verifyGitHubSignature(secret, textBody, signature);

  if (!isValid) {
    setResponseStatus(event, 401, "Unauthorized");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const payload = JSON.parse(textBody);
  const pushPayload = payload as PushEvent;
  const isPrivate = pushPayload.repository.private;
  const repoName = pushPayload.repository.name;

  
  if (isPrivate) {
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
