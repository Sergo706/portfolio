/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Change } from 'diff';
import { MiniCache } from '@riavzon/utils';

export interface DiffCell {
  type: string;
  text: string;
  lineNum: number | null;
  words?: Change[];
  html?: string;
}

export interface SplitRow {
  isHunkHeader?: boolean;
  text?: string;
  left?: DiffCell | null;
  right?: DiffCell | null;
}

export interface UnifiedRow {
  type: string;
  text: string;
  oldLineNum: number | null;
  newLineNum: number | null;
  words?: Change[];
  html?: string;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


let highlightMergeCache: MiniCache<string> | null = null;

export function mergeShikiWithDiff(
  shikiHtml: string, 
  diffWords: Change[] | undefined, 
  diffType: 'added' | 'removed'
): string {
  if (!diffWords || diffWords.length === 0) return shikiHtml;

  const cacheKey = `${shikiHtml}|${diffType}|${JSON.stringify(diffWords)}`;

  highlightMergeCache ??= new MiniCache<string>(5000);

  const cached = highlightMergeCache.get(cacheKey);
  if (cached) return cached;

  // parse shiki html into flat tokens
  const div = document.createElement('div');
  div.innerHTML = shikiHtml;
  
  const tokens: { attrs: string, text: string }[] = [];
  for (const child of Array.from(div.childNodes)) {

    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent) tokens.push({ attrs: '', text: child.textContent });

    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
      if (el.textContent) tokens.push({ attrs, text: el.textContent });
    }
  }

  // weave tokens with words
  let resultHtml = '';
  let tokenIdx = 0;
  let wordIdx = 0;
  
  let tokenOffset = 0; 
  let wordOffset = 0; 
  
  while (tokenIdx < tokens.length && wordIdx < diffWords.length) {
    const token = tokens[tokenIdx]!;
    const word = diffWords[wordIdx]!;
    
    const tokenCharsLeft = token.text.length - tokenOffset;
    const wordCharsLeft = word.value.length - wordOffset;
    
    const charsToConsume = Math.min(tokenCharsLeft, wordCharsLeft);
    const chunk = token.text.substring(tokenOffset, tokenOffset + charsToConsume);
    

    const isTargetChange = diffType === 'added' ? word.added : word.removed;
    const bgClass = diffType === 'added' 
      ? 'bg-green-500/30 text-white rounded-[2px]' 
      : 'bg-red-500/30 text-white rounded-[2px]';
    
    let chunkHtml = escapeHtml(chunk);
    if (token.attrs) {
      chunkHtml = `<span ${token.attrs}>${chunkHtml}</span>`;
    }
    if (isTargetChange) {
      chunkHtml = `<span class="${bgClass}">${chunkHtml}</span>`;
    }
    
    resultHtml += chunkHtml;
    tokenOffset += charsToConsume;
    wordOffset += charsToConsume;
    
    if (tokenOffset >= token.text.length) {
      tokenIdx++;
      tokenOffset = 0;
    }
    if (wordOffset >= word.value.length) {
      wordIdx++;
      wordOffset = 0;
    }
  }
  
  // Append any leftover tokens
  while (tokenIdx < tokens.length) {
    const token = tokens[tokenIdx]!;
    const chunk = token.text.substring(tokenOffset);
    let chunkHtml = escapeHtml(chunk);
    if (token.attrs) {
      chunkHtml = `<span ${token.attrs}>${chunkHtml}</span>`;
    }
    resultHtml += chunkHtml;
    tokenIdx++;
    tokenOffset = 0;
  }
  
  highlightMergeCache.set(cacheKey, resultHtml, Infinity);
  return resultHtml;
}

export function useDiffRowsHighlighted(
  splitRows: Ref<SplitRow[]>,
  unifiedRows: Ref<UnifiedRow[]>,
  oldLinesHtml: Ref<string[]>,
  newLinesHtml: Ref<string[]>
) {
  const syntaxSplitRows = computed(() => {

    return splitRows.value.map(row => {
      const newRow: SplitRow = { ...row };
      
      if (newRow.left?.lineNum && oldLinesHtml.value[newRow.left.lineNum - 1]) {
        const shikiHtml = oldLinesHtml.value[newRow.left.lineNum - 1]!;
        newRow.left = { 
          ...newRow.left, 
          html: mergeShikiWithDiff(shikiHtml, newRow.left.words, 'removed') 
        };
      }
      
      if (newRow.right?.lineNum && newLinesHtml.value[newRow.right.lineNum - 1]) {
        const shikiHtml = newLinesHtml.value[newRow.right.lineNum - 1]!;
        newRow.right = { 
          ...newRow.right, 
          html: mergeShikiWithDiff(shikiHtml, newRow.right.words, 'added') 
        };
      }
      
      return newRow;
    });
    
  });

  const syntaxUnifiedRows = computed(() => {

    return unifiedRows.value.map(row => {
      const newRow: UnifiedRow = { ...row };
      
      if (newRow.type === 'removed' && newRow.oldLineNum && oldLinesHtml.value[newRow.oldLineNum - 1]) {
        const shikiHtml = oldLinesHtml.value[newRow.oldLineNum - 1]!;
        newRow.html = mergeShikiWithDiff(shikiHtml, newRow.words, 'removed');
      } else if ((newRow.type === 'added' || newRow.type === 'normal') && newRow.newLineNum && newLinesHtml.value[newRow.newLineNum - 1]) {
        const shikiHtml = newLinesHtml.value[newRow.newLineNum - 1]!;
        newRow.html = mergeShikiWithDiff(shikiHtml, newRow.words, 'added');
      }
      
      return newRow;
    });

  });

  return { syntaxSplitRows, syntaxUnifiedRows };
}
