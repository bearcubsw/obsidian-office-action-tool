# V2 Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the matter folder scaffold, track changes workflow, backup naming, task archiving, AI instructions, and index management to match the v2 directory layout.

**Architecture:** The v1 structure nests Prior Art and Versions inside `02 Amendments and Remarks` and uses a separate `01 Track Changes Originals` folder for diffing baselines. V2 promotes Prior Art to root level, splits Remarks into its own folder, renames Prior Filings to USPTO Records, moves Tasks to #01, removes the originals folder (using the first version snapshot as baseline), and appends timestamps to backup filenames. Every folder except Amendments gets an `index.md` for Obsidian navigation.

**Tech Stack:** TypeScript, Obsidian API, Jest, diff-match-patch

---

## Structure Comparison

```
v1 (current code)                          v2 (target — from Sample_Directory)
─────────────────                          ─────────────────────────────────────
01 Prior Filings/                          01 Tasks/
02 Amendments and Remarks/                     AI Tasks.md
   01 Track Changes Originals/                 User Tasks.md
   02 Track Changes USPTO Markup/              Inventor Tasks.md
   03 Versions/                                Completed Task Log.md
   04 Prior Art/                               index.md
      index with Mermaid Timeline.md       02 USPTO Records/
   Remarks.md                                  index.md
03 Strategy/                               03 Strategy/
   Strategy Index.md                           index.md
04 Meetings/                               04 Meetings/
05 Tasks/                                      index.md
   AI Tasks.md                             05 Prior Art/
   User Tasks.md                               index.md  (Mermaid timeline content)
AI Instructions.md                         06 Amendments/
                                               01 Versions/
                                               02 USPTO Output/
                                           07 Remarks/
                                               Remarks.md
                                               index.md
                                           index.md  (root matter index)
                                           AI Instructions.md
```

## Key Behavioral Changes

1. **Track Changes — no more originals folder.** The first timestamped folder in `01 Versions/` serves as the baseline. Creating a backup IS priming. The prime-mode code path is removed entirely.
2. **Backup filenames get timestamps appended.** `spec.md` → `spec - 202603081047.md`. Track changes strips ` - YYYYMMDDHHMM` to match filenames.
3. **Archive Tasks renamed.** `Tasks Change Log.md` → `Completed Tasks Log.md`. New `Notes` column added. `Inventor Tasks.md` added as a source file (party: `Inventor`).
4. **Index files.** Every folder except `06 Amendments` gets an `index.md` with intro text and links. The AI is instructed to maintain these.
5. **Prior Art index standardized.** Renamed from `index with Mermaid Timeline.md` → `index.md` (Mermaid content stays inside).

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `plugin/src/matterUtils.ts` | Modify | New path constants for v2 folders |
| `plugin/src/createStructure.ts` | Modify | New SUBFOLDERS, placeholder files, index templates |
| `plugin/src/aiInstructionsTemplate.ts` | Rewrite | Full rewrite for v2 vault map, workflows, index management |
| `plugin/src/trackChanges.ts` | Modify | Remove prime mode; use first version as baseline; strip timestamp from filenames |
| `plugin/src/createBackup.ts` | Modify | New paths; append timestamp to filenames |
| `plugin/src/archiveTasks.ts` | Modify | Rename log file; add Notes column; add Inventor Tasks source |
| `plugin/src/SidebarPanel.ts` | Modify | Update tooltip strings for Track Changes and Archive Tasks |
| `plugin/tests/matterUtils.test.ts` | Modify | Update path assertions |
| `plugin/tests/createStructure.test.ts` | Modify | Update folder/file assertions |
| `plugin/tests/trackChanges.test.ts` | Rewrite | Remove prime-mode tests; add version-baseline tests |
| `plugin/tests/createBackup.test.ts` | Modify | Assert timestamp-appended filenames |
| `plugin/tests/archiveTasks.test.ts` | Modify | Assert new log filename, Notes column, Inventor Tasks |
| `docs/superpowers/specs/...design.md` | Modify | Update structure diagram and behavioral descriptions |

---

## Task 1: Update `matterPaths` in `matterUtils.ts`

**Files:**
- Modify: `plugin/src/matterUtils.ts:30-43`
- Test: `plugin/tests/matterUtils.test.ts`

- [ ] **Step 1: Write failing test for new path constants**

Update `matterUtils.test.ts` — add a new `describe('matterPaths')` block:

```typescript
describe('matterPaths', () => {
  test('returns correct v2 paths', () => {
    const paths = matterPaths('matter');
    expect(paths.tasks).toBe('matter/01 Tasks');
    expect(paths.usptoRecords).toBe('matter/02 USPTO Records');
    expect(paths.strategy).toBe('matter/03 Strategy');
    expect(paths.meetings).toBe('matter/04 Meetings');
    expect(paths.priorArt).toBe('matter/05 Prior Art');
    expect(paths.amendments).toBe('matter/06 Amendments');
    expect(paths.versions).toBe('matter/06 Amendments/01 Versions');
    expect(paths.usptoOutput).toBe('matter/06 Amendments/02 USPTO Output');
    expect(paths.remarks).toBe('matter/07 Remarks');
  });

  test('paths do not include legacy v1 paths', () => {
    const paths = matterPaths('matter') as any;
    expect(paths.priorFilings).toBeUndefined();
    expect(paths.originals).toBeUndefined();
    expect(paths.usptoMarkup).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && npx jest tests/matterUtils.test.ts --verbose`
Expected: FAIL — `paths.tasks` is `matter/05 Tasks`, etc.

- [ ] **Step 3: Implement new matterPaths**

Replace `matterPaths` in `matterUtils.ts`:

```typescript
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
```

- [ ] **Step 4: Update existing `findMatterRoot` tests that reference old folder names**

In `matterUtils.test.ts`, update the test "finds root when AI Instructions.md is one level up" to use `06 Amendments` instead of `02 Amendments and Remarks`, and "finds root when AI Instructions.md is two levels up" to use `06 Amendments/01 Versions` instead of `02 Amendments and Remarks/03 Versions`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd plugin && npx jest tests/matterUtils.test.ts --verbose`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add plugin/src/matterUtils.ts plugin/tests/matterUtils.test.ts
git commit -m "refactor: update matterPaths to v2 folder structure"
```

---

## Task 2: Update `createStructure.ts` — folders, placeholders, and index templates

**Files:**
- Modify: `plugin/src/createStructure.ts`
- Test: `plugin/tests/createStructure.test.ts`

- [ ] **Step 1: Write failing tests for new folder list and placeholder files**

Replace the folder and file assertions in `createStructure.test.ts`:

```typescript
test('creates all expected folders', async () => {
  const app = makeApp('matter/spec.md');
  const log = new LogService();
  await createStructure(app as any, log);
  const expectedFolders = [
    'matter/01 Tasks',
    'matter/02 USPTO Records',
    'matter/03 Strategy',
    'matter/04 Meetings',
    'matter/05 Prior Art',
    'matter/06 Amendments',
    'matter/06 Amendments/01 Versions',
    'matter/06 Amendments/02 USPTO Output',
    'matter/07 Remarks',
  ];
  for (const folder of expectedFolders) {
    expect(app.vault.folders.has(folder)).toBe(true);
  }
});

test('creates all expected placeholder files', async () => {
  const app = makeApp('matter/spec.md');
  const log = new LogService();
  await createStructure(app as any, log);
  const expectedFiles = [
    'matter/AI Instructions.md',
    'matter/index.md',
    'matter/01 Tasks/index.md',
    'matter/01 Tasks/AI Tasks.md',
    'matter/01 Tasks/User Tasks.md',
    'matter/01 Tasks/Inventor Tasks.md',
    'matter/02 USPTO Records/index.md',
    'matter/03 Strategy/index.md',
    'matter/04 Meetings/index.md',
    'matter/05 Prior Art/index.md',
    'matter/07 Remarks/index.md',
    'matter/07 Remarks/Remarks.md',
  ];
  for (const file of expectedFiles) {
    expect(app.vault.files.has(file)).toBe(true);
  }
});
```

Also update the `AI Instructions.md contains substantive content` test to assert v2 terms:

```typescript
test('AI Instructions.md contains substantive content', async () => {
  const app = makeApp('matter/spec.md');
  const log = new LogService();
  await createStructure(app as any, log);
  const content = app.vault.files.get('matter/AI Instructions.md') ?? '';
  expect(content).toContain('AI Instructions');
  expect(content).toContain('USPTO Records');
  expect(content).toContain('06 Amendments');
  expect(content).toContain('Task Management');
  expect(content).toContain('Claims Format');
});
```

Remove the `Remarks.md starts with # Remarks` test (Remarks.md now lives in `07 Remarks/`, checked by the placeholder files test).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugin && npx jest tests/createStructure.test.ts --verbose`
Expected: FAIL

- [ ] **Step 3: Implement new SUBFOLDERS and placeholderFiles**

Replace SUBFOLDERS:

```typescript
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
```

Replace `PRIOR_ART_INDEX` with a more general index template approach:

```typescript
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
```

Replace `placeholderFiles`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugin && npx jest tests/createStructure.test.ts --verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add plugin/src/createStructure.ts plugin/tests/createStructure.test.ts
git commit -m "refactor: update createStructure for v2 folder layout with index files"
```

---

## Task 3: Rewrite `aiInstructionsTemplate.ts`

**Files:**
- Rewrite: `plugin/src/aiInstructionsTemplate.ts`

No separate test file — tested indirectly via `createStructure.test.ts` content assertions.

- [ ] **Step 1: Rewrite the template**

Full replacement of `AI_INSTRUCTIONS_CONTENT`. Key sections:

1. **Vault Map** — updated to v2 folders with index.md management instructions
2. **File Naming Conventions** — unchanged
3. **Your Role** — updated paths (01 Tasks, etc.)
4. **Task Management** — add Inventor Tasks, reference Completed Task Log
5. **Index Management** — NEW section: AI must maintain `index.md` in every folder (except 06 Amendments) with introductions and links for Obsidian navigation
6. **Prior Art Management** — updated path (05 Prior Art), reference `index.md` instead of `index with Mermaid Timeline.md`
7. **Claims Format** — unchanged
8. **Track Changes Workflow** — updated: "Create Backup to establish baseline" replaces "prime originals"; reference `01 Versions/` as baseline source; output goes to `02 USPTO Output/`
9. **Communication Style** — add: questions for inventor go to `01 Tasks/Inventor Tasks.md`

The template content (full text to be written during implementation — key changes summarized here for review):

```typescript
export const AI_INSTRUCTIONS_CONTENT = `# AI Instructions — Patent Prosecution Vault

## Vault Map

- **index.md** — Matter overview and navigation hub. AI: keep updated.
- **01 Tasks/** — Action items for all parties.
  - **AI Tasks.md** — Your task list. Execute and mark complete.
  - **User Tasks.md** — Attorney tasks. Monitor and offer help.
  - **Inventor Tasks.md** — Questions and tasks for the inventor/applicant.
  - **Completed Task Log.md** — Auto-generated log of archived tasks.
  - **index.md** — Summary of open items and links to task files.
- **02 USPTO Records/** — Original USPTO documents. Read-only reference.
  - **index.md** — Chronological listing of filings and office actions.
- **03 Strategy/** — Strategic notes and analysis.
  - **index.md** — Running summary and links to strategy notes.
- **04 Meetings/** — Meeting notes (YYYYMMDD -- Description format).
  - **index.md** — Links to meeting notes with summaries.
- **05 Prior Art/** — Prior art references, one subfolder per reference.
  - **index.md** — Reference listing with Mermaid Gantt timeline.
- **06 Amendments/** — Active working documents for claim/spec/abstract amendments.
  - **01 Versions/** — Timestamped backups. First version = track changes baseline.
  - **02 USPTO Output/** — Generated track-changes markup. Do not modify manually.
- **07 Remarks/** — Attorney remarks / arguments for the current response.
  - **Remarks.md** — The remarks document.
  - **index.md** — Summary of arguments and links.
- **AI Instructions.md** — This file. Your operating directive.

## Index Management

You are responsible for maintaining the index.md file in every folder (except 06 Amendments).
Each index.md should contain:
1. A brief introduction describing the folder's purpose and current state
2. Links to all files and subfolders within
3. A narrative summary that helps the reader navigate via Obsidian

Update indexes whenever files are added, removed, or significantly changed.

## File Naming Conventions
...
(unchanged from v1)

## Your Role
...

### Task Management
- Read 01 Tasks/AI Tasks.md at the start of each session
- Execute open tasks and mark complete when done
- Review 01 Tasks/User Tasks.md — assist where you can
- Add questions for the inventor to 01 Tasks/Inventor Tasks.md
- Completed tasks are archived to Completed Task Log.md by the plugin

### Prior Art Management
When references are added to 05 Prior Art/:
1. Create a subfolder for each reference (e.g., 01 US12345678 Widget/)
2. Update 05 Prior Art/index.md: add entry with reference number, title, date, key claims
3. Update the Mermaid Gantt chart in the index
4. Note in AI Tasks.md if further analysis is needed

...

## Track Changes Workflow

1. Place working copies of spec, claims, and abstract in 06 Amendments/
2. Click "Create Backup" to snapshot current state to 01 Versions/ (first backup = baseline)
3. Edit working documents in 06 Amendments/
4. Click "Track Changes" to generate USPTO-formatted markup in 02 USPTO Output/
5. To start a fresh cycle: create a new backup, then edit and re-run Track Changes

...
`;
```

- [ ] **Step 2: Run createStructure tests to verify content assertions pass**

Run: `cd plugin && npx jest tests/createStructure.test.ts --verbose`
Expected: PASS (the test checks for `USPTO Records`, `06 Amendments`, `Task Management`, `Claims Format`)

- [ ] **Step 3: Commit**

```bash
git add plugin/src/aiInstructionsTemplate.ts
git commit -m "rewrite: AI Instructions template for v2 structure and index management"
```

---

## Task 4: Update `trackChanges.ts` — use first version as baseline

**Files:**
- Modify: `plugin/src/trackChanges.ts`
- Test: `plugin/tests/trackChanges.test.ts`

This is the most significant behavioral change. The two-phase prime/diff system is replaced with a single diff operation that reads baselines from the first version snapshot.

- [ ] **Step 1: Write new tests**

Replace `trackChanges.test.ts` entirely:

```typescript
import { trackChanges } from '../src/trackChanges';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupMatter(root: string) {
  const app = new MockApp();
  app.vault.files.set(`${root}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(root);
  app.vault.folders.add(`${root}/06 Amendments`);
  app.vault.folders.add(`${root}/06 Amendments/01 Versions`);
  app.vault.folders.add(`${root}/06 Amendments/02 USPTO Output`);
  app.workspace.setActiveFile(makeFile(`${root}/06 Amendments/spec.md`));
  return app;
}

describe('trackChanges', () => {
  test('returns false when no matter root found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/file.md'));
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
  });

  test('warns when no version snapshots exist (no baseline)', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/06 Amendments/spec.md', '# Spec');
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'warn')).toBe(true);
  });

  test('uses first version folder as baseline (not latest)', async () => {
    const app = setupMatter('matter');
    // First version — the baseline
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      '# Specification\n\nOriginal text.'
    );
    // Second version — should be ignored for baseline
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603091000');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603091000/spec - 202603091000.md',
      '# Specification\n\nIntermediate text.'
    );
    // Current working copy
    app.vault.files.set('matter/06 Amendments/spec.md',
      '# Specification\n\nAmended text.'
    );
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get(
      'matter/06 Amendments/02 USPTO Output/spec.md'
    ) ?? '';
    // Should diff against "Original text." not "Intermediate text."
    expect(output).toContain('Original');
  });

  test('strips timestamp suffix from version filenames to match current files', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/claims - 202603080900.md',
      '1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.'
    );
    app.vault.files.set('matter/06 Amendments/claims.md',
      '1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.'
    );
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/06 Amendments/02 USPTO Output/claims.md')).toBe(true);
  });

  test('writes output to 02 USPTO Output/', async () => {
    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/spec - 202603080900.md',
      '# Spec\n\nOld text.'
    );
    app.vault.files.set('matter/06 Amendments/spec.md', '# Spec\n\nNew text.');
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/06 Amendments/02 USPTO Output/spec.md')).toBe(true);
  });

  test('claims file gets status markers in output', async () => {
    const originalClaims = '1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.';
    const currentClaims = '1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.';

    const app = setupMatter('matter');
    app.vault.folders.add('matter/06 Amendments/01 Versions/202603080900');
    app.vault.files.set(
      'matter/06 Amendments/01 Versions/202603080900/claims - 202603080900.md',
      originalClaims
    );
    app.vault.files.set('matter/06 Amendments/claims.md', currentClaims);
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/06 Amendments/02 USPTO Output/claims.md') ?? '';
    expect(output).toContain('(Currently Amended)');
    expect(output).toContain('(Original)');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugin && npx jest tests/trackChanges.test.ts --verbose`
Expected: FAIL

- [ ] **Step 3: Implement new trackChanges logic**

Replace `trackChanges.ts`:

```typescript
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

  // Find the first (earliest) version folder as baseline
  const allFiles = app.vault.getMarkdownFiles();
  const versionFolders = [...app.vault.getAllLoadedFiles()]
    .filter(f => 'children' in f && f.path.startsWith(versionsDir + '/'))
    .map(f => f.path)
    .filter(p => p.split('/').length === versionsDir.split('/').length + 1)
    .sort();

  if (versionFolders.length === 0) {
    const msg = 'No version snapshots found — click Create Backup first to establish a baseline.';
    log.warn(msg);
    new Notice(msg);
    return false;
  }

  const baselineDir = versionFolders[0];
  log.info(`Using baseline: ${baselineDir.split('/').pop()}`);

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
```

**Note:** The `getAllLoadedFiles()` approach for finding version folders may need adjustment based on what the MockApp supports. The core logic is: find folders that are direct children of `01 Versions/`, sort alphabetically (which sorts chronologically since names are timestamps), take the first one.

- [ ] **Step 4: Verify MockApp supports the needed API (may need to add `getAllLoadedFiles` to helpers.ts)**

Check `plugin/tests/helpers.ts` and add mock support for folder listing if needed. The mock needs to return folder objects from `getAllLoadedFiles()` that have `children` property and `path`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd plugin && npx jest tests/trackChanges.test.ts --verbose`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add plugin/src/trackChanges.ts plugin/tests/trackChanges.test.ts plugin/tests/helpers.ts
git commit -m "refactor: trackChanges uses first version snapshot as baseline, removes prime mode"
```

---

## Task 5: Update `createBackup.ts` — new paths and timestamp-appended filenames

**Files:**
- Modify: `plugin/src/createBackup.ts`
- Test: `plugin/tests/createBackup.test.ts`

- [ ] **Step 1: Write failing tests for new behavior**

Update `createBackup.test.ts`:

```typescript
// Update setupApp to use v2 paths
function setupApp(matterRoot: string, mdFiles: string[], hasFolders = true) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  if (hasFolders) {
    app.vault.folders.add(`${matterRoot}/06 Amendments`);
  }
  for (const name of mdFiles) {
    app.vault.files.set(`${matterRoot}/06 Amendments/${name}`, `# ${name}`);
  }
  app.workspace.setActiveFile(makeFile(`${matterRoot}/06 Amendments/spec.md`));
  return app;
}

test('creates timestamped folder in 01 Versions/', async () => {
  const app = setupApp('matter', ['spec.md', 'claims.md']);
  app.vault.folders.add('matter/06 Amendments/01 Versions');
  const log = new LogService();
  await createBackup(app as any, log);
  const versionFolders = Array.from(app.vault.folders).filter(f =>
    f.startsWith('matter/06 Amendments/01 Versions/') &&
    /\/\d{12}$/.test(f)
  );
  expect(versionFolders).toHaveLength(1);
});

test('appends timestamp to copied filenames', async () => {
  const app = setupApp('matter', ['spec.md', 'claims.md']);
  app.vault.folders.add('matter/06 Amendments/01 Versions');
  const log = new LogService();
  await createBackup(app as any, log);
  const versionFolders = Array.from(app.vault.folders).filter(f =>
    /\/\d{12}$/.test(f)
  );
  const versionRoot = versionFolders[0];
  const timestamp = versionRoot.split('/').pop()!;
  expect(app.vault.files.has(`${versionRoot}/spec - ${timestamp}.md`)).toBe(true);
  expect(app.vault.files.has(`${versionRoot}/claims - ${timestamp}.md`)).toBe(true);
});

test('creates 01 Versions/ folder if it does not exist', async () => {
  const app = setupApp('matter', ['spec.md']);
  const log = new LogService();
  await createBackup(app as any, log);
  expect(app.vault.folders.has('matter/06 Amendments/01 Versions')).toBe(true);
});

test('warns when no .md files present', async () => {
  const app = setupApp('matter', []);
  app.vault.folders.add('matter/06 Amendments/01 Versions');
  const log = new LogService();
  await createBackup(app as any, log);
  expect(log.entries.some(e => e.level === 'warn' && e.message.includes('06 Amendments'))).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugin && npx jest tests/createBackup.test.ts --verbose`

- [ ] **Step 3: Implement updated createBackup**

Key changes in `createBackup.ts`:
- Use `paths.amendments` (now `06 Amendments`) and `paths.versions` (now `06 Amendments/01 Versions`)
- When copying files, rename from `spec.md` to `spec - {timestamp}.md`:

```typescript
for (const file of amendmentFiles) {
  const baseName = file.name.replace(/\.md$/, '');
  const destName = `${baseName} - ${timestamp}.md`;
  const destPath = `${snapshotDir}/${destName}`;
  await app.vault.copy(file, destPath);
  log.info(`Copied: ${file.name} → ${destName}`);
}
```

Update log messages to reference `01 Versions/` and `06 Amendments/`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugin && npx jest tests/createBackup.test.ts --verbose`

- [ ] **Step 5: Commit**

```bash
git add plugin/src/createBackup.ts plugin/tests/createBackup.test.ts
git commit -m "refactor: createBackup uses v2 paths and appends timestamp to filenames"
```

---

## Task 6: Update `archiveTasks.ts` — rename log, add Inventor Tasks, add Notes column

**Files:**
- Modify: `plugin/src/archiveTasks.ts`
- Test: `plugin/tests/archiveTasks.test.ts`

- [ ] **Step 1: Write failing tests for new behavior**

Key test changes:
- All paths switch from `05 Tasks` to `01 Tasks`
- Log filename: `Completed Task Log.md` instead of `Tasks Change Log.md`
- Table has a `Notes` column: `| # | Party | Task | Notes | Date-Time |`
- `Inventor Tasks.md` with party `Inventor` is a source file

```typescript
// Update setupApp paths
function setupApp(matterRoot: string, aiContent: string, userContent: string, logContent?: string, inventorContent?: string) {
  const app = new MockApp();
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  app.vault.folders.add(`${matterRoot}/01 Tasks`);
  app.vault.files.set(`${matterRoot}/01 Tasks/AI Tasks.md`, aiContent);
  app.vault.files.set(`${matterRoot}/01 Tasks/User Tasks.md`, userContent);
  if (inventorContent !== undefined) {
    app.vault.files.set(`${matterRoot}/01 Tasks/Inventor Tasks.md`, inventorContent);
  }
  if (logContent !== undefined) {
    app.vault.files.set(`${matterRoot}/01 Tasks/Completed Task Log.md`, logContent);
  }
  app.workspace.setActiveFile(makeFile(`${matterRoot}/01 Tasks/AI Tasks.md`));
  return app;
}

test('creates Completed Task Log when it does not exist', async () => {
  const app = setupApp('matter', '# AI Tasks\n\n- [x] Draft the claims\n', '# User Tasks\n');
  const log = new LogService();
  await archiveTasks(app as any, log);
  expect(app.vault.files.has('matter/01 Tasks/Completed Task Log.md')).toBe(true);
});

test('log table includes Notes column', async () => {
  const app = setupApp('matter', '# AI Tasks\n\n- [x] Draft the claims\n', '# User Tasks\n');
  const log = new LogService();
  await archiveTasks(app as any, log);
  const logContent = app.vault.files.get('matter/01 Tasks/Completed Task Log.md')!;
  expect(logContent).toContain('| Notes |');
});

test('archives tasks from Inventor Tasks.md with Inventor party', async () => {
  const app = setupApp('matter', '# AI Tasks\n', '# User Tasks\n', undefined,
    '# Inventor Tasks\n\n- [x] Provide prior art dates\n');
  const log = new LogService();
  await archiveTasks(app as any, log);
  const logContent = app.vault.files.get('matter/01 Tasks/Completed Task Log.md')!;
  expect(logContent).toContain('| Inventor |');
  expect(logContent).toContain('Provide prior art dates');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugin && npx jest tests/archiveTasks.test.ts --verbose`

- [ ] **Step 3: Implement changes in archiveTasks.ts**

Key changes:
- `LOG_FILENAME = 'Completed Task Log.md'`
- Add `{ filename: 'Inventor Tasks.md', party: 'Inventor' }` to `SOURCE_FILES`
- Table header: `| # | Party | Task | Notes | Date-Time |` with corresponding separator row
- New rows: `| ${num} | ${party} | ${safeText} | | ${today} |` (Notes column empty by default)
- Update warning message: `'No completed tasks ( - [x] ) found in AI Tasks, User Tasks, or Inventor Tasks.'`
- Update success message: `'Archived ${n} completed ${noun} to Completed Task Log.'`
- Title when creating: `# Completed Tasks Log — ${folderName}`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugin && npx jest tests/archiveTasks.test.ts --verbose`

- [ ] **Step 5: Commit**

```bash
git add plugin/src/archiveTasks.ts plugin/tests/archiveTasks.test.ts
git commit -m "refactor: archiveTasks uses v2 paths, Completed Task Log, Notes column, Inventor Tasks"
```

---

## Task 7: Update design spec

**Files:**
- Modify: `docs/superpowers/specs/2026-03-17-obsidian-office-action-tool-design.md`

- [ ] **Step 1: Update the folder tree diagram** (lines 72-89)

Replace with v2 structure.

- [ ] **Step 2: Update placeholder file list** (lines 91-136)

Add index.md files, Inventor Tasks.md, rename Remarks.md path to `07 Remarks/Remarks.md`.

- [ ] **Step 3: Update AI Instructions section** (lines 138-153)

Reference new folder numbers, index management, Inventor Tasks.

- [ ] **Step 4: Update Create Backup section** (lines 156-174)

Reference `06 Amendments/`, `01 Versions/`, timestamp-appended filenames.

- [ ] **Step 5: Update Track Changes section** (lines 177-260)

Remove prime mode description. Document version-baseline approach. Reference `02 USPTO Output/`. Document timestamp-stripping filename matching.

- [ ] **Step 6: Update sidebar panel section** (line 276)

Track Changes tooltip: "Generate USPTO-formatted track changes from version baseline"

- [ ] **Step 7: Update Key Design Decisions table** (lines 298-313)

- Remove "Originals reset" row
- Update "Backup scope" to reference `06 Amendments/`
- Add row for "Version baseline" decision
- Add row for "Backup filenames" — timestamp-appended for Obsidian disambiguation

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/specs/2026-03-17-obsidian-office-action-tool-design.md
git commit -m "docs: update design spec for v2 folder structure"
```

---

## Task 8: Clean up Sample_Directory

**Files:**
- Delete: `docs/Sample_Directory/06 Amendments/Remarks.md` (leftover)
- Rename: `docs/Sample_Directory/05 Prior Art/index with Mermaid Timeline.md` → verify if user wants to keep this name or standardize to `index.md`
- Add: `docs/Sample_Directory/01 Tasks/index.md`, root `index.md`, etc. if not already present

- [ ] **Step 1: Remove `06 Amendments/Remarks.md`**
- [ ] **Step 2: Verify index.md files exist in all folders except 06 Amendments**
- [ ] **Step 3: Commit**

```bash
git add docs/Sample_Directory/
git commit -m "chore: clean up Sample_Directory to match v2 structure"
```

---

## Task 9: Update memory

- [ ] **Step 1: Update `feedback_matter_structure_v2.md`** to reflect the actual v2 numbering

The current memory has the wrong numbering (01 Prior Filings, etc.). Update to match reality:
- 01 Tasks
- 02 USPTO Records
- 03 Strategy
- 04 Meetings
- 05 Prior Art
- 06 Amendments (with 01 Versions, 02 USPTO Output)
- 07 Remarks

---

## Decision Points for User

Before executing, these need confirmation:

1. **Prior Art index filename:** The sample has `index with Mermaid Timeline.md`. Plan standardizes to `index.md` (with Mermaid content inside). Confirm?
2. **Strategy Index.md / Meetings Index.md:** v1 creates these named files. Plan replaces them with `index.md`. Confirm no separate named index files needed?
3. **06 Amendments index.md:** User said "maybe the index would just get in the way." Plan excludes it. The sample directory has an empty one — should it be removed from the sample?
4. **Track changes: `getAllLoadedFiles` vs folder listing:** The MockApp in tests may need a new method to list folders. Need to verify the mock supports this pattern or adapt the implementation to use a different discovery approach (e.g., scanning `getMarkdownFiles()` paths to infer version folders).
