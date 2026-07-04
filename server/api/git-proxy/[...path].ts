import type { R2Bucket } from "@cloudflare/workers-types";

export default defineEventHandler(async (event) => {
  const filePath = event.context.params?.path;
  
  if (!filePath) {
    throw createError({ statusCode: 400, message: 'Missing file path' });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const bucket = event.context.cloudflare?.env?.R2_BUCKET as R2Bucket | undefined;
  if (!bucket) {
    console.log("The R2 binding is missing");
    throw createError({ statusCode: 500, message: 'Server Error' });
  }

  const key = `repos/${filePath}`;
  const object = await bucket.get(key);

  if (!object) {
    throw createError({ statusCode: 404, message: 'Not Found' });
  }

  setResponseHeader(event, 'etag', object.httpEtag);
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable');
  if (object.httpMetadata?.contentType) {
      setResponseHeader(event, 'content-type', object.httpMetadata.contentType);
  }

  return sendStream(event, object.body as ReadableStream);
});