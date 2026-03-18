import { trackChanges } from '../src/trackChanges';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupMatter(root: string) {
  const app = new MockApp();
  app.vault.files.set(`${root}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(root);
  app.vault.folders.add(`${root}/06 Amendments`);
  app.vault.folders.add(`${root}/06 Amendments/01 Versions`);
  app.vault.folders.add(`${root}/06 Amendments/02 USPTO Output`);
  app.workspace.setActiveFile(makeFile(`${root}/06 Amendments/spec.md`));
  return app;
}

describe('trackChanges', () => {
  test('returns false when no matter root found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/file.md'));
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'error')).toBe(true);
  });

  test('warns when no version snapshots exist (no baseline)', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/06 Amendments/spec.md', '# Spec');
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'warn')).toBe(true);
  });

  test('uses first version folder as baseline (not latest)', async () => {
    const app = setupMatter('matter');
    // First version — the baseline
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      '# Specification\n\nOriginal text.'
    );
    // Second version — should be ignored for baseline
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603091000');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603091000/spec - 202603091000.md',
      '# Specification\n\nIntermediate text.'
    );
    // Current working copy
    app.vault.files.set('matter/06 Amendments/spec.md',
      '# Specification\n\nAmended text.'
    );
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get(
      'matter/06 Amendments/02 USPTO Output/spec.md'
    ) ?? '';
    // Should diff against "Original text." not "Intermediate text."
    expect(output).toContain('Original');
    expect(output).not.toContain('Intermediate');
  });

  test('strips timestamp suffix from version filenames to match current files', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/claims - 202603080900.md',
      '1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.'
    );
    app.vault.files.set('matter/06 Amendments/claims.md',
      '1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.'
    );
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/06 Amendments/02 USPTO Output/claims.md')).toBe(true);
  });

  test('writes output to 02 USPTO Output/', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      '# Spec\n\nOld text.'
    );
    app.vault.files.set('matter/06 Amendments/spec.md', '# Spec\n\nNew text.');
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/06 Amendments/02 USPTO Output/spec.md')).toBe(true);
  });

  test('overwrites existing output file', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      'Old text.'
    );
    app.vault.files.set('matter/06 Amendments/spec.md', 'New text.');
    app.vault.files.set('matter/06 Amendments/02 USPTO Output/spec.md', 'old output');
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/06 Amendments/02 USPTO Output/spec.md') ?? '';
    expect(output).not.toBe('old output');
  });

  test('claims file gets status markers in output', async () => {
    const originalClaims = '1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.';
    const currentClaims = '1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.';

    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/claims - 202603080900.md',
      originalClaims
    );
    app.vault.files.set('matter/06 Amendments/claims.md', currentClaims);
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/06 Amendments/02 USPTO Output/claims.md') ?? '';
    expect(output).toContain('(Currently Amended)');
    expect(output).toContain('(Original)');
  });

  test('warns and skips files with no matching baseline', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      '# Spec'
    );
    // This file has no baseline match
    app.vault.files.set('matter/06 Amendments/new-file.md', '# New');
    app.vault.files.set('matter/06 Amendments/spec.md', '# Spec edited');
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(log.entries.some(e => e.level === 'warn' && e.message.includes('new-file.md'))).toBe(true);
    // But spec.md should still be processed
    expect(app.vault.files.has('matter/06 Amendments/02 USPTO Output/spec.md')).toBe(true);
  });
});
