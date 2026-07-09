/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as Diff from 'diff';

export function useDiffRows(hunks: Ref<Diff.StructuredPatchHunk[]>) {
  const splitRows = computed(() => {
    const rows: {
      isHunkHeader?: boolean;
      text?: string;
      left?: { type: string, text: string, lineNum: number | null, words?: Diff.Change[] } | null;
      right?: { type: string, text: string, lineNum: number | null, words?: Diff.Change[] } | null;
    }[] = [];

    for (const hunk of hunks.value) {
      rows.push({
        isHunkHeader: true,
        text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
      });

      let oldLine = hunk.oldStart;
      let newLine = hunk.newStart;

      let removedLines: {text: string, oldLine: number}[] = [];
      let addedLines: {text: string, newLine: number}[] = [];

      const flush = () => {
        const maxLines = Math.max(removedLines.length, addedLines.length);
        for (let j = 0; j < maxLines; j++) {
          const r = j < removedLines.length ? removedLines[j] : undefined;
          const a = j < addedLines.length ? addedLines[j] : undefined;
          
          let leftWords, rightWords;
          if (r && a) {
              const wordDiff = Diff.diffChars(r.text, a.text);
              leftWords = wordDiff.filter(w => !w.added);
              rightWords = wordDiff.filter(w => !w.removed);
          } else {
              if (r) leftWords = [{ value: r.text, count: r.text.length, added: false, removed: true }];
              if (a) rightWords = [{ value: a.text, count: a.text.length, added: true, removed: false }];
          }
          
          rows.push({
              isHunkHeader: false,
              left: r ? { type: 'removed', text: r.text, lineNum: r.oldLine, words: leftWords } : null,
              right: a ? { type: 'added', text: a.text, lineNum: a.newLine, words: rightWords } : null
          });
        }
        removedLines = [];
        addedLines = [];
      };

      for (const line of hunk.lines) {
        if (line.startsWith('-')) {
          removedLines.push({ text: line.substring(1), oldLine: oldLine++ });
        } else if (line.startsWith('+')) {
          addedLines.push({ text: line.substring(1), newLine: newLine++ });
        } else {
          flush();
          if (line.startsWith('\\')) {
            rows.push({
              isHunkHeader: false,
              left: { type: 'context', text: line, lineNum: null },
              right: null
            });
          } else {
            const text = line.startsWith(' ') ? line.substring(1) : line;
            rows.push({
              isHunkHeader: false,
              left: { type: 'context', text, lineNum: oldLine },
              right: { type: 'context', text, lineNum: newLine }
            });
            oldLine++;
            newLine++;
          }
        }
      }
      flush();
    }
    return rows;
  });

  const unifiedRows = computed(() => {
    const rows: { type: string, text: string, oldLineNum: number | null, newLineNum: number | null, words?: Diff.Change[] }[] = [];

    for (const hunk of hunks.value) {
      rows.push({
        type: 'hunk',
        text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
        oldLineNum: null,
        newLineNum: null
      });

      let oldLine = hunk.oldStart;
      let newLine = hunk.newStart;

      let removedLines: {text: string, oldLine: number}[] = [];
      let addedLines: {text: string, newLine: number}[] = [];

      const flush = () => {
        for (let j = 0; j < removedLines.length; j++) {
          const r = removedLines[j]!;
          const a = j < addedLines.length ? addedLines[j] : undefined;
          let words;
          if (a) {
              words = Diff.diffChars(r.text, a.text).filter(w => !w.added);
          } else {
              words = [{ value: r.text, count: r.text.length, added: false, removed: true }];
          }
          rows.push({ type: 'removed', text: r.text, oldLineNum: r.oldLine, newLineNum: null, words });
        }
        for (let j = 0; j < addedLines.length; j++) {
          const a = addedLines[j]!;
          const r = j < removedLines.length ? removedLines[j] : undefined;
          let words;
          if (r) {
              words = Diff.diffChars(r.text, a.text).filter(w => !w.removed);
          } else {
              words = [{ value: a.text, count: a.text.length, added: true, removed: false }];
          }
          rows.push({ type: 'added', text: a.text, oldLineNum: null, newLineNum: a.newLine, words });
        }
        removedLines = [];
        addedLines = [];
      };

      for (const line of hunk.lines) {
        if (line.startsWith('-')) {
          removedLines.push({ text: line.substring(1), oldLine: oldLine++ });
        } else if (line.startsWith('+')) {
          addedLines.push({ text: line.substring(1), newLine: newLine++ });
        } else {
          flush();
          if (line.startsWith('\\')) {
            rows.push({ type: 'context', text: line, oldLineNum: null, newLineNum: null });
          } else {
            const text = line.startsWith(' ') ? line.substring(1) : line;
            rows.push({ type: 'context', text, oldLineNum: oldLine++, newLineNum: newLine++ });
          }
        }
      }
      flush();
    }
    return rows;
  });

  return { splitRows, unifiedRows };
}
