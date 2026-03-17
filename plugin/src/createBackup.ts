import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { findMatterRoot, matterPaths } from './matterUtils';

function nowYYYYMMDDHHMM(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function createBackup(app: App, log: LogService): Promise<boolean> {
  const matterRoot = await findMatterRoot(app);
  if (!matterRoot) {
    const msg = 'No matter root found — open a file inside a matter folder.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  const paths = matterPaths(matterRoot);
  const amendmentsDir = paths.amendments;
  const versionsDir = paths.versions;

  // Ensure 03 Versions/ exists
  if (!app.vault.getAbstractFileByPath(versionsDir)) {
    await app.vault.createFolder(versionsDir);
    log.info(`Created folder: 03 Versions/`);
  }

  // Collect .md files directly in amendments root (not in subfolders)
  const allFiles = app.vault.getMarkdownFiles();
  const amendmentFiles = allFiles.filter(f => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'));
    return parent === amendmentsDir;
  });

  if (amendmentFiles.length === 0) {
    const msg = `No markdown files found directly in 02 Amendments and Remarks/ (subfolders are excluded).`;
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  const timestamp = nowYYYYMMDDHHMM();
  const snapshotDir = `${versionsDir}/${timestamp}`;
  await app.vault.createFolder(snapshotDir);
  log.info(`Created snapshot folder: 03 Versions/${timestamp}`);

  for (const file of amendmentFiles) {
    const destPath = `${snapshotDir}/${file.name}`;
    await app.vault.copy(file, destPath);
    log.info(`Copied: ${file.name}`);
  }

  const msg = `Backup created: 03 Versions/${timestamp} (${amendmentFiles.length} files)`;
  log.success(msg);
  new Notice(msg);
  return true;
}
