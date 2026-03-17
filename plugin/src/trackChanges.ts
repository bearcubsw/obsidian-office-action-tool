import { App, Notice } from 'obsidian';
import { LogService } from './LogService';
import { findMatterRoot, matterPaths } from './matterUtils';
import { isClaimsDocument, parseClaims, diffClaims, serializeClaims } from './claimsParser';
import { diffProse } from './proseDiff';

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
  const originalsDir = paths.originals;
  const markupDir = paths.usptoMarkup;

  // Collect .md files directly in amendments root
  const allFiles = app.vault.getMarkdownFiles();
  const amendmentFiles = allFiles.filter(f => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'));
    return parent === amendmentsDir;
  });

  // Check if originals have been primed
  const originalFiles = allFiles.filter(f => {
    const parent = f.path.substring(0, f.path.lastIndexOf('/'));
    return parent === originalsDir;
  });

  if (originalFiles.length === 0) {
    // Prime mode: copy current files to originals
    log.info('No originals found — priming originals...');
    for (const file of amendmentFiles) {
      const destPath = `${originalsDir}/${file.name}`;
      await app.vault.copy(file, destPath);
      log.info(`Primed original: ${file.name}`);
    }
    const msg = `Originals saved (${amendmentFiles.length} files) — click Track Changes again to generate markup.`;
    log.success(msg);
    new Notice(msg);
    return true;
  }

  // Diff mode: generate track changes per file
  const origByName = new Map(originalFiles.map(f => [f.name, f]));
  let processedCount = 0;

  for (const file of amendmentFiles) {
    const origFile = origByName.get(file.name);
    if (!origFile) {
      log.warn(`No original found for ${file.name} — skipping`);
      continue;
    }

    const currentContent = await app.vault.read(file);
    const originalContent = await app.vault.read(origFile);

    let output: string;
    if (isClaimsDocument(currentContent)) {
      log.info(`Processing claims file: ${file.name}`);
      const origClaims = parseClaims(originalContent);
      const currClaims = parseClaims(currentContent);
      const diffed = diffClaims(origClaims, currClaims);
      output = serializeClaims(diffed);
    } else {
      log.info(`Processing prose file: ${file.name}`);
      output = diffProse(originalContent, currentContent);
    }

    const outputPath = `${markupDir}/${file.name}`;
    const existingOutput = app.vault.getAbstractFileByPath(outputPath);
    if (existingOutput && 'path' in existingOutput) {
      await app.vault.modify(existingOutput as any, output);
    } else {
      await app.vault.create(outputPath, output);
    }
    log.success(`Generated: 02 Track Changes USPTO Markup/${file.name}`);
    processedCount++;
  }

  const msg = `Track changes complete (${processedCount} files).`;
  log.success(msg);
  new Notice(msg);
  return true;
}
