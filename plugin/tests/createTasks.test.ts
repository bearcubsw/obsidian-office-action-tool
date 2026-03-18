import { createTasks } from '../src/createTasks';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function makeApp(activeFilePath: string) {
  const app = new MockApp();
  app.workspace.setActiveFile(makeFile(activeFilePath));
  return app;
}

describe('createTasks', () => {
  test('aborts when no active file', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(null);
    const log = new LogService();
    const result = await createTasks(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('Open a file');
  });

  test('aborts when AI Instructions.md already exists', async () => {
    const app = makeApp('project/notes.md');
    app.vault.files.set('project/AI Instructions.md', '# AI Instructions');
    const log = new LogService();
    const result = await createTasks(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('already exists');
  });

  test('creates all expected files in flat structure', async () => {
    const app = makeApp('project/notes.md');
    const log = new LogService();
    await createTasks(app as any, log);
    const expectedFiles = [
      'project/AI Instructions.md',
      'project/index.md',
      'project/AI Tasks.md',
      'project/User Tasks.md',
      'project/Third Party Tasks.md',
    ];
    for (const file of expectedFiles) {
      expect(app.vault.files.has(file)).toBe(true);
    }
  });

  test('does not create any folders', async () => {
    const app = makeApp('project/notes.md');
    const log = new LogService();
    await createTasks(app as any, log);
    // Only the pre-existing implicit folder, no new folders created
    expect(app.vault.folders.size).toBe(0);
  });

  test('AI Instructions.md contains task management content', async () => {
    const app = makeApp('project/notes.md');
    const log = new LogService();
    await createTasks(app as any, log);
    const content = app.vault.files.get('project/AI Instructions.md') ?? '';
    expect(content).toContain('Task Management');
    expect(content).toContain('Third Party Tasks');
    expect(content).toContain('Index Maintenance');
    expect(content).not.toContain('patent');
    expect(content).not.toContain('USPTO');
    expect(content).not.toContain('Claims Format');
  });

  test('logs success entry', async () => {
    const app = makeApp('project/notes.md');
    const log = new LogService();
    const result = await createTasks(app as any, log);
    expect(result).toBe(true);
    expect(log.entries.some(e => e.level === 'success')).toBe(true);
  });
});
