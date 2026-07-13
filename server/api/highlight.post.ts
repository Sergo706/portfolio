import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { HighlighterCore } from 'shiki/core';
import { MiniCache } from '@riavzon/utils';

let highlightCache: MiniCache<string> | null = null;
let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= (async () => {
      const [theme, ...langs] = await Promise.all([
        import('shiki/themes/github-dark.mjs'),
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/mjs.mjs'),
        import('shiki/langs/mts.mjs'),
        import('shiki/langs/vue.mjs'),
        import('shiki/langs/diff.mjs'),
        import('shiki/langs/pascal.mjs'),
        import('shiki/langs/docker.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/c.mjs'),
        import('shiki/langs/makefile.mjs'),
        import('shiki/langs/cmake.mjs'),
        import('shiki/langs/perl.mjs'),
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

      return createHighlighterCore({
        themes: [theme.default],
        langs: langs.map(l => l.default),
        engine: createOnigurumaEngine(async () => {
          const wasm = await import('shiki/wasm');
          return wasm.default;
        })
      });
    })();
  return highlighterPromise;
}

function resolveLang(filePath: string) {
  const name = filePath.split('/').pop()?.toLowerCase() ?? '';
  if (name.endsWith('.md')) return 'md';
  if (name.endsWith('.svg')) return 'xml';
  if (name.startsWith('.env')) return 'dotenv';
  if (name.endsWith('.iss')) return 'bash';

  if (name.startsWith('.')) return 'bash';
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile') return 'makefile';
  if (name === 'cmakelists.txt') return 'cmake';
  if (!name.includes('.')) return 'bash';
  
  const ext = name.split('.').pop() ?? 'bash';
  if (ext === 'txt') return 'text';
  if (ext === 'pl' || ext === 'pm') return 'perl';
  
  const supported = ['ts', 'js', 'vue', 'diff', 'pascal', 'docker', 'c', 'makefile', 'perl', 'cmake', 'py', 'json', 'yml', 'yaml', 'dockerfile', 'dotenv', 'bash', 'sh', 'html', 'css', 'xml', 'md', 'sql', 'text'];
  return supported.includes(ext) ? ext : 'bash';
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

  const cacheKey = `${targetLang ?? 'bash'}:${code}`;
  const cachedHtml = highlightCache.get(cacheKey);
  
  if (cachedHtml) {
    return { html: cachedHtml };
  }

  try {
    const highlighter = await getHighlighter();
    const loadedLangs = highlighter.getLoadedLanguages();
    const safeLang = targetLang && loadedLangs.includes(targetLang) ? targetLang : 'bash';

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
