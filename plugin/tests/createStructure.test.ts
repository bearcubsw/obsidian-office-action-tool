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
      'matter/01 Tasks',
      'matter/02 USPTO Records',
      'matter/03 Strategy',
      'matter/04 Meetings',
      'matter/05 Prior Art',
      'matter/06 Amendments',
      'matter/06 Amendments/01 Versions',
      'matter/06 Amendments/02 USPTO Output',
      'matter/07 Remarks',
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
      'matter/index.md',
      'matter/01 Tasks/index.md',
      'matter/01 Tasks/AI Tasks.md',
      'matter/01 Tasks/User Tasks.md',
      'matter/01 Tasks/Inventor Tasks.md',
      'matter/02 USPTO Records/index.md',
      'matter/03 Strategy/index.md',
      'matter/04 Meetings/index.md',
      'matter/05 Prior Art/index.md',
      'matter/07 Remarks/index.md',
      'matter/07 Remarks/Remarks.md',
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
    expect(content).toContain('USPTO Records');
    expect(content).toContain('06 Amendments');
    expect(content).toContain('Task Management');
    expect(content).toContain('Claims Format');
  });

  test('Prior Art index.md contains Mermaid gantt template', async () => {
    const app = makeApp('matter/spec.md');
    await createStructure(app as any, new LogService());
    const content = app.vault.files.get('matter/05 Prior Art/index.md') ?? '';
    expect(content).toContain('```mermaid');
    expect(content).toContain('gantt');
  });

  test('Remarks.md starts with # Remarks', async () => {
    const app = makeApp('matter/spec.md');
    await createStructure(app as any, new LogService());
    const content = app.vault.files.get('matter/07 Remarks/Remarks.md') ?? '';
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
