import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { AI_INSTRUCTIONS_CONTENT } from './aiInstructionsTemplate';

const SUBFOLDERS = [
  '01 Prior Filings',
  '02 Amendments and Remarks',
  '02 Amendments and Remarks/01 Track Changes Originals',
  '02 Amendments and Remarks/02 Track Changes USPTO Markup',
  '02 Amendments and Remarks/03 Versions',
  '02 Amendments and Remarks/04 Prior Art',
  '03 Strategy',
  '04 Meetings',
  '05 Tasks',
];

const PRIOR_ART_INDEX = `# Prior Art Index

## References

<!-- Add prior art entries here. Each reference should have a subfolder under 04 Prior Art/. -->

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
    [p('02 Amendments and Remarks/Remarks.md')]: '# Remarks\n\n',
    [p('02 Amendments and Remarks/04 Prior Art/index with Mermaid Timeline.md')]: PRIOR_ART_INDEX,
    [p('03 Strategy/Strategy Index.md')]: '# Strategy Index\n\n',
    [p('05 Tasks/AI Tasks.md')]: '# AI Tasks\n\n<!-- Checkbox list of tasks assigned to the AI. Use subtasks and bullets as needed. -->\n\n',
    [p('05 Tasks/User Tasks.md')]: '# User Tasks\n\n<!-- Checkbox list of tasks for the attorney/user. AI monitors this and may assist. -->\n\n',
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
