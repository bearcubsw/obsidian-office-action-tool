import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { AI_INSTRUCTIONS_CONTENT } from './aiInstructionsTemplate';

const SUBFOLDERS = [
  '01 Tasks',
  '02 USPTO Records',
  '03 Strategy',
  '04 Meetings',
  '05 Prior Art',
  '06 Amendments',
  '06 Amendments/01 Versions',
  '06 Amendments/02 USPTO Output',
  '07 Remarks',
];

const PRIOR_ART_INDEX = `# Prior Art Index

## References

<!-- Add prior art entries here. Each reference should have a subfolder under 05 Prior Art/. -->

## Timeline

\`\`\`mermaid
gantt
    title Patent Prosecution Timeline
    dateFormat  YYYY-MM-DD
    section Prior Art
\`\`\`
`;

function placeholderFiles(root: string): Record<string, string> {
  const p = (sub: string) => `${root}/${sub}`;
  return {
    [p('AI Instructions.md')]: AI_INSTRUCTIONS_CONTENT,
    [p('index.md')]: '# Matter Index\n\n<!-- AI: maintain this index with links to all subfolders and a brief matter overview. -->\n',
    [p('01 Tasks/index.md')]: '# Tasks Index\n\n<!-- AI: maintain links to task files and summary of open items. -->\n',
    [p('01 Tasks/AI Tasks.md')]: '# AI Tasks\n\n<!-- Checkbox list of tasks assigned to the AI. Use subtasks and bullets as needed. -->\n\n',
    [p('01 Tasks/User Tasks.md')]: '# User Tasks\n\n<!-- Checkbox list of tasks for the attorney/user. AI monitors this and may assist. -->\n\n',
    [p('01 Tasks/Inventor Tasks.md')]: '# Inventor Tasks\n\n<!-- Checkbox list of questions and tasks for the inventor/applicant. -->\n\n',
    [p('02 USPTO Records/index.md')]: '# USPTO Records Index\n\n<!-- AI: maintain a chronological listing of all filings and office actions. -->\n',
    [p('03 Strategy/index.md')]: '# Strategy Index\n\n<!-- AI: maintain links to strategy notes and a running summary. -->\n',
    [p('04 Meetings/index.md')]: '# Meetings Index\n\n<!-- AI: maintain links to meeting notes with dates and summaries. -->\n',
    [p('05 Prior Art/index.md')]: PRIOR_ART_INDEX,
    [p('07 Remarks/index.md')]: '# Remarks Index\n\n<!-- AI: maintain links to remarks documents and a summary of arguments. -->\n',
    [p('07 Remarks/Remarks.md')]: '# Remarks\n\n',
  };
}

export async function createStructure(app: App, log: LogService): Promise<boolean> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    const msg = 'Open a file inside the target matter folder first.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  if (!activeFile.parent) {
    const msg = 'Cannot create structure at vault root. Open a file inside a subfolder first.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  const root = activeFile.parent.path;
  const instructionsPath = `${root}/AI Instructions.md`;

  if (app.vault.getAbstractFileByPath(instructionsPath)) {
    const msg = 'Structure already exists in this folder.';
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  log.info(`Creating structure in: ${root}`);

  for (const sub of SUBFOLDERS) {
    const path = `${root}/${sub}`;
    await app.vault.createFolder(path);
    log.info(`Created folder: ${sub}`);
  }

  const files = placeholderFiles(root);
  for (const [path, content] of Object.entries(files)) {
    await app.vault.create(path, content);
    log.info(`Created file: ${path.replace(root + '/', '')}`);
  }

  const msg = 'Matter structure created successfully.';
  log.success(msg);
  new Notice(msg);
  return true;
}
