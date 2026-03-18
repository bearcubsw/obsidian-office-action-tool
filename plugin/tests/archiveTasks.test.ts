import { archiveTasks } from '../src/archiveTasks';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupApp(matterRoot: string, aiContent: string, userContent: string, logContent?: string) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  app.vault.folders.add(`${matterRoot}/05 Tasks`);
  app.vault.files.set(`${matterRoot}/05 Tasks/AI Tasks.md`,   aiContent);
  app.vault.files.set(`${matterRoot}/05 Tasks/User Tasks.md`, userContent);
  if (logContent !== undefined) {
    app.vault.files.set(`${matterRoot}/05 Tasks/Tasks Change Log.md`, logContent);
  }
  // Active file inside the matter folder
  app.workspace.setActiveFile(makeFile(`${matterRoot}/05 Tasks/AI Tasks.md`));
  return app;
}

describe('archiveTasks', () => {
  test('returns false when no matter root found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('random/file.md'));
    const log = new LogService();
    const result = await archiveTasks(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'error')).toBe(true);
  });

  test('returns false and warns when no completed tasks exist', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [ ] Pending task\n',
      '# User Tasks\n\n- [ ] Another pending\n',
    );
    const log = new LogService();
    const result = await archiveTasks(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'warn')).toBe(true);
  });

  test('creates Tasks Change Log when it does not exist', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Draft the claims\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    expect(app.vault.files.has('matter/05 Tasks/Tasks Change Log.md')).toBe(true);
  });

  test('appends completed tasks to new log with correct format', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Draft the claims\n- [ ] Review remarks\n',
      '# User Tasks\n\n- [x] Sign the declaration\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/05 Tasks/Tasks Change Log.md')!;
    expect(logContent).toContain('| 1 | AI | Draft the claims |');
    expect(logContent).toContain('| 2 | User | Sign the declaration |');
  });

  test('removes completed tasks from source files', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Done task\n- [ ] Pending task\n',
      '# User Tasks\n\n- [x] User done\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const aiContent = app.vault.files.get('matter/05 Tasks/AI Tasks.md')!;
    expect(aiContent).not.toContain('- [x] Done task');
    expect(aiContent).toContain('- [ ] Pending task');
    const userContent = app.vault.files.get('matter/05 Tasks/User Tasks.md')!;
    expect(userContent).not.toContain('- [x] User done');
  });

  test('preserves pending tasks in source files', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Done\n- [ ] Pending A\n- [ ] Pending B\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const aiContent = app.vault.files.get('matter/05 Tasks/AI Tasks.md')!;
    expect(aiContent).toContain('- [ ] Pending A');
    expect(aiContent).toContain('- [ ] Pending B');
  });

  test('appends to existing log and continues numbering', async () => {
    const existingLog =
      '# Tasks Change Log — matter\n\n' +
      '| #   | Party | Task | Date-Time |\n' +
      '| --- | ----- | ---- | ---------- |\n' +
      '| 1 | AI | Old task | 2026-01-01 |\n' +
      '| 2 | User | Another old | 2026-01-02 |\n';
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] New task\n',
      '# User Tasks\n',
      existingLog,
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/05 Tasks/Tasks Change Log.md')!;
    expect(logContent).toContain('| 3 | AI | New task |');
  });

  test('skips source file if it does not exist', async () => {
    const app = new MockApp();
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    app.vault.folders.add('matter/05 Tasks');
    // Only AI Tasks.md — no User Tasks.md
    app.vault.files.set('matter/05 Tasks/AI Tasks.md', '# AI Tasks\n\n- [x] Solo task\n');
    app.workspace.setActiveFile(makeFile('matter/05 Tasks/AI Tasks.md'));
    const log = new LogService();
    const result = await archiveTasks(app as any, log);
    expect(result).toBe(true);
    const logContent = app.vault.files.get('matter/05 Tasks/Tasks Change Log.md')!;
    expect(logContent).toContain('Solo task');
  });

  test('logs success with task count', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Task A\n- [x] Task B\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    expect(log.entries.some(e => e.level === 'success' && e.message.includes('2'))).toBe(true);
  });

  test('escapes pipe characters in task text', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Task A | B\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/05 Tasks/Tasks Change Log.md')!;
    expect(logContent).toContain('Task A \\| B');
  });

  test('archives indented completed tasks', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [ ] Parent\n  - [x] Child task done\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/05 Tasks/Tasks Change Log.md')!;
    expect(logContent).toContain('Child task done');
    const aiContent = app.vault.files.get('matter/05 Tasks/AI Tasks.md')!;
    expect(aiContent).not.toContain('Child task done');
  });
});
