/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import type { R2Bucket } from "@cloudflare/workers-types";
import fs from "node:fs";
import path from "node:path";

export default defineEventHandler(async (event) => {
  const filePath = event.context.params?.path;
  
  if (!filePath) {
    throw createError({ statusCode: 400, message: 'Missing file path' });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const bucket = event.context.cloudflare?.env?.R2_BUCKET as R2Bucket | undefined;
  
  if (!bucket) {
    const config = useRuntimeConfig();
    const baseDir = config.reposDir ? path.resolve(String(config.reposDir)) : path.resolve(process.cwd(), 'repos');
    const localPath = path.resolve(baseDir, filePath);
    
    if (!localPath.startsWith(baseDir)) {
      throw createError({ statusCode: 403, message: 'Forbidden' });
    }

      let resolvedPath = localPath;
      if (!fs.existsSync(resolvedPath)) {
        const parts = filePath.split('/');
        const repoFolder = parts[0];
        
        if (repoFolder) {
          const reposDirEntries = fs.readdirSync(baseDir);
          const matchedRepoFolder = reposDirEntries.find(
            (entry) => entry.toLowerCase() === repoFolder.toLowerCase()
          );
          
          if (matchedRepoFolder) {
            parts[0] = matchedRepoFolder;
            resolvedPath = path.resolve(baseDir, parts.join('/'));
          }
        }
      }

    if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
      throw createError({ statusCode: 404, message: 'Not Found' });
    }
    
    return sendStream(event, fs.createReadStream(resolvedPath));
  }

  const key = `repos/${filePath}`;
  const object = await bucket.get(key);

  if (!object) {
    throw createError({ statusCode: 404, message: 'Not Found' });
  }

  setResponseHeader(event, 'etag', object.httpEtag);
  const isPackFile = filePath.match(/objects\/pack\/pack-[a-f0-9]{40}\.(pack|idx|rev)$/);
  const isLooseObject = filePath.match(/objects\/[a-f0-9]{2}\/[a-f0-9]{38}$/);
  
  if (isPackFile || isLooseObject) {
    setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable');
  } else {
    setResponseHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=86400');
  }

  if (object.httpMetadata?.contentType) {
      setResponseHeader(event, 'content-type', object.httpMetadata.contentType);
  }

  return sendStream(event, object.body as ReadableStream);
});