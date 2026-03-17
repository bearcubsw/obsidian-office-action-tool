import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from 'diff-match-patch';

export interface Claim {
  number: number;
  existingStatusMarker: string | null;
  preamble: string;
  clauses: string[];
  rawBody: string;
}

export interface DiffedClaim extends Claim {
  statusMarker: string;
  diffedPreamble: string;
  diffedClauses: string[];
  canceled: boolean;
}

const CLAIM_KEYWORDS = /\b(comprising|consisting|wherein)\b/i;
const TOP_LEVEL_RE = /^(\d+)\.\s+(.*)/;
// Optional trailing content after marker — handles "9. (cancelled)" with nothing after
const STATUS_MARKER_RE = /^\(([^)]+)\)(?:\s+(.*))?$/;
const EXCLUDING_HEADINGS = /^#\s+(Remarks|Strategy)/i;

const PREVIOUSLY_AMENDED_MARKERS_LC = new Set(['currently amended', 'previously amended', 'new']);
const CANCELLED_MARKERS_LC = new Set(['cancelled', 'canceled']);

export function isClaimsDocument(content: string): boolean {
  if (EXCLUDING_HEADINGS.test(content.trim())) return false;
  const topLevelMatches = [...content.matchAll(/^\d+\.\s+/gm)];
  if (topLevelMatches.length < 3) return false;
  if (!CLAIM_KEYWORDS.test(content)) return false;
  return true;
}

export function parseClaims(content: string): Claim[] {
  const lines = content.split('\n');
  const claims: Claim[] = [];
  let current: Claim | null = null;

  for (const line of lines) {
    const topMatch = TOP_LEVEL_RE.exec(line);
    if (topMatch) {
      if (current) claims.push(current);
      const number = parseInt(topMatch[1], 10);
      const rest = topMatch[2];
      const markerMatch = STATUS_MARKER_RE.exec(rest);
      current = {
        number,
        existingStatusMarker: markerMatch ? markerMatch[1] : null,
        preamble: markerMatch ? (markerMatch[2] ?? '') : rest,
        clauses: [],
        rawBody: '',
      };
    } else if (current) {
      const trimmed = line.trimStart();
      if (/^\d+\.\s+/.test(trimmed)) {
        current.clauses.push(line);
      }
      current.rawBody += (current.rawBody ? '\n' : '') + line;
    }
  }
  if (current) claims.push(current);
  return claims;
}

function claimContentKey(claim: Claim): string {
  return claim.preamble + '|' + claim.clauses.join('|');
}

/** Word-level diff using DMP token encoding. */
function wordDiff(original: string, current: string): string {
  const dmp = new diff_match_patch();
  const wordArr: string[] = [];
  const wordMap = new Map<string, number>();

  function encode(text: string): string {
    const tokens = text.match(/\S+|\s+/g) ?? [];
    return tokens.map(token => {
      if (!wordMap.has(token)) {
        wordMap.set(token, wordArr.length);
        wordArr.push(token);
      }
      return String.fromCharCode(wordMap.get(token)!);
    }).join('');
  }

  const diffs = dmp.diff_main(encode(original), encode(current), false);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([op, encoded]) => {
    const decoded = Array.from(encoded).map(c => wordArr[c.charCodeAt(0)]).join('');
    if (op === DIFF_DELETE) return `~~${decoded}~~`;
    if (op === DIFF_INSERT) return `<u>${decoded}</u>`;
    return decoded;
  }).join('')
    .replace(/~~(<u>)/g, '~~ $1')
    .replace(/(<\/u>)(~~)/g, '$1 $2');
}

export function diffClaims(original: Claim[], current: Claim[]): DiffedClaim[] {
  const origByNum = new Map(original.map(c => [c.number, c]));
  const currByNum = new Map(current.map(c => [c.number, c]));
  const result: DiffedClaim[] = [];

  for (const curr of current) {
    const markerLC = curr.existingStatusMarker?.toLowerCase() ?? null;

    // Terminal: cancelled (attorney-marked)
    if (markerLC && CANCELLED_MARKERS_LC.has(markerLC)) {
      result.push({
        ...curr,
        statusMarker: 'Cancelled',
        diffedPreamble: '',
        diffedClauses: [],
        canceled: true,
      });
      continue;
    }

    // Terminal: withdrawn — keep body, no diff
    if (markerLC === 'withdrawn') {
      const orig = origByNum.get(curr.number);
      result.push({
        ...curr,
        statusMarker: 'Withdrawn',
        diffedPreamble: orig ? orig.preamble : curr.preamble,
        diffedClauses: orig ? orig.clauses : curr.clauses,
        canceled: false,
      });
      continue;
    }

    const orig = origByNum.get(curr.number);
    if (!orig) {
      result.push({
        ...curr,
        statusMarker: 'New',
        diffedPreamble: curr.preamble,
        diffedClauses: curr.clauses,
        canceled: false,
      });
    } else {
      const contentChanged = claimContentKey(orig) !== claimContentKey(curr);
      let statusMarker: string;
      if (contentChanged) {
        statusMarker = 'Currently Amended';
      } else if (markerLC && PREVIOUSLY_AMENDED_MARKERS_LC.has(markerLC)) {
        statusMarker = 'Previously Amended';
      } else {
        statusMarker = 'Original';
      }
      result.push({
        ...curr,
        statusMarker,
        diffedPreamble: contentChanged ? wordDiff(orig.preamble, curr.preamble) : curr.preamble,
        diffedClauses: contentChanged
          ? Array.from({ length: Math.max(orig.clauses.length, curr.clauses.length) }, (_, i) => {
              const currClause = curr.clauses[i];
              const origClause = orig.clauses[i] ?? '';
              if (currClause === undefined) {
                const m = /^(\s*\d+\.\s+)(.*)/.exec(origClause);
                return m ? `${m[1]}~~${m[2]}~~` : `~~${origClause}~~`;
              }
              return wordDiff(origClause, currClause);
            })
          : curr.clauses,
        canceled: false,
      });
    }
  }

  // Claims absent from current → Cancelled
  for (const orig of original) {
    if (!currByNum.has(orig.number)) {
      result.push({
        ...orig,
        statusMarker: 'Cancelled',
        diffedPreamble: '',
        diffedClauses: [],
        canceled: true,
      });
    }
  }

  result.sort((a, b) => a.number - b.number);
  return result;
}

export function serializeClaims(claims: DiffedClaim[]): string {
  const lines: string[] = [];
  for (const claim of claims) {
    if (claim.canceled) {
      lines.push(`${claim.number}. (Cancelled)`);
    } else {
      lines.push(`${claim.number}. (${claim.statusMarker}) ${claim.diffedPreamble}`);
      for (const clause of claim.diffedClauses) {
        lines.push(clause);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}
