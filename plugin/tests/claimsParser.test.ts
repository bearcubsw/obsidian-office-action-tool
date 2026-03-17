import { isClaimsDocument, parseClaims, diffClaims, serializeClaims } from '../src/claimsParser';

const SAMPLE_CLAIMS = `CLAIM OR CLAIMS

1. A method for preoperative preparation; comprising:
    1. identifying patients requiring cataract surgery,
    2. diagnosing ocular surface conditions.
2. The method of claim 1, further comprising:
    1. monitoring patient recovery.
3. A method of ocular surface optimization comprising:
    1. preparing said membrane,
    2. placing said membrane onto said eye.
`;

const AMENDED_CLAIMS = `CLAIM OR CLAIMS

1. (Currently Amended) A method for preoperative preparation of an eye; comprising:
    1. identifying patients requiring cataract surgery,
    2. diagnosing ocular surface conditions,
    3. evaluating corneal health.
2. The method of claim 1, further comprising:
    1. monitoring patient recovery.
4. A new method of treatment comprising:
    1. applying the membrane topically.
`;

describe('isClaimsDocument', () => {
  test('returns true for valid claims file', () => {
    expect(isClaimsDocument(SAMPLE_CLAIMS)).toBe(true);
  });

  test('returns false for remarks file', () => {
    const remarks = '# Remarks\n\nIn response to the office action...';
    expect(isClaimsDocument(remarks)).toBe(false);
  });

  test('returns false for file with fewer than 3 numbered items', () => {
    const sparse = '1. First item\n2. Second item\n';
    expect(isClaimsDocument(sparse)).toBe(false);
  });

  test('returns false when no comprising/wherein keyword', () => {
    const noKeyword = '1. First claim\n2. Second claim\n3. Third claim\n';
    expect(isClaimsDocument(noKeyword)).toBe(false);
  });

  test('returns false for strategy file', () => {
    const strategy = '# Strategy Index\n\n1. Focus on claims 1-5\n2. Prior art\n3. comprising the argument';
    expect(isClaimsDocument(strategy)).toBe(false);
  });
});

describe('parseClaims', () => {
  test('parses 3 claims from sample', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims).toHaveLength(3);
  });

  test('extracts claim numbers correctly', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims.map(c => c.number)).toEqual([1, 2, 3]);
  });

  test('extracts existing status marker', () => {
    const claims = parseClaims(AMENDED_CLAIMS);
    const claim1 = claims.find(c => c.number === 1);
    expect(claim1?.existingStatusMarker).toBe('Currently Amended');
  });

  test('returns null status marker when none present', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims[0].existingStatusMarker).toBeNull();
  });

  test('parses clauses for claim 1', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims[0].clauses).toHaveLength(2);
  });
});

describe('diffClaims', () => {
  test('marks unchanged claim as (Original)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(SAMPLE_CLAIMS);
    const result = diffClaims(original, current);
    expect(result[0].statusMarker).toBe('Original');
  });

  test('marks changed claim as (Currently Amended)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Currently Amended');
  });

  test('marks claim only in current as (New)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const result = diffClaims(original, current);
    const claim4 = result.find(c => c.number === 4);
    expect(claim4?.statusMarker).toBe('New');
  });

  test('marks claim only in original as (Canceled)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS); // claim 3 is gone
    const result = diffClaims(original, current);
    const claim3 = result.find(c => c.number === 3);
    expect(claim3?.statusMarker).toBe('Canceled');
  });

  test('marks unchanged claim with existing (Currently Amended) marker as (Previously Amended)', () => {
    const original = parseClaims(AMENDED_CLAIMS); // has (Currently Amended) on claim 1
    const current = parseClaims(AMENDED_CLAIMS);  // same content
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });

  test('marks unchanged claim with existing (Previously Amended) as (Previously Amended)', () => {
    const prevAmended = AMENDED_CLAIMS.replace('Currently Amended', 'Previously Amended');
    const original = parseClaims(prevAmended);
    const current = parseClaims(prevAmended);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });

  test('marks unchanged claim with existing (New) as (Previously Amended)', () => {
    const newClaim = AMENDED_CLAIMS.replace('(Currently Amended) ', '(New) ');
    const original = parseClaims(newClaim);
    const current = parseClaims(newClaim);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });
});

describe('serializeClaims', () => {
  test('outputs status marker in parentheses after claim number', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const diffed = diffClaims(original, current);
    const output = serializeClaims(diffed);
    expect(output).toContain('1. (Currently Amended)');
    expect(output).toContain('2. (Original)');
    expect(output).toContain('4. (New)');
  });

  test('wraps canceled claim body in strikethrough', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const diffed = diffClaims(original, current);
    const output = serializeClaims(diffed);
    expect(output).toContain('3. (Canceled)');
    expect(output).toMatch(/~~.*ocular surface optimization.*~~/s);
  });
});
