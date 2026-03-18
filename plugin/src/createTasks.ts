import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { TASKS_INSTRUCTIONS_CONTENT } from './tasksInstructionsTemplate';

function placeholderFiles(root: string): Record<string, string> {
  const p = (sub: string) => `${root}/${sub}`;
  return {
    [p('AI Instructions.md')]: TASKS_INSTRUCTIONS_CONTENT,
    [p('index.md')]: '# Tasks Index\n\n<!-- AI: maintain links to task files and summary of open items. -->\n',
    [p('AI Tasks.md')]: '# AI Tasks\n\n<!-- Checkbox list of tasks assigned to the AI. Use subtasks and bullets as needed. -->\n\n',
    [p('User Tasks.md')]: '# User Tasks\n\n<!-- Checkbox list of tasks for the user. AI monitors this and may assist. -->\n\n',
    [p('Third Party Tasks.md')]: '# Third Party Tasks\n\n<!-- Checkbox list of questions and tasks for a third party (client, inventor, contractor, etc.). -->\n\n',
  };
}

export async function createTasks(app: App, log: LogService): Promise<boolean> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    const msg = 'Open a file inside the target folder first.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  if (!activeFile.parent) {
    const msg = 'Cannot create tasks at vault root. Open a file inside a subfolder first.';
    log.error(msg);
    new Notice(msg);
    return false;
  }

  const root = activeFile.parent.path;
  const instructionsPath = `${root}/AI Instructions.md`;

  if (app.vault.getAbstractFileByPath(instructionsPath)) {
    const msg = 'AI Instructions.md already exists in this folder.';
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  log.info(`Creating tasks folder in: ${root}`);

  const files = placeholderFiles(root);
  for (const [path, content] of Object.entries(files)) {
    await app.vault.create(path, content);
    log.info(`Created file: ${path.replace(root + '/', '')}`);
  }

  const msg = 'Tasks folder created successfully.';
  log.success(msg);
  new Notice(msg);
  return true;
}
