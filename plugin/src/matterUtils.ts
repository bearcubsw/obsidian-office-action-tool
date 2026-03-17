import { App } from 'obsidian';

/** Walk up from the active file to find the folder containing AI Instructions.md.
 *  Step 0 = file's own parent folder. Max 6 levels up. Returns folder path or null. */
export async function findMatterRoot(app: App): Promise<string | null> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) return null;

  let folderPath: string = activeFile.parent.path;

  for (let depth = 0; depth <= 6; depth++) {
    const candidate = folderPath
      ? `${folderPath}/AI Instructions.md`
      : 'AI Instructions.md';

    if (app.vault.getAbstractFileByPath(candidate)) {
      return folderPath || '';
    }

    // Walk up one level by trimming the last path segment
    const lastSlash = folderPath.lastIndexOf('/');
    if (lastSlash < 0) break; // already at vault root
    folderPath = folderPath.substring(0, lastSlash);
  }

  return null;
}

/** Build paths for the standard subdirectories relative to a matter root. */
export function matterPaths(root: string) {
  const p = (sub: string) => root ? `${root}/${sub}` : sub;
  return {
    priorFilings: p('01 Prior Filings'),
    amendments: p('02 Amendments and Remarks'),
    originals: p('02 Amendments and Remarks/01 Track Changes Originals'),
    usptoMarkup: p('02 Amendments and Remarks/02 Track Changes USPTO Markup'),
    versions: p('02 Amendments and Remarks/03 Versions'),
    priorArt: p('02 Amendments and Remarks/04 Prior Art'),
    strategy: p('03 Strategy'),
    meetings: p('04 Meetings'),
    tasks: p('05 Tasks'),
  };
}
