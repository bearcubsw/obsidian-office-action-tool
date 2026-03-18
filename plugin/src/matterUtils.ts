import { App } from 'obsidian';

/** Walk up from the active file to find the folder containing AI Instructions.md.
 *  Step 0 = file's own parent folder. Max 6 levels up. Returns folder path or null. */
export async function findMatterRoot(app: App): Promise<string | null> {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile || !activeFile.parent) return null;

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
    tasks:        p('01 Tasks'),
    usptoRecords: p('02 USPTO Records'),
    strategy:     p('03 Strategy'),
    meetings:     p('04 Meetings'),
    priorArt:     p('05 Prior Art'),
    amendments:   p('06 Amendments'),
    versions:     p('06 Amendments/01 Versions'),
    usptoOutput:  p('06 Amendments/02 USPTO Output'),
    remarks:      p('07 Remarks'),
  };
}
