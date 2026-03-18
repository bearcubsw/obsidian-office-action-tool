import { createBackup } from '../src/createBackup';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupApp(matterRoot: string, mdFiles: string[], hasFolders = true) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  if (hasFolders) {
    app.vault.folders.add(`${matterRoot}/06 Amendments`);
  }
  for (const name of mdFiles) {
    app.vault.files.set(`${matterRoot}/06 Amendments/${name}`, `# ${name}`);
  }
  app.workspace.setActiveFile(makeFile(`${matterRoot}/06 Amendments/spec.md`));
  return app;
}

describe('createBackup', () => {
  test('creates timestamped folder in 01 Versions/', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/06 Amendments/01 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    const versionFolders = Array.from(app.vault.folders).filter(f =>
      f.startsWith('matter/06 Amendments/01 Versions/') &&
      /\/\d{12}$/.test(f)
    );
    expect(versionFolders).toHaveLength(1);
  });

  test('appends timestamp to copied filenames', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/06 Amendments/01 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    const versionFolders = Array.from(app.vault.folders).filter(f =>
      /\/\d{12}$/.test(f)
    );
    const versionRoot = versionFolders[0];
    const timestamp = versionRoot.split('/').pop()!;
    expect(app.vault.files.has(`${versionRoot}/spec - ${timestamp}.md`)).toBe(true);
    expect(app.vault.files.has(`${versionRoot}/claims - ${timestamp}.md`)).toBe(true);
  });

  test('copies only .md files from amendments root (not subfolders)', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/06 Amendments/01 Versions');
    // File in subfolder — should NOT be copied
    app.vault.files.set('matter/06 Amendments/01 Versions/old/spec.md', '# old');
    const log = new LogService();
    await createBackup(app as any, log);

    const versionFolders = Array.from(app.vault.folders).filter(f =>
      /\/\d{12}$/.test(f)
    );
    const versionRoot = versionFolders[0];
    const timestamp = versionRoot.split('/').pop()!;
    expect(app.vault.files.has(`${versionRoot}/spec - ${timestamp}.md`)).toBe(true);
    expect(app.vault.files.has(`${versionRoot}/claims - ${timestamp}.md`)).toBe(true);
  });

  test('creates 01 Versions/ folder if it does not exist', async () => {
    const app = setupApp('matter', ['spec.md']);
    // Do NOT pre-create 01 Versions/
    const log = new LogService();
    await createBackup(app as any, log);
    expect(app.vault.folders.has('matter/06 Amendments/01 Versions')).toBe(true);
  });

  test('warns with informative message when no .md files present', async () => {
    const app = setupApp('matter', []); // no files
    app.vault.folders.add('matter/06 Amendments/01 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e =>
      e.level === 'warn' && e.message.includes('06 Amendments')
    )).toBe(true);
  });

  test('returns false and logs error when matter root not found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/random/file.md'));
    const log = new LogService();
    const result = await createBackup(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'error')).toBe(true);
  });

  test('logs file count in success message', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md', 'abstract.md']);
    app.vault.folders.add('matter/06 Amendments/01 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e => e.level === 'success' && e.message.includes('3'))).toBe(true);
  });
});
