import { createStructure } from '../src/createStructure';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function makeApp(activeFilePath: string) {
  const app = new MockApp();
  app.workspace.setActiveFile(makeFile(activeFilePath));
  return app;
}

describe('createStructure', () => {
  test('aborts and returns error when no active file', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(null);
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('Open a file');
  });

  test('aborts when AI Instructions.md already exists', async () => {
    const app = makeApp('matter/spec.md');
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('already exists');
  });

  test('creates all expected folders', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    await createStructure(app as any, log);
    const expectedFolders = [
      'matter/01 Prior Filings',
      'matter/02 Amendments and Remarks',
      'matter/02 Amendments and Remarks/01 Track Changes Originals',
      'matter/02 Amendments and Remarks/02 Track Changes USPTO Markup',
      'matter/02 Amendments and Remarks/03 Versions',
      'matter/02 Amendments and Remarks/04 Prior Art',
      'matter/03 Strategy',
      'matter/04 Meetings',
      'matter/05 Tasks',
    ];
    for (const folder of expectedFolders) {
      expect(app.vault.folders.has(folder)).toBe(true);
    }
  });

  test('creates all expected placeholder files', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    await createStructure(app as any, log);
    const expectedFiles = [
      'matter/AI Instructions.md',
      'matter/02 Amendments and Remarks/Remarks.md',
      'matter/02 Amendments and Remarks/04 Prior Art/index with Mermaid Timeline.md',
      'matter/03 Strategy/Strategy Index.md',
      'matter/05 Tasks/AI Tasks.md',
      'matter/05 Tasks/User Tasks.md',
    ];
    for (const file of expectedFiles) {
      expect(app.vault.files.has(file)).toBe(true);
    }
  });

  test('AI Instructions.md contains substantive content', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    await createStructure(app as any, log);
    const content = app.vault.files.get('matter/AI Instructions.md') ?? '';
    expect(content).toContain('AI Instructions');
    expect(content).toContain('Prior Filings');
    expect(content).toContain('Amendments and Remarks');
    expect(content).toContain('Task Management');
    expect(content).toContain('Claims Format');
  });

  test('Remarks.md starts with # Remarks', async () => {
    const app = makeApp('matter/spec.md');
    await createStructure(app as any, new LogService());
    const content = app.vault.files.get('matter/02 Amendments and Remarks/Remarks.md') ?? '';
    expect(content.trim().startsWith('# Remarks')).toBe(true);
  });

  test('logs success entry', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(true);
    expect(log.entries.some(e => e.level === 'success')).toBe(true);
  });
});
