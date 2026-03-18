import { archiveTasks } from '../src/archiveTasks';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupApp(
  matterRoot: string,
  aiContent: string,
  userContent: string,
  logContent?: string,
  inventorContent?: string,
) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  app.vault.folders.add(`${matterRoot}/01 Tasks`);
  app.vault.files.set(`${matterRoot}/01 Tasks/AI Tasks.md`, aiContent);
  app.vault.files.set(`${matterRoot}/01 Tasks/User Tasks.md`, userContent);
  if (inventorContent !== undefined) {
    app.vault.files.set(`${matterRoot}/01 Tasks/Inventor Tasks.md`, inventorContent);
  }
  if (logContent !== undefined) {
    app.vault.files.set(`${matterRoot}/01 Tasks/Completed Tasks Log.md`, logContent);
  }
  // Active file inside the matter folder
  app.workspace.setActiveFile(makeFile(`${matterRoot}/01 Tasks/AI Tasks.md`));
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

  test('creates Completed Tasks Log when it does not exist', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Draft the claims\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    expect(app.vault.files.has('matter/01 Tasks/Completed Tasks Log.md')).toBe(true);
  });

  test('log table includes Notes column', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Draft the claims\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('| #   | Party | Task | Notes | Date-Time |');
  });

  test('appends completed tasks to new log with correct format', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Draft the claims\n- [ ] Review remarks\n',
      '# User Tasks\n\n- [x] Sign the declaration\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('| 1 | AI | Draft the claims | |');
    expect(logContent).toContain('| 2 | User | Sign the declaration | |');
  });

  test('removes completed tasks from source files', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Done task\n- [ ] Pending task\n',
      '# User Tasks\n\n- [x] User done\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const aiContent = app.vault.files.get('matter/01 Tasks/AI Tasks.md')!;
    expect(aiContent).not.toContain('- [x] Done task');
    expect(aiContent).toContain('- [ ] Pending task');
    const userContent = app.vault.files.get('matter/01 Tasks/User Tasks.md')!;
    expect(userContent).not.toContain('- [x] User done');
  });

  test('preserves pending tasks in source files', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] Done\n- [ ] Pending A\n- [ ] Pending B\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const aiContent = app.vault.files.get('matter/01 Tasks/AI Tasks.md')!;
    expect(aiContent).toContain('- [ ] Pending A');
    expect(aiContent).toContain('- [ ] Pending B');
  });

  test('appends to existing log and continues numbering', async () => {
    const existingLog =
      '# Completed Tasks Log — matter\n\n' +
      '| #   | Party | Task | Notes | Date-Time |\n' +
      '| --- | ----- | ---- | ----- | ---------- |\n' +
      '| 1 | AI | Old task | | 2026-01-01 |\n' +
      '| 2 | User | Another old | | 2026-01-02 |\n';
    const app = setupApp('matter',
      '# AI Tasks\n\n- [x] New task\n',
      '# User Tasks\n',
      existingLog,
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('| 3 | AI | New task |');
  });

  test('skips source file if it does not exist', async () => {
    const app = new MockApp();
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    app.vault.folders.add('matter/01 Tasks');
    // Only AI Tasks.md — no User Tasks.md or Inventor Tasks.md
    app.vault.files.set('matter/01 Tasks/AI Tasks.md', '# AI Tasks\n\n- [x] Solo task\n');
    app.workspace.setActiveFile(makeFile('matter/01 Tasks/AI Tasks.md'));
    const log = new LogService();
    const result = await archiveTasks(app as any, log);
    expect(result).toBe(true);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('Solo task');
  });

  test('archives tasks from Inventor Tasks.md with Inventor party', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n',
      '# User Tasks\n',
      undefined,
      '# Inventor Tasks\n\n- [x] Provide prior art dates\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('| Inventor |');
    expect(logContent).toContain('Provide prior art dates');
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
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('Task A \\| B');
  });

  test('archives indented completed tasks', async () => {
    const app = setupApp('matter',
      '# AI Tasks\n\n- [ ] Parent\n  - [x] Child task done\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('matter/01 Tasks/Completed Tasks Log.md')!;
    expect(logContent).toContain('Child task done');
    const aiContent = app.vault.files.get('matter/01 Tasks/AI Tasks.md')!;
    expect(aiContent).not.toContain('Child task done');
  });
});

describe('archiveTasks — flat folder (standalone tasks)', () => {
  function setupFlat(root: string, aiContent: string, userContent: string, thirdPartyContent?: string) {
    const app = new MockApp();
    app.vault.files.set(`${root}/AI Instructions.md`, '# AI Instructions');
    app.vault.folders.add(root);
    // No 01 Tasks/ subfolder — files are flat next to AI Instructions.md
    app.vault.files.set(`${root}/AI Tasks.md`, aiContent);
    app.vault.files.set(`${root}/User Tasks.md`, userContent);
    if (thirdPartyContent !== undefined) {
      app.vault.files.set(`${root}/Third Party Tasks.md`, thirdPartyContent);
    }
    app.workspace.setActiveFile(makeFile(`${root}/AI Tasks.md`));
    return app;
  }

  test('finds task files in root when no 01 Tasks/ subfolder exists', async () => {
    const app = setupFlat('project',
      '# AI Tasks\n\n- [x] Do the thing\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    const result = await archiveTasks(app as any, log);
    expect(result).toBe(true);
    expect(app.vault.files.has('project/Completed Tasks Log.md')).toBe(true);
    const logContent = app.vault.files.get('project/Completed Tasks Log.md')!;
    expect(logContent).toContain('Do the thing');
  });

  test('archives Third Party Tasks with correct party label', async () => {
    const app = setupFlat('project',
      '# AI Tasks\n',
      '# User Tasks\n',
      '# Third Party Tasks\n\n- [x] Send the contract\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const logContent = app.vault.files.get('project/Completed Tasks Log.md')!;
    expect(logContent).toContain('| Third Party |');
    expect(logContent).toContain('Send the contract');
  });

  test('removes completed tasks from flat source files', async () => {
    const app = setupFlat('project',
      '# AI Tasks\n\n- [x] Done\n- [ ] Pending\n',
      '# User Tasks\n',
    );
    const log = new LogService();
    await archiveTasks(app as any, log);
    const aiContent = app.vault.files.get('project/AI Tasks.md')!;
    expect(aiContent).not.toContain('- [x] Done');
    expect(aiContent).toContain('- [ ] Pending');
  });
});
