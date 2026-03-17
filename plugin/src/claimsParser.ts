import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface Claim {
  number: number;
  existingStatusMarker: string | null;
  preamble: string;
  clauses: string[];
  rawBody: string; // full text lines after the top-level line
}

export interface DiffedClaim extends Claim {
  statusMarker: string;
  diffedPreamble: string;
  diffedClauses: string[];
  canceled: boolean;
}

const CLAIM_KEYWORDS = /\b(comprising|consisting|wherein)\b/i;
const TOP_LEVEL_RE = /^(\d+)\.\s+(.*)/;
const STATUS_MARKER_RE = /^\(([^)]+)\)\s+(.*)/;
const EXCLUDING_HEADINGS = /^#\s+(Remarks|Strategy)/i;

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
        preamble: markerMatch ? markerMatch[2] : rest,
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

function wordDiff(original: string, current: string): string {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, current);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text]) => {
    if (op === DIFF_DELETE) return `~~${text}~~`;
    if (op === DIFF_INSERT) return `<u>${text}</u>`;
    return text;
  }).join('');
}

const PREVIOUSLY_AMENDED_MARKERS = new Set(['Currently Amended', 'Previously Amended', 'New']);

export function diffClaims(original: Claim[], current: Claim[]): DiffedClaim[] {
  const origByNum = new Map(original.map(c => [c.number, c]));
  const currByNum = new Map(current.map(c => [c.number, c]));
  const result: DiffedClaim[] = [];

  // Process current claims
  for (const curr of current) {
    const orig = origByNum.get(curr.number);
    if (!orig) {
      // New claim
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
      } else if (curr.existingStatusMarker && PREVIOUSLY_AMENDED_MARKERS.has(curr.existingStatusMarker)) {
        statusMarker = 'Previously Amended';
      } else {
        statusMarker = 'Original';
      }
      result.push({
        ...curr,
        statusMarker,
        diffedPreamble: contentChanged ? wordDiff(orig.preamble, curr.preamble) : curr.preamble,
        diffedClauses: contentChanged
          ? curr.clauses.map((clause, i) => wordDiff(orig.clauses[i] ?? '', clause))
          : curr.clauses,
        canceled: false,
      });
    }
  }

  // Process canceled claims (in original but not in current)
  for (const orig of original) {
    if (!currByNum.has(orig.number)) {
      result.push({
        ...orig,
        statusMarker: 'Canceled',
        diffedPreamble: `~~${orig.preamble}~~`,
        diffedClauses: orig.clauses.map(c => `~~${c}~~`),
        canceled: true,
      });
    }
  }

  // Sort by claim number
  result.sort((a, b) => a.number - b.number);
  return result;
}

export function serializeClaims(claims: DiffedClaim[]): string {
  const lines: string[] = [];
  for (const claim of claims) {
    const markerStr = `(${claim.statusMarker}) `;
    lines.push(`${claim.number}. ${markerStr}${claim.diffedPreamble}`);
    for (const clause of claim.diffedClauses) {
      lines.push(clause);
    }
    lines.push('');
  }
  return lines.join('\n');
}
