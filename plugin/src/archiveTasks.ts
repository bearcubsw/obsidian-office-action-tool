import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { findMatterRoot, matterPaths } from './matterUtils';

const LOG_FILENAME = 'Completed Tasks Log.md';
const DONE_RE = /^(\s*)-\s+\[x\]\s+(.*)$/;

const SOURCE_FILES: { filename: string; party: string }[] = [
  { filename: 'AI Tasks.md',       party: 'AI'       },
  { filename: 'User Tasks.md',     party: 'User'     },
  { filename: 'Inventor Tasks.md', party: 'Inventor' },
];

interface ArchivedTask { text: string; party: string; }

export async function archiveTasks(app: App, log: LogService): Promise<boolean> {
  const matterRoot = await findMatterRoot(app);
  if (matterRoot === null) {
    const msg = 'Open a file inside a matter folder first.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  const paths = matterPaths(matterRoot);
  const logPath = `${paths.tasks}/${LOG_FILENAME}`;

  // Collect completed tasks and build updated source content
  const archived: ArchivedTask[] = [];
  const updates: { path: string; content: string }[] = [];

  for (const { filename, party } of SOURCE_FILES) {
    const filePath = `${paths.tasks}/${filename}`;
    const tfile = app.vault.getAbstractFileByPath(filePath);
    if (!tfile || 'children' in tfile) continue;

    const original = await app.vault.read(tfile as any);
    const lines = original.split('\n');
    const remaining: string[] = [];
    let changed = false;

    for (const line of lines) {
      const m = DONE_RE.exec(line);
      if (m) {
        const text = m[2].trim();
        if (text) archived.push({ text, party });
        changed = true;
        // omit this line from remaining
      } else {
        remaining.push(line);
      }
    }

    if (changed) {
      updates.push({ path: filePath, content: remaining.join('\n') });
    }
  }

  if (archived.length === 0) {
    const msg = 'No completed tasks ( - [x] ) found in AI Tasks, User Tasks, or Inventor Tasks.';
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  // Read or create the log file
  const today = new Date().toISOString().slice(0, 10);
  const logTFile = app.vault.getAbstractFileByPath(logPath);
  const logExists = logTFile !== null && !('children' in logTFile);
  let logContent: string;
  let nextNum = 1;

  if (logExists) {
    logContent = await app.vault.read(logTFile as any);
    // Determine next sequential number
    const rowRe = /^\|\s*(\d+)\s*\|/gm;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(logContent)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= nextNum) nextNum = n + 1;
    }
  } else {
    const folderName = matterRoot.split('/').pop() ?? matterRoot;
    logContent = `# Completed Tasks Log — ${folderName}\n\n| #   | Party | Task | Notes | Date-Time |\n| --- | ----- | ---- | ----- | ---------- |\n`;
  }

  // Build new rows (escape any pipe chars in task text)
  const newRows = archived.map(({ text, party }, i) => {
    const safeText = text.replace(/\|/g, '\\|');
    return `| ${nextNum + i} | ${party} | ${safeText} | | ${today} |`;
  }).join('\n');

  const updatedLog = logContent.trimEnd() + '\n' + newRows + '\n';

  // Write all changes
  if (logExists) {
    await app.vault.modify(logTFile as any, updatedLog);
  } else {
    await app.vault.create(logPath, updatedLog);
  }

  for (const { path, content } of updates) {
    const f = app.vault.getAbstractFileByPath(path);
    if (f && !('children' in f)) {
      await app.vault.modify(f as any, content);
    }
  }

  const noun = archived.length === 1 ? 'task' : 'tasks';
  const msg = `Archived ${archived.length} completed ${noun} to Completed Tasks Log.`;
  log.success(msg);
  new Notice(msg);
  return true;
}
