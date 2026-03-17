import { createBackup } from '../src/createBackup';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupApp(matterRoot: string, mdFiles: string[], hasFolders = true) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  if (hasFolders) {
    app.vault.folders.add(`${matterRoot}/02 Amendments and Remarks`);
  }
  for (const name of mdFiles) {
    app.vault.files.set(`${matterRoot}/02 Amendments and Remarks/${name}`, `# ${name}`);
  }
  app.workspace.setActiveFile(makeFile(`${matterRoot}/02 Amendments and Remarks/spec.md`));
  return app;
}

describe('createBackup', () => {
  test('creates timestamped folder in 03 Versions/', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    const versionFolders = Array.from(app.vault.folders).filter(f =>
      f.startsWith('matter/02 Amendments and Remarks/03 Versions/') &&
      /\/\d{12}$/.test(f)
    );
    expect(versionFolders).toHaveLength(1);
  });

  test('copies only .md files from amendments root (not subfolders)', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    // File in subfolder — should NOT be copied
    app.vault.files.set('matter/02 Amendments and Remarks/03 Versions/old/spec.md', '# old');
    const log = new LogService();
    await createBackup(app as any, log);

    const versionFolders = Array.from(app.vault.folders).filter(f =>
      /\/\d{12}$/.test(f)
    );
    const versionRoot = versionFolders[0];
    expect(app.vault.files.has(`${versionRoot}/spec.md`)).toBe(true);
    expect(app.vault.files.has(`${versionRoot}/claims.md`)).toBe(true);
    // The old subfolder file should NOT appear in the new backup
    expect(app.vault.files.has(`${versionRoot}/old/spec.md`)).toBe(false);
  });

  test('creates 03 Versions/ folder if it does not exist', async () => {
    const app = setupApp('matter', ['spec.md']);
    // Do NOT pre-create 03 Versions/
    const log = new LogService();
    await createBackup(app as any, log);
    expect(app.vault.folders.has('matter/02 Amendments and Remarks/03 Versions')).toBe(true);
  });

  test('warns with informative message when no .md files present', async () => {
    const app = setupApp('matter', []); // no files
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    // Remove the active file we set by default (spec.md doesn't exist in vault.files)
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e =>
      e.level === 'warn' && e.message.includes('02 Amendments and Remarks')
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
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e => e.level === 'success' && e.message.includes('3'))).toBe(true);
  });
});
