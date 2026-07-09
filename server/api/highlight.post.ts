import { createHighlighter, type Highlighter } from 'shiki';
import { MiniCache } from '@riavzon/utils';

let highlighter: Highlighter | null = null;
const highlightCache = new MiniCache<string>(500);

const SUPPORTED_LANGS = [
  'ts', 'js', 'mjs', 'mts', 'vue', 'diff', 'pascal', 'docker', 'py',
  'json', 'yml', 'yaml', 'dockerfile', 'dotenv', 'bash', 'sh', 'html',
  'css', 'xml', 'md', 'sql'
];

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
  
  const cacheKey = `${targetLang ?? 'text'}:${code}`;
  const cachedHtml = highlightCache.get(cacheKey);
  
  if (cachedHtml) {
    return { html: cachedHtml };
  }

  if (!highlighter) {
    try {
      highlighter = await createHighlighter({
        themes: ['github-dark'],
        langs: SUPPORTED_LANGS
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
