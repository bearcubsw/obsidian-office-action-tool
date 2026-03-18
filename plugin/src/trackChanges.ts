import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { findMatterRoot, matterPaths } from './matterUtils';
import { isClaimsDocument, parseClaims, diffClaims, serializeClaims } from './claimsParser';
import { diffProse } from './proseDiff';

/** Strip " - YYYYMMDDHHMM" suffix from a filename to get the base name. */
function stripTimestampSuffix(filename: string): string {
  return filename.replace(/ - \d{12}(?=\.md$)/, '');
}

export async function trackChanges(app: App, log: LogService): Promise<boolean> {
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
  const outputDir = paths.usptoOutput;

  const allFiles = app.vault.getMarkdownFiles();

  // Discover version folder timestamps from file paths under 01 Versions/
  const versionTimestamps = new Set(
    allFiles
      .map(f => f.path)
      .filter(p => p.startsWith(versionsDir + '/'))
      .map(p => p.slice(versionsDir.length + 1).split('/')[0])
      .filter(seg => /^\d{12}$/.test(seg))
  );
  const sortedTimestamps = [...versionTimestamps].sort();

  if (sortedTimestamps.length === 0) {
    const msg = 'No version snapshots found — click Create Backup first to establish a baseline.';
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  const baselineDir = `${versionsDir}/${sortedTimestamps[0]}`;
  log.info(`Using baseline: ${sortedTimestamps[0]}`);

  // Collect current amendment files (direct children of 06 Amendments/)
  const amendmentFiles = allFiles.filter(f => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'));
    return parent === amendmentsDir;
  });

  // Collect baseline files, mapping stripped name → file
  const baselineFiles = allFiles.filter(f => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'));
    return parent === baselineDir;
  });
  const baselineByName = new Map(
    baselineFiles.map(f => [stripTimestampSuffix(f.name), f])
  );

  let processedCount = 0;

  for (const file of amendmentFiles) {
    const baselineFile = baselineByName.get(file.name);
    if (!baselineFile) {
      log.warn(`No baseline found for ${file.name} — skipping`);
      continue;
    }

    const currentContent = await app.vault.read(file);
    const baselineContent = await app.vault.read(baselineFile);

    let output: string;
    if (isClaimsDocument(currentContent)) {
      log.info(`Processing claims file: ${file.name}`);
      const origClaims = parseClaims(baselineContent);
      const currClaims = parseClaims(currentContent);
      const diffed = diffClaims(origClaims, currClaims);
      output = serializeClaims(diffed);
    } else {
      log.info(`Processing prose file: ${file.name}`);
      output = diffProse(baselineContent, currentContent);
    }

    const outputPath = `${outputDir}/${file.name}`;
    const existingOutput = app.vault.getAbstractFileByPath(outputPath);
    if (existingOutput && 'path' in existingOutput) {
      await app.vault.modify(existingOutput as any, output);
    } else {
      await app.vault.create(outputPath, output);
    }
    log.success(`Generated: 02 USPTO Output/${file.name}`);
    processedCount++;
  }

  const msg = `Track changes complete (${processedCount} files).`;
  log.success(msg);
  new Notice(msg);
  return true;
}
