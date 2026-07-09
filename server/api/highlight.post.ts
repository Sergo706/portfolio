import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { HighlighterCore } from 'shiki/core';
import { MiniCache } from '@riavzon/utils';

let highlighter: HighlighterCore | null = null;
let highlightCache: MiniCache<string> | null = null;

async function loadLangs() {
  return Promise.all([
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/javascript.mjs'),
    import('shiki/langs/mjs.mjs'),
    import('shiki/langs/mts.mjs'),
    import('shiki/langs/vue.mjs'),
    import('shiki/langs/diff.mjs'),
    import('shiki/langs/pascal.mjs'),
    import('shiki/langs/docker.mjs'),
    import('shiki/langs/python.mjs'),
    import('shiki/langs/json.mjs'),
    import('shiki/langs/yml.mjs'),
    import('shiki/langs/yaml.mjs'),
    import('shiki/langs/dockerfile.mjs'),
    import('shiki/langs/dotenv.mjs'),
    import('shiki/langs/bash.mjs'),
    import('shiki/langs/sh.mjs'),
    import('shiki/langs/html.mjs'),
    import('shiki/langs/css.mjs'),
    import('shiki/langs/xml.mjs'),
    import('shiki/langs/markdown.mjs'),
    import('shiki/langs/sql.mjs')
  ]);
}

function resolveLang(filePath: string) {
  const name = filePath.split('/').pop()?.toLowerCase() ?? '';
  if (name.endsWith('.md')) return 'md';
  if (name.endsWith('.svg')) return 'xml';
  if (name.startsWith('.env')) return 'dotenv';
  if (name.endsWith('.iss')) return 'bash';

  if (name.startsWith('.')) return 'bash';
  if (name === 'dockerfile') return 'dockerfile';
  return name.split('.').pop() ?? 'text';
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
  
  const body = await readBody<{ code: string; filePath?: string; lang?: string }>(event);
  const { code, filePath, lang } = body;

  let targetLang = lang;
  if (filePath) {
    targetLang = resolveLang(filePath);
  }
  
  highlightCache ??= new MiniCache<string>(500);

  const cacheKey = `${targetLang ?? 'text'}:${code}`;
  const cachedHtml = highlightCache.get(cacheKey);
  
  if (cachedHtml) {
    return { html: cachedHtml };
  }

  if (!highlighter) {
    try {
      highlighter = await createHighlighterCore({
        themes: [
          await import('shiki/themes/github-dark.mjs')
        ],
        langs: await loadLangs(),
        engine: createOnigurumaEngine(import('shiki/wasm').then(m => m.default))
      });
    } catch (e) {
      console.error('Failed to init shiki', e);
      return { html: '' };
    }
  }

  try {
    const loadedLangs = highlighter.getLoadedLanguages();
    const safeLang = targetLang && loadedLangs.includes(targetLang) ? targetLang : 'text';

    const html = highlighter.codeToHtml(code, {
      lang: safeLang,
      theme: 'github-dark'
    });

    highlightCache.set(cacheKey, html, Infinity);

    return { html };
  } catch (e) {
    console.error('Highlight error', e);
    return { html: '' };
  }
});
