import { trackChanges } from '../src/trackChanges';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupMatter(root: string) {
  const app = new MockApp();
  app.vault.files.set(`${root}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(root);
  app.vault.folders.add(`${root}/02 Amendments and Remarks`);
  app.vault.folders.add(`${root}/02 Amendments and Remarks/01 Track Changes Originals`);
  app.vault.folders.add(`${root}/02 Amendments and Remarks/02 Track Changes USPTO Markup`);
  app.workspace.setActiveFile(makeFile(`${root}/02 Amendments and Remarks/spec.md`));
  return app;
}

describe('trackChanges — prime mode', () => {
  test('copies .md files to 01 Track Changes Originals when no originals exist', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/02 Amendments and Remarks/spec.md', '# Spec');
    app.vault.files.set('matter/02 Amendments and Remarks/claims.md', '# Claims');
    const log = new LogService();

    await trackChanges(app as any, log);

    expect(app.vault.files.has('matter/02 Amendments and Remarks/01 Track Changes Originals/spec.md')).toBe(true);
    expect(app.vault.files.has('matter/02 Amendments and Remarks/01 Track Changes Originals/claims.md')).toBe(true);
  });

  test('logs prime mode action and shows correct notice text', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/02 Amendments and Remarks/spec.md', '# Spec');
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(log.entries.some(e => e.message.toLowerCase().includes('original'))).toBe(true);
  });
});

describe('trackChanges — diff mode', () => {
  function setupWithOriginals(root: string, files: Record<string, { original: string; current: string }>) {
    const app = setupMatter(root);
    for (const [name, content] of Object.entries(files)) {
      // Current version (amended)
      app.vault.files.set(`${root}/02 Amendments and Remarks/${name}`, content.current);
      // Original version
      app.vault.files.set(`${root}/02 Amendments and Remarks/01 Track Changes Originals/${name}`, content.original);
    }
    return app;
  }

  test('writes output file to 02 Track Changes USPTO Markup/', async () => {
    const app = setupWithOriginals('matter', {
      'spec.md': {
        original: '# Specification\n\nThe invention relates to treatment.',
        current: '# Specification\n\nThe invention relates to advanced treatment.',
      }
    });
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md')).toBe(true);
  });

  test('overwrites existing output file', async () => {
    const app = setupWithOriginals('matter', {
      'spec.md': {
        original: 'Old text.',
        current: 'New text.',
      }
    });
    app.vault.files.set('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md', 'old output');
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md') ?? '';
    expect(output).not.toBe('old output');
  });

  test('claims file gets status markers in output', async () => {
    const originalClaims = `1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.`;
    const currentClaims = `1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.`;

    const app = setupWithOriginals('matter', {
      'claims.md': { original: originalClaims, current: currentClaims }
    });
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/claims.md') ?? '';
    expect(output).toContain('(Currently Amended)');
    expect(output).toContain('(Original)');
  });

  test('returns false when matter root not found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/file.md'));
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
  });
});
