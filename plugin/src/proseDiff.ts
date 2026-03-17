import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from 'diff-match-patch';

export function stripExistingMarkup(text: string): string {
  return text
    .replace(/~~[^~]+~~/g, '')
    .replace(/<u>[^<]*<\/u>/g, '');
}

function hashParagraph(text: string): string {
  // Simple hash for paragraph identity — good enough for move detection
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

function runDmp(original: string, current: string): string {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, current);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text]) => {
    if (op === DIFF_DELETE) return `~~${text}~~`;
    if (op === DIFF_INSERT) return `<u>${text}</u>`;
    return text;
  }).join('');
}

export function diffProse(original: string, current: string): string {
  const cleanCurrent = stripExistingMarkup(current);

  const origParas = splitParagraphs(original);
  const currParas = splitParagraphs(cleanCurrent);

  // Build hash maps: hash -> index
  const origHashToIdx = new Map(origParas.map((p, i) => [hashParagraph(p), i]));
  const currHashToIdx = new Map(currParas.map((p, i) => [hashParagraph(p), i]));

  // Detect moved paragraphs: same content, different position
  const movedHashes = new Set<string>();
  for (const [h, origIdx] of origHashToIdx) {
    const currIdx = currHashToIdx.get(h);
    if (currIdx !== undefined && currIdx !== origIdx) {
      movedHashes.add(h);
    }
  }

  // Split into moved and non-moved content
  const origForDiff = origParas.filter(p => !movedHashes.has(hashParagraph(p))).join('\n\n');
  const currForDiff = currParas.filter(p => !movedHashes.has(hashParagraph(p))).join('\n\n');

  // Run dmp on non-moved content
  const mainResult = runDmp(origForDiff, currForDiff);

  // Append moved paragraph callouts
  const movedCallouts = currParas
    .filter(p => movedHashes.has(hashParagraph(p)))
    .map(p => `> [!NOTE] Moved\n> ${p.replace(/\n/g, '\n> ')}`)
    .join('\n\n');

  return movedCallouts ? `${mainResult}\n\n${movedCallouts}` : mainResult;
}
