import { diffProse, stripExistingMarkup } from '../src/proseDiff';

describe('stripExistingMarkup', () => {
  test('removes strikethrough spans', () => {
    expect(stripExistingMarkup('hello ~~world~~ foo')).toBe('hello  foo');
  });

  test('removes underline spans', () => {
    expect(stripExistingMarkup('hello <u>world</u> foo')).toBe('hello  foo');
  });

  test('leaves plain text unchanged', () => {
    expect(stripExistingMarkup('plain text')).toBe('plain text');
  });
});

describe('diffProse', () => {
  test('unchanged content produces no markup', () => {
    const text = 'The invention relates to amniotic membrane.';
    const result = diffProse(text, text);
    expect(result).not.toContain('~~');
    expect(result).not.toContain('<u>');
  });

  test('deleted word is wrapped in strikethrough', () => {
    const original = 'The quick brown fox.';
    const current = 'The brown fox.';
    const result = diffProse(original, current);
    expect(result).toContain('~~');
    expect(result).toContain('quick');
  });

  test('inserted word is wrapped in underline', () => {
    const original = 'The brown fox.';
    const current = 'The quick brown fox.';
    const result = diffProse(original, current);
    expect(result).toContain('<u>');
    expect(result).toContain('quick');
  });

  test('existing strikethrough in current is stripped before diffing', () => {
    const original = 'The quick brown fox.';
    // User has manually marked "quick" for deletion with strikethrough
    const current = 'The ~~quick~~ brown fox.';
    const result = diffProse(original, current);
    // After stripping, current becomes "The  brown fox."
    // Diff should show "quick" as deleted, not doubled-up
    const doubleStrikeCount = (result.match(/~~~~quick~~~~/g) ?? []).length;
    expect(doubleStrikeCount).toBe(0);
  });

  test('moved paragraph is annotated with [!NOTE] Moved callout', () => {
    const paraA = 'First paragraph about the invention.';
    const paraB = 'Second paragraph about the claims.';
    const paraC = 'Third paragraph about the drawings.';
    const original = [paraA, paraB, paraC].join('\n\n');
    const current = [paraA, paraC, paraB].join('\n\n'); // B and C swapped
    const result = diffProse(original, current);
    expect(result).toContain('[!NOTE] Moved');
  });

  test('entirely new paragraph is wrapped in underline', () => {
    const original = 'First paragraph.';
    const current = 'First paragraph.\n\nEntirely new second paragraph.';
    const result = diffProse(original, current);
    expect(result).toContain('<u>');
  });
});
