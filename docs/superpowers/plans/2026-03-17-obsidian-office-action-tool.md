# Obsidian Office Action Tool — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript Obsidian plugin with a right-sidebar panel providing three patent prosecution tools (Create Structure, Create Backup, Track Changes) plus a footnote panel and activity log.

**Architecture:** Matter root detection anchors Backup and Track Changes to the vault folder containing `AI Instructions.md`. Create Structure uses the active file's parent folder directly (structure doesn't exist yet). All tool functions accept `app: App` and `log: LogService` for testability. The sidebar panel is an Obsidian `ItemView` wiring UI to those functions.

**Tech Stack:** TypeScript, esbuild, Obsidian API (≥1.4.0), `diff-match-patch`, Jest + ts-jest for unit tests.

**Spec:** `docs/superpowers/specs/2026-03-17-obsidian-office-action-tool-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `plugin/src/main.ts` | Plugin entry: register view, register commands, activate sidebar |
| `plugin/src/SidebarPanel.ts` | `ItemView` with 3 tabs: Actions, Notes, Log |
| `plugin/src/LogService.ts` | Timestamped log entries; instantiated in main.ts, passed by reference |
| `plugin/src/matterUtils.ts` | Walk up from active file to find folder containing `AI Instructions.md` |
| `plugin/src/createStructure.ts` | Create folder tree, placeholder files, AI Instructions.md in active file's parent |
| `plugin/src/createBackup.ts` | Copy `.md` files from `02 Amendments and Remarks/` to timestamped `03 Versions/` subfolder |
| `plugin/src/trackChanges.ts` | Orchestrate: prime mode or diff mode; detect file type; write output |
| `plugin/src/claimsParser.ts` | Parse claims markdown into structured objects; reconstruct with status markers |
| `plugin/src/proseDiff.ts` | Strip markup, paragraph pre-pass for moves, run `diff-match-patch`, format output |
| `plugin/src/aiInstructionsTemplate.ts` | Full `AI Instructions.md` content as an exported string constant |
| `plugin/manifest.json` | Obsidian plugin metadata |
| `plugin/package.json` | Dependencies and scripts |
| `plugin/tsconfig.json` | TypeScript config |
| `plugin/esbuild.config.mjs` | Build/watch script |
| `plugin/jest.config.js` | Jest configuration |
| `plugin/tests/__mocks__/obsidian.ts` | Obsidian API mock for Jest |
| `plugin/tests/helpers.ts` | `MockApp`, `MockVault`, `MockWorkspace`, file/folder builder utilities |
| `plugin/tests/logService.test.ts` | LogService unit tests |
| `plugin/tests/matterUtils.test.ts` | Matter root detection unit tests |
| `plugin/tests/createStructure.test.ts` | Structure creation unit tests |
| `plugin/tests/createBackup.test.ts` | Backup unit tests |
| `plugin/tests/claimsParser.test.ts` | Claims parser unit tests |
| `plugin/tests/proseDiff.test.ts` | Prose diff unit tests |
| `plugin/tests/trackChanges.test.ts` | Track changes integration tests |

---

## Task 1: Project Scaffold

**Files:**
- Create: `plugin/manifest.json`
- Create: `plugin/package.json`
- Create: `plugin/tsconfig.json`
- Create: `plugin/esbuild.config.mjs`
- Create: `plugin/jest.config.js`
- Create: `plugin/.gitignore`

- [ ] **Step 1: Create the plugin directory structure**

```bash
mkdir -p "c:/Dev/Obsidian-Office-Action-Tool/plugin/src"
mkdir -p "c:/Dev/Obsidian-Office-Action-Tool/plugin/tests/__mocks__"
```

- [ ] **Step 2: Create `plugin/manifest.json`**

```json
{
  "id": "office-action-tool",
  "name": "Office Action Tool",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "Patent prosecution workflow tools: Create Structure, Backup, and Track Changes.",
  "author": "",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

- [ ] **Step 3: Create `plugin/package.json`**

```json
{
  "name": "obsidian-office-action-tool",
  "version": "0.1.0",
  "description": "Patent prosecution workflow tools for Obsidian",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit --skipLibCheck && node esbuild.config.mjs production",
    "test": "jest"
  },
  "license": "MIT",
  "devDependencies": {
    "@types/diff-match-patch": "^1.0.36",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.5",
    "builtin-modules": "^3.3.0",
    "esbuild": "0.19.12",
    "jest": "^29.7.0",
    "obsidian": "latest",
    "ts-jest": "^29.1.2",
    "tslib": "2.6.2",
    "typescript": "5.3.3"
  },
  "dependencies": {
    "diff-match-patch": "^1.0.5"
  }
}
```

- [ ] **Step 4: Create `plugin/tsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "noEmit": true,
    "lib": ["ES2018", "DOM"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Create `plugin/esbuild.config.mjs`**

```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: {
    js: `/*\nTHIS IS A GENERATED/BUNDLED FILE BY ESBUILD\nSee the source at the GitHub repository.\n*/`
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian", "electron",
    "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands",
    "@codemirror/language", "@codemirror/lint", "@codemirror/search",
    "@codemirror/state", "@codemirror/view",
    "@lezer/common", "@lezer/highlight", "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 6: Create `plugin/jest.config.js`**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/tests/__mocks__/obsidian.ts'
  },
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        allowImportingTsExtensions: false
      }
    }]
  }
};
```

- [ ] **Step 7: Create `plugin/.gitignore`**

```
node_modules/
main.js
*.js.map
```

- [ ] **Step 8: Install dependencies**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm install
```

Expected: `node_modules/` created, no errors. `diff-match-patch` and `@types/diff-match-patch` installed under `node_modules/`.

---

## Task 2: Obsidian Mock and Test Helpers

**Files:**
- Create: `plugin/tests/__mocks__/obsidian.ts`
- Create: `plugin/tests/helpers.ts`

These mocks replace the real Obsidian API in Jest. The mock vault is in-memory and tracks which folders and files have been created.

- [ ] **Step 1: Create `plugin/tests/__mocks__/obsidian.ts`**

```typescript
// Minimal Obsidian API surface needed by this plugin's tests.
// Extend as needed when new API calls are introduced.

export class Notice {
  message: string;
  constructor(message: string, _timeout?: number) {
    this.message = message;
  }
}

export abstract class ItemView {
  containerEl: HTMLElement = document.createElement('div');
  app: any;
  leaf: any;
  constructor(leaf: any) { this.leaf = leaf; }
  abstract getViewType(): string;
  abstract getDisplayText(): string;
  onOpen(): Promise<void> { return Promise.resolve(); }
  onClose(): Promise<void> { return Promise.resolve(); }
  registerEvent(_event: any): void {}
}

export class Plugin {
  app: any;
  manifest: any;
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  registerView(_type: string, _creator: any): void {}
  addCommand(_cmd: any): void {}
  addRibbonIcon(_icon: string, _title: string, _cb: any): any { return document.createElement('div'); }
  registerEvent(_event: any): void {}
}

export class WorkspaceLeaf {}
```

- [ ] **Step 2: Create `plugin/tests/helpers.ts`**

```typescript
export interface MockFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  parent: MockFolder;
}

export interface MockFolder {
  path: string;
  name: string;
  children: (MockFile | MockFolder)[];
  parent: MockFolder | null;
}

export function makeFolder(path: string, parent: MockFolder | null = null): MockFolder {
  return {
    path,
    name: path.split('/').pop() ?? path,
    children: [],
    parent,
  };
}

export function makeFile(path: string): MockFile {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const folderPath = parts.slice(0, -1).join('/');
  const dotIdx = name.lastIndexOf('.');
  return {
    path,
    name,
    basename: dotIdx >= 0 ? name.slice(0, dotIdx) : name,
    extension: dotIdx >= 0 ? name.slice(dotIdx + 1) : '',
    parent: makeFolder(folderPath),
  };
}

export class MockVault {
  folders: Set<string> = new Set();
  files: Map<string, string> = new Map();

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  async create(path: string, content: string): Promise<MockFile> {
    this.files.set(path, content);
    return makeFile(path);
  }

  async read(file: MockFile): Promise<string> {
    const content = this.files.get(file.path);
    if (content === undefined) throw new Error(`File not found: ${file.path}`);
    return content;
  }

  async modify(file: MockFile, content: string): Promise<void> {
    this.files.set(file.path, content);
  }

  async copy(file: MockFile, newPath: string): Promise<MockFile> {
    const content = this.files.get(file.path) ?? '';
    this.files.set(newPath, content);
    return makeFile(newPath);
  }

  getAbstractFileByPath(path: string): MockFile | MockFolder | null {
    if (this.files.has(path)) return makeFile(path);
    if (this.folders.has(path)) return makeFolder(path);
    return null;
  }

  getMarkdownFiles(): MockFile[] {
    return Array.from(this.files.keys())
      .filter(p => p.endsWith('.md'))
      .map(makeFile);
  }
}

export class MockWorkspace {
  private _activeFile: MockFile | null = null;

  setActiveFile(file: MockFile | null): void {
    this._activeFile = file;
  }

  getActiveFile(): MockFile | null {
    return this._activeFile;
  }

  on(_event: string, _cb: any): any { return {}; }
  off(_event: string, _ref: any): void {}
  getActiveViewOfType(_type: any): any { return null; }
  onLayoutReady(_cb: () => void): void {}
  getLeavesOfType(_type: string): any[] { return []; }
  getRightLeaf(_split: boolean): any { return { setViewState: async () => {} }; }
  getLeaf(_split: boolean): any { return { setViewState: async () => {} }; }
  revealLeaf(_leaf: any): void {}
  detachLeavesOfType(_type: string): void {}
}

export class MockApp {
  vault = new MockVault();
  workspace = new MockWorkspace();
}
```

- [ ] **Step 3: Verify the mock compiles with ts-jest**

Create a trivial test `plugin/tests/smoke.test.ts`:
```typescript
import { MockApp, makeFile } from './helpers';

test('MockVault creates and reads files', async () => {
  const app = new MockApp();
  const file = await app.vault.create('test/foo.md', 'hello');
  const content = await app.vault.read(file);
  expect(content).toBe('hello');
});
```

Run: `cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=smoke`

Expected: PASS

- [ ] **Step 4: Delete `plugin/tests/smoke.test.ts`** (it was just a compile check)

---

## Task 3: LogService

**Files:**
- Create: `plugin/tests/logService.test.ts`
- Create: `plugin/src/LogService.ts`

- [ ] **Step 1: Write the failing tests**

`plugin/tests/logService.test.ts`:
```typescript
import { LogService, LogLevel } from '../src/LogService';

describe('LogService', () => {
  let log: LogService;

  beforeEach(() => {
    log = new LogService();
  });

  test('starts empty', () => {
    expect(log.entries).toHaveLength(0);
  });

  test('adds an info entry with timestamp', () => {
    log.info('test message');
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].message).toBe('test message');
    expect(log.entries[0].level).toBe(LogLevel.Info);
    expect(log.entries[0].timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test('adds entries of each level', () => {
    log.info('info');
    log.success('success');
    log.warn('warn');
    log.error('error');
    expect(log.entries.map(e => e.level)).toEqual([
      LogLevel.Info, LogLevel.Success, LogLevel.Warn, LogLevel.Error
    ]);
  });

  test('clear removes all entries', () => {
    log.info('a');
    log.info('b');
    log.clear();
    expect(log.entries).toHaveLength(0);
  });

  test('onChange callback fires when entry is added', () => {
    const cb = jest.fn();
    log.onChange(cb);
    log.info('hello');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('onChange callback fires when cleared', () => {
    const cb = jest.fn();
    log.onChange(cb);
    log.clear();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=logService
```

Expected: FAIL — `Cannot find module '../src/LogService'`

- [ ] **Step 3: Implement `plugin/src/LogService.ts`**

```typescript
export enum LogLevel {
  Info = 'info',
  Success = 'success',
  Warn = 'warn',
  Error = 'error',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

function nowHHMMSS(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export class LogService {
  readonly entries: LogEntry[] = [];
  private listeners: (() => void)[] = [];

  private add(level: LogLevel, message: string): void {
    this.entries.push({ timestamp: nowHHMMSS(), level, message });
    this.listeners.forEach(cb => cb());
  }

  info(message: string): void { this.add(LogLevel.Info, message); }
  success(message: string): void { this.add(LogLevel.Success, message); }
  warn(message: string): void { this.add(LogLevel.Warn, message); }
  error(message: string): void { this.add(LogLevel.Error, message); }

  clear(): void {
    this.entries.length = 0;
    this.listeners.forEach(cb => cb());
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=logService
```

Expected: PASS (6 tests)

---

## Task 4: matterUtils

**Files:**
- Create: `plugin/tests/matterUtils.test.ts`
- Create: `plugin/src/matterUtils.ts`

`findMatterRoot` walks up from the active file's parent folder (step 0) looking for `AI Instructions.md`. Returns the folder path string or `null`.

`createStructure` does NOT use `findMatterRoot` — it uses `activeFile.parent` directly (structure doesn't exist yet). Only `createBackup` and `trackChanges` use `findMatterRoot`.

- [ ] **Step 1: Write the failing tests**

`plugin/tests/matterUtils.test.ts`:
```typescript
import { findMatterRoot } from '../src/matterUtils';
import { MockApp, makeFile } from './helpers';

describe('findMatterRoot', () => {
  test('returns null when no active file', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(null);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });

  test('finds root when AI Instructions.md is in the active file\'s own folder (step 0)', async () => {
    const app = new MockApp();
    // Active file is AI Instructions.md itself
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    const file = makeFile('matter/AI Instructions.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matter');
  });

  test('finds root when AI Instructions.md is one level up', async () => {
    const app = new MockApp();
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matter');
    app.vault.folders.add('matter/02 Amendments and Remarks');
    const file = makeFile('matter/02 Amendments and Remarks/spec.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matter');
  });

  test('finds root when AI Instructions.md is two levels up', async () => {
    const app = new MockApp();
    app.vault.files.set('matters/case1/AI Instructions.md', '# AI Instructions');
    app.vault.folders.add('matters/case1');
    const file = makeFile('matters/case1/02 Amendments and Remarks/03 Versions/snap/spec.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBe('matters/case1');
  });

  test('returns null when no AI Instructions.md found within 6 levels', async () => {
    const app = new MockApp();
    const file = makeFile('a/b/c/d/e/f/g/file.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });

  test('does not walk more than 6 levels', async () => {
    const app = new MockApp();
    // Place AI Instructions.md 7 levels up — should NOT be found
    app.vault.files.set('root/AI Instructions.md', '# AI Instructions');
    const file = makeFile('root/a/b/c/d/e/f/g/file.md');
    app.workspace.setActiveFile(file);
    const result = await findMatterRoot(app as any);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=matterUtils
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/matterUtils.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=matterUtils
```

Expected: PASS (6 tests)

---

## Task 5: AI Instructions Template

**Files:**
- Create: `plugin/src/aiInstructionsTemplate.ts`

No unit test needed — this is a string constant. Correctness is validated by reading it.

- [ ] **Step 1: Create `plugin/src/aiInstructionsTemplate.ts`**

```typescript
export const AI_INSTRUCTIONS_CONTENT = `# AI Instructions — Patent Prosecution Vault

## Vault Map

This vault manages a single patent prosecution matter. Folder purposes:

- **01 Prior Filings/** — Original USPTO documents and prior submissions. Read-only reference. Contains specifications, claims, abstracts, office actions, and responses.
- **02 Amendments and Remarks/** — Active working documents for the current amendment round.
  - **01 Track Changes Originals/** — Baseline copies from the start of this cycle. Do not modify.
  - **02 Track Changes USPTO Markup/** — Generated track-changes output. Do not modify manually.
  - **03 Versions/** — Timestamped backups (YYYYMMDDHHMM format). Read-only reference.
  - **04 Prior Art/** — Prior art references, one subfolder per reference.
  - **Remarks.md** — Attorney remarks draft for the current response.
- **03 Strategy/** — Strategic notes and analysis.
  - **Strategy Index.md** — Master strategy document. Update as strategy evolves.
- **04 Meetings/** — Meeting notes. Subfolder or file per meeting (YYYYMMDD -- Description).
- **05 Tasks/**
  - **AI Tasks.md** — Your task list. Execute these. Mark complete when done.
  - **User Tasks.md** — Attorney task list. Monitor and offer help where you can.
- **AI Instructions.md** — This file. Your operating directive.

## File Naming Conventions

Patent documents follow the pattern: \`[docket]_[appno]_[date]_[type].md\`

Document type codes:
- \`ABST\` — Abstract
- \`CLM\` — Claims
- \`SPEC\` — Specification
- \`CTFR\` — Response to Office Action
- \`CTNF\` — Non-Final Office Action
- \`CTFINAL\` — Final Office Action
- \`TRACK1.GRANT\` — Track I grant notice

## Your Role

You are the AI assistant for patent prosecution workflow on this matter.

### Task Management
- Read \`05 Tasks/AI Tasks.md\` at the start of each session
- Execute open tasks (\`- [ ]\`) and mark complete (\`- [x]\`) when done
- Add sub-tasks if a task requires multiple steps
- Review \`05 Tasks/User Tasks.md\` — if you can assist with any user tasks, note it

### Prior Art Management
When PDF or document files are added to \`02 Amendments and Remarks/04 Prior Art/\`:
1. Create a subfolder for each new reference (e.g., \`01 US12345678 Widget/\`)
2. Add an entry in \`index with Mermaid Timeline.md\`: reference number, title, date, key claims
3. Update the Mermaid Gantt chart with the reference's relevant date
4. Note in \`AI Tasks.md\` if the reference requires further analysis

### Footnote Review
When reviewing documents, look for footnotes (\`[^n]: text\`). These are attorney annotations. If a footnote raises a question or task you can address, do so and note it in \`AI Tasks.md\`.

### Document Maintenance
- Keep \`03 Strategy/Strategy Index.md\` updated as strategy develops
- When meeting notes are added to \`04 Meetings/\`, extract action items and add them to the appropriate task file

## Claims Format

Claims use an enumerated outline format:
- Top-level numbered items (\`1.\`, \`2.\`, etc.) are individual claims
- Indented numbered sub-items are claim elements (preamble + comprising/consisting/wherein clauses)
- Status markers appear in parentheses after the claim number:
  - \`(Currently Amended)\` — amended in this response
  - \`(Previously Amended)\` — amended in a prior response, unchanged now
  - \`(Original)\` — never amended
  - \`(New)\` — newly added claim
  - \`(Canceled)\` — claim has been canceled

## Track Changes Workflow

1. When starting a new amendment round: attorney clicks "Track Changes" to prime originals
2. Attorney edits working documents in \`02 Amendments and Remarks/\`
3. Attorney clicks "Track Changes" again to generate USPTO-formatted markup in \`02 Track Changes USPTO Markup/\`
4. To start a fresh cycle: manually delete files in \`01 Track Changes Originals/\` and re-prime

## Communication Style
- Be concise and task-oriented
- When you identify questions for the inventor, add them to \`05 Tasks/User Tasks.md\`
- When you complete a task, briefly state what you did
- Flag claim scope issues, prior art overlap, or specification support gaps as you notice them
`;
```

- [ ] **Step 2: Verify it reads cleanly** — open the file and confirm there are no unterminated template literals or escaping issues

---

## Task 6: createStructure

**Files:**
- Create: `plugin/tests/createStructure.test.ts`
- Create: `plugin/src/createStructure.ts`

Note: `createStructure` uses `activeFile.parent.path` directly as the target — NOT `findMatterRoot`. The structure doesn't exist yet, so there is no `AI Instructions.md` to walk up to.

- [ ] **Step 1: Write the failing tests**

`plugin/tests/createStructure.test.ts`:
```typescript
import { createStructure } from '../src/createStructure';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function makeApp(activeFilePath: string) {
  const app = new MockApp();
  app.workspace.setActiveFile(makeFile(activeFilePath));
  return app;
}

describe('createStructure', () => {
  test('aborts and returns error when no active file', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(null);
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('Open a file');
  });

  test('aborts when AI Instructions.md already exists', async () => {
    const app = makeApp('matter/spec.md');
    app.vault.files.set('matter/AI Instructions.md', '# AI Instructions');
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(false);
    expect(log.entries[0].message).toContain('already exists');
  });

  test('creates all expected folders', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    await createStructure(app as any, log);
    const expectedFolders = [
      'matter/01 Prior Filings',
      'matter/02 Amendments and Remarks',
      'matter/02 Amendments and Remarks/01 Track Changes Originals',
      'matter/02 Amendments and Remarks/02 Track Changes USPTO Markup',
      'matter/02 Amendments and Remarks/03 Versions',
      'matter/02 Amendments and Remarks/04 Prior Art',
      'matter/03 Strategy',
      'matter/04 Meetings',
      'matter/05 Tasks',
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
      'matter/02 Amendments and Remarks/Remarks.md',
      'matter/02 Amendments and Remarks/04 Prior Art/index with Mermaid Timeline.md',
      'matter/03 Strategy/Strategy Index.md',
      'matter/05 Tasks/AI Tasks.md',
      'matter/05 Tasks/User Tasks.md',
    ];
    for (const file of expectedFiles) {
      expect(app.vault.files.has(file)).toBe(true);
    }
  });

  test('AI Instructions.md contains substantive content', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    await createStructure(app as any, log);
    const content = app.vault.files.get('matter/AI Instructions.md') ?? '';
    expect(content).toContain('AI Instructions');
    expect(content).toContain('Prior Filings');
    expect(content).toContain('Amendments and Remarks');
    expect(content).toContain('Task Management');
    expect(content).toContain('Claims Format');
  });

  test('Remarks.md starts with # Remarks', async () => {
    const app = makeApp('matter/spec.md');
    await createStructure(app as any, new LogService());
    const content = app.vault.files.get('matter/02 Amendments and Remarks/Remarks.md') ?? '';
    expect(content.trim().startsWith('# Remarks')).toBe(true);
  });

  test('logs success entry', async () => {
    const app = makeApp('matter/spec.md');
    const log = new LogService();
    const result = await createStructure(app as any, log);
    expect(result).toBe(true);
    expect(log.entries.some(e => e.level === 'success')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=createStructure
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/createStructure.ts`**

```typescript
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

\`\`\`gantt
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=createStructure
```

Expected: PASS (7 tests)

---

## Task 7: createBackup

**Files:**
- Create: `plugin/tests/createBackup.test.ts`
- Create: `plugin/src/createBackup.ts`

- [ ] **Step 1: Write the failing tests**

`plugin/tests/createBackup.test.ts`:
```typescript
import { createBackup } from '../src/createBackup';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupApp(matterRoot: string, mdFiles: string[], hasFolders = true) {
  const app = new MockApp();
  // Place AI Instructions.md so findMatterRoot works
  app.vault.files.set(`${matterRoot}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(matterRoot);
  if (hasFolders) {
    app.vault.folders.add(`${matterRoot}/02 Amendments and Remarks`);
  }
  for (const name of mdFiles) {
    app.vault.files.set(`${matterRoot}/02 Amendments and Remarks/${name}`, `# ${name}`);
  }
  // Active file is inside the amendments folder
  app.workspace.setActiveFile(makeFile(`${matterRoot}/02 Amendments and Remarks/spec.md`));
  return app;
}

describe('createBackup', () => {
  test('creates timestamped folder in 03 Versions/', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    // A folder matching YYYYMMDDHHMM pattern was created inside 03 Versions/
    const versionFolders = Array.from(app.vault.folders).filter(f =>
      f.startsWith('matter/02 Amendments and Remarks/03 Versions/') &&
      /\/\d{12}$/.test(f)
    );
    expect(versionFolders).toHaveLength(1);
  });

  test('copies only .md files from amendments root (not subfolders)', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md']);
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    // File in subfolder — should NOT be copied
    app.vault.files.set('matter/02 Amendments and Remarks/03 Versions/old/spec.md', '# old');
    const log = new LogService();
    await createBackup(app as any, log);

    const versionFolders = Array.from(app.vault.folders).filter(f =>
      /\/\d{12}$/.test(f)
    );
    const versionRoot = versionFolders[0];
    expect(app.vault.files.has(`${versionRoot}/spec.md`)).toBe(true);
    expect(app.vault.files.has(`${versionRoot}/claims.md`)).toBe(true);
    // The old subfolder file should NOT appear in the new backup
    expect(app.vault.files.has(`${versionRoot}/old/spec.md`)).toBe(false);
  });

  test('creates 03 Versions/ folder if it does not exist', async () => {
    const app = setupApp('matter', ['spec.md']);
    // Do NOT pre-create 03 Versions/
    const log = new LogService();
    await createBackup(app as any, log);
    expect(app.vault.folders.has('matter/02 Amendments and Remarks/03 Versions')).toBe(true);
  });

  test('warns with informative message when no .md files present', async () => {
    const app = setupApp('matter', []); // no files
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e =>
      e.level === 'warn' && e.message.includes('02 Amendments and Remarks')
    )).toBe(true);
  });

  test('returns false and logs error when matter root not found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/random/file.md'));
    const log = new LogService();
    const result = await createBackup(app as any, log);
    expect(result).toBe(false);
    expect(log.entries.some(e => e.level === 'error')).toBe(true);
  });

  test('logs file count in success message', async () => {
    const app = setupApp('matter', ['spec.md', 'claims.md', 'abstract.md']);
    app.vault.folders.add('matter/02 Amendments and Remarks/03 Versions');
    const log = new LogService();
    await createBackup(app as any, log);
    expect(log.entries.some(e => e.level === 'success' && e.message.includes('3'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=createBackup
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/createBackup.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=createBackup
```

Expected: PASS (6 tests)

---

## Task 8: claimsParser

**Files:**
- Create: `plugin/tests/claimsParser.test.ts`
- Create: `plugin/src/claimsParser.ts`

This module handles: (1) detecting if a file is a claims document, (2) parsing claims into structured objects, (3) diffing two claim sets and assigning status markers, (4) serializing back to markdown.

- [ ] **Step 1: Write the failing tests**

`plugin/tests/claimsParser.test.ts`:
```typescript
import { isClaimsDocument, parseClaims, diffClaims, serializeClaims } from '../src/claimsParser';

const SAMPLE_CLAIMS = `CLAIM OR CLAIMS

1. A method for preoperative preparation; comprising:
    1. identifying patients requiring cataract surgery,
    2. diagnosing ocular surface conditions.
2. The method of claim 1, further comprising:
    1. monitoring patient recovery.
3. A method of ocular surface optimization comprising:
    1. preparing said membrane,
    2. placing said membrane onto said eye.
`;

const AMENDED_CLAIMS = `CLAIM OR CLAIMS

1. (Currently Amended) A method for preoperative preparation of an eye; comprising:
    1. identifying patients requiring cataract surgery,
    2. diagnosing ocular surface conditions,
    3. evaluating corneal health.
2. The method of claim 1, further comprising:
    1. monitoring patient recovery.
4. A new method of treatment comprising:
    1. applying the membrane topically.
`;

describe('isClaimsDocument', () => {
  test('returns true for valid claims file', () => {
    expect(isClaimsDocument(SAMPLE_CLAIMS)).toBe(true);
  });

  test('returns false for remarks file', () => {
    const remarks = '# Remarks\n\nIn response to the office action...';
    expect(isClaimsDocument(remarks)).toBe(false);
  });

  test('returns false for file with fewer than 3 numbered items', () => {
    const sparse = '1. First item\n2. Second item\n';
    expect(isClaimsDocument(sparse)).toBe(false);
  });

  test('returns false when no comprising/wherein keyword', () => {
    const noKeyword = '1. First claim\n2. Second claim\n3. Third claim\n';
    expect(isClaimsDocument(noKeyword)).toBe(false);
  });

  test('returns false for strategy file', () => {
    const strategy = '# Strategy Index\n\n1. Focus on claims 1-5\n2. Prior art\n3. comprising the argument';
    expect(isClaimsDocument(strategy)).toBe(false);
  });
});

describe('parseClaims', () => {
  test('parses 3 claims from sample', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims).toHaveLength(3);
  });

  test('extracts claim numbers correctly', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims.map(c => c.number)).toEqual([1, 2, 3]);
  });

  test('extracts existing status marker', () => {
    const claims = parseClaims(AMENDED_CLAIMS);
    const claim1 = claims.find(c => c.number === 1);
    expect(claim1?.existingStatusMarker).toBe('Currently Amended');
  });

  test('returns null status marker when none present', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims[0].existingStatusMarker).toBeNull();
  });

  test('parses clauses for claim 1', () => {
    const claims = parseClaims(SAMPLE_CLAIMS);
    expect(claims[0].clauses).toHaveLength(2);
  });
});

describe('diffClaims', () => {
  test('marks unchanged claim as (Original)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(SAMPLE_CLAIMS);
    const result = diffClaims(original, current);
    expect(result[0].statusMarker).toBe('Original');
  });

  test('marks changed claim as (Currently Amended)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Currently Amended');
  });

  test('marks claim only in current as (New)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const result = diffClaims(original, current);
    const claim4 = result.find(c => c.number === 4);
    expect(claim4?.statusMarker).toBe('New');
  });

  test('marks claim only in original as (Canceled)', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS); // claim 3 is gone
    const result = diffClaims(original, current);
    const claim3 = result.find(c => c.number === 3);
    expect(claim3?.statusMarker).toBe('Canceled');
  });

  test('marks unchanged claim with existing (Currently Amended) marker as (Previously Amended)', () => {
    // Claim 1 in AMENDED_CLAIMS has (Currently Amended) — if unchanged from that,
    // it becomes (Previously Amended) in next round
    const original = parseClaims(AMENDED_CLAIMS); // has (Currently Amended) on claim 1
    const current = parseClaims(AMENDED_CLAIMS);  // same content
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });

  test('marks unchanged claim with existing (Previously Amended) as (Previously Amended)', () => {
    const prevAmended = AMENDED_CLAIMS.replace('Currently Amended', 'Previously Amended');
    const original = parseClaims(prevAmended);
    const current = parseClaims(prevAmended);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });

  test('marks unchanged claim with existing (New) as (Previously Amended)', () => {
    const newClaim = AMENDED_CLAIMS.replace('(Currently Amended) ', '(New) ');
    const original = parseClaims(newClaim);
    const current = parseClaims(newClaim);
    const result = diffClaims(original, current);
    const claim1 = result.find(c => c.number === 1);
    expect(claim1?.statusMarker).toBe('Previously Amended');
  });
});

describe('serializeClaims', () => {
  test('outputs status marker in parentheses after claim number', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const diffed = diffClaims(original, current);
    const output = serializeClaims(diffed);
    expect(output).toContain('1. (Currently Amended)');
    expect(output).toContain('2. (Original)');
    expect(output).toContain('4. (New)');
  });

  test('wraps canceled claim body in strikethrough', () => {
    const original = parseClaims(SAMPLE_CLAIMS);
    const current = parseClaims(AMENDED_CLAIMS);
    const diffed = diffClaims(original, current);
    const output = serializeClaims(diffed);
    // Claim 3 is canceled — its body content should be struck through
    expect(output).toContain('3. (Canceled)');
    expect(output).toMatch(/~~.*ocular surface optimization.*~~/s);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=claimsParser
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/claimsParser.ts`**

```typescript
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL } from 'diff-match-patch';

export interface Claim {
  number: number;
  existingStatusMarker: string | null;
  preamble: string;
  clauses: string[];
  rawBody: string; // full text lines after the top-level line
}

export interface DiffedClaim extends Claim {
  statusMarker: string;
  diffedPreamble: string;
  diffedClauses: string[];
  canceled: boolean;
}

const CLAIM_KEYWORDS = /\b(comprising|consisting|wherein)\b/i;
const TOP_LEVEL_RE = /^(\d+)\.\s+(.*)/;
const STATUS_MARKER_RE = /^\(([^)]+)\)\s+(.*)/;
const EXCLUDING_HEADINGS = /^#\s+(Remarks|Strategy)/i;

export function isClaimsDocument(content: string): boolean {
  if (EXCLUDING_HEADINGS.test(content.trim())) return false;
  const topLevelMatches = [...content.matchAll(/^\d+\.\s+/gm)];
  if (topLevelMatches.length < 3) return false;
  if (!CLAIM_KEYWORDS.test(content)) return false;
  return true;
}

export function parseClaims(content: string): Claim[] {
  const lines = content.split('\n');
  const claims: Claim[] = [];
  let current: Claim | null = null;

  for (const line of lines) {
    const topMatch = TOP_LEVEL_RE.exec(line);
    if (topMatch) {
      if (current) claims.push(current);
      const number = parseInt(topMatch[1], 10);
      const rest = topMatch[2];
      const markerMatch = STATUS_MARKER_RE.exec(rest);
      current = {
        number,
        existingStatusMarker: markerMatch ? markerMatch[1] : null,
        preamble: markerMatch ? markerMatch[2] : rest,
        clauses: [],
        rawBody: '',
      };
    } else if (current) {
      const trimmed = line.trimStart();
      if (/^\d+\.\s+/.test(trimmed)) {
        current.clauses.push(line);
      }
      current.rawBody += (current.rawBody ? '\n' : '') + line;
    }
  }
  if (current) claims.push(current);
  return claims;
}

function claimContentKey(claim: Claim): string {
  return claim.preamble + '|' + claim.clauses.join('|');
}

function wordDiff(original: string, current: string): string {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, current);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text]) => {
    if (op === DIFF_DELETE) return `~~${text}~~`;
    if (op === DIFF_INSERT) return `<u>${text}</u>`;
    return text;
  }).join('');
}

const PREVIOUSLY_AMENDED_MARKERS = new Set(['Currently Amended', 'Previously Amended', 'New']);

export function diffClaims(original: Claim[], current: Claim[]): DiffedClaim[] {
  const origByNum = new Map(original.map(c => [c.number, c]));
  const currByNum = new Map(current.map(c => [c.number, c]));
  const result: DiffedClaim[] = [];

  // Process current claims
  for (const curr of current) {
    const orig = origByNum.get(curr.number);
    if (!orig) {
      // New claim
      result.push({
        ...curr,
        statusMarker: 'New',
        diffedPreamble: curr.preamble,
        diffedClauses: curr.clauses,
        canceled: false,
      });
    } else {
      const contentChanged = claimContentKey(orig) !== claimContentKey(curr);
      let statusMarker: string;
      if (contentChanged) {
        statusMarker = 'Currently Amended';
      } else if (curr.existingStatusMarker && PREVIOUSLY_AMENDED_MARKERS.has(curr.existingStatusMarker)) {
        statusMarker = 'Previously Amended';
      } else {
        statusMarker = 'Original';
      }
      result.push({
        ...curr,
        statusMarker,
        diffedPreamble: contentChanged ? wordDiff(orig.preamble, curr.preamble) : curr.preamble,
        diffedClauses: contentChanged
          ? curr.clauses.map((clause, i) => wordDiff(orig.clauses[i] ?? '', clause))
          : curr.clauses,
        canceled: false,
      });
    }
  }

  // Process canceled claims (in original but not in current)
  for (const orig of original) {
    if (!currByNum.has(orig.number)) {
      result.push({
        ...orig,
        statusMarker: 'Canceled',
        diffedPreamble: `~~${orig.preamble}~~`,
        diffedClauses: orig.clauses.map(c => `~~${c}~~`),
        canceled: true,
      });
    }
  }

  // Sort by claim number
  result.sort((a, b) => a.number - b.number);
  return result;
}

export function serializeClaims(claims: DiffedClaim[]): string {
  const lines: string[] = [];
  for (const claim of claims) {
    const markerStr = `(${claim.statusMarker}) `;
    lines.push(`${claim.number}. ${markerStr}${claim.diffedPreamble}`);
    for (const clause of claim.diffedClauses) {
      lines.push(clause);
    }
    lines.push('');
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=claimsParser
```

Expected: PASS (all tests)

---

## Task 9: proseDiff

**Files:**
- Create: `plugin/tests/proseDiff.test.ts`
- Create: `plugin/src/proseDiff.ts`

- [ ] **Step 1: Write the failing tests**

`plugin/tests/proseDiff.test.ts`:
```typescript
import { diffProse, stripExistingMarkup } from '../src/proseDiff';

describe('stripExistingMarkup', () => {
  test('removes strikethrough spans', () => {
    expect(stripExistingMarkup('hello ~~world~~ foo')).toBe('hello  foo');
  });

  test('removes underline spans', () => {
    expect(stripExistingMarkup('hello <u>world</u> foo')).toBe('hello  foo');
  });

  test('leaves plain text unchanged', () => {
    expect(stripExistingMarkup('plain text')).toBe('plain text');
  });
});

describe('diffProse', () => {
  test('unchanged content produces no markup', () => {
    const text = 'The invention relates to amniotic membrane.';
    const result = diffProse(text, text);
    expect(result).not.toContain('~~');
    expect(result).not.toContain('<u>');
  });

  test('deleted word is wrapped in strikethrough', () => {
    const original = 'The quick brown fox.';
    const current = 'The brown fox.';
    const result = diffProse(original, current);
    expect(result).toContain('~~');
    expect(result).toContain('quick');
  });

  test('inserted word is wrapped in underline', () => {
    const original = 'The brown fox.';
    const current = 'The quick brown fox.';
    const result = diffProse(original, current);
    expect(result).toContain('<u>');
    expect(result).toContain('quick');
  });

  test('existing strikethrough in current is stripped before diffing', () => {
    const original = 'The quick brown fox.';
    // User has manually marked "quick" for deletion with strikethrough
    const current = 'The ~~quick~~ brown fox.';
    const result = diffProse(original, current);
    // After stripping, current becomes "The  brown fox."
    // Diff should show "quick" as deleted, not doubled-up
    const doubleStrikeCount = (result.match(/~~~~quick~~~~/g) ?? []).length;
    expect(doubleStrikeCount).toBe(0);
  });

  test('moved paragraph is annotated with [!NOTE] Moved callout', () => {
    const paraA = 'First paragraph about the invention.';
    const paraB = 'Second paragraph about the claims.';
    const paraC = 'Third paragraph about the drawings.';
    const original = [paraA, paraB, paraC].join('\n\n');
    const current = [paraA, paraC, paraB].join('\n\n'); // B and C swapped
    const result = diffProse(original, current);
    expect(result).toContain('[!NOTE] Moved');
  });

  test('entirely new paragraph is wrapped in underline', () => {
    const original = 'First paragraph.';
    const current = 'First paragraph.\n\nEntirely new second paragraph.';
    const result = diffProse(original, current);
    expect(result).toContain('<u>');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=proseDiff
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/proseDiff.ts`**

```typescript
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from 'diff-match-patch';

export function stripExistingMarkup(text: string): string {
  return text
    .replace(/~~[^~]+~~/g, '')
    .replace(/<u>[^<]*<\/u>/g, '');
}

function hashParagraph(text: string): string {
  // Simple hash for paragraph identity — good enough for move detection
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

function runDmp(original: string, current: string): string {
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(original, current);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text]) => {
    if (op === DIFF_DELETE) return `~~${text}~~`;
    if (op === DIFF_INSERT) return `<u>${text}</u>`;
    return text;
  }).join('');
}

export function diffProse(original: string, current: string): string {
  const cleanCurrent = stripExistingMarkup(current);

  const origParas = splitParagraphs(original);
  const currParas = splitParagraphs(cleanCurrent);

  // Build hash maps: hash -> index
  const origHashToIdx = new Map(origParas.map((p, i) => [hashParagraph(p), i]));
  const currHashToIdx = new Map(currParas.map((p, i) => [hashParagraph(p), i]));

  // Detect moved paragraphs: same content, different position
  const movedHashes = new Set<string>();
  for (const [h, origIdx] of origHashToIdx) {
    const currIdx = currHashToIdx.get(h);
    if (currIdx !== undefined && currIdx !== origIdx) {
      movedHashes.add(h);
    }
  }

  // Split into moved and non-moved content
  const origForDiff = origParas.filter(p => !movedHashes.has(hashParagraph(p))).join('\n\n');
  const currForDiff = currParas.filter(p => !movedHashes.has(hashParagraph(p))).join('\n\n');

  // Run dmp on non-moved content
  const mainResult = runDmp(origForDiff, currForDiff);

  // Append moved paragraph callouts
  const movedCallouts = currParas
    .filter(p => movedHashes.has(hashParagraph(p)))
    .map(p => `> [!NOTE] Moved\n> ${p.replace(/\n/g, '\n> ')}`)
    .join('\n\n');

  return movedCallouts ? `${mainResult}\n\n${movedCallouts}` : mainResult;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=proseDiff
```

Expected: PASS (all tests)

---

## Task 10: trackChanges

**Files:**
- Create: `plugin/tests/trackChanges.test.ts`
- Create: `plugin/src/trackChanges.ts`

- [ ] **Step 1: Write the failing tests**

`plugin/tests/trackChanges.test.ts`:
```typescript
import { trackChanges } from '../src/trackChanges';
import { LogService } from '../src/LogService';
import { MockApp, makeFile } from './helpers';

function setupMatter(root: string) {
  const app = new MockApp();
  app.vault.files.set(`${root}/AI Instructions.md`, '# AI Instructions');
  app.vault.folders.add(root);
  app.vault.folders.add(`${root}/02 Amendments and Remarks`);
  app.vault.folders.add(`${root}/02 Amendments and Remarks/01 Track Changes Originals`);
  app.vault.folders.add(`${root}/02 Amendments and Remarks/02 Track Changes USPTO Markup`);
  app.workspace.setActiveFile(makeFile(`${root}/02 Amendments and Remarks/spec.md`));
  return app;
}

describe('trackChanges — prime mode', () => {
  test('copies .md files to 01 Track Changes Originals when no originals exist', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/02 Amendments and Remarks/spec.md', '# Spec');
    app.vault.files.set('matter/02 Amendments and Remarks/claims.md', '# Claims');
    const log = new LogService();

    await trackChanges(app as any, log);

    expect(app.vault.files.has('matter/02 Amendments and Remarks/01 Track Changes Originals/spec.md')).toBe(true);
    expect(app.vault.files.has('matter/02 Amendments and Remarks/01 Track Changes Originals/claims.md')).toBe(true);
  });

  test('logs prime mode action and shows correct notice text', async () => {
    const app = setupMatter('matter');
    app.vault.files.set('matter/02 Amendments and Remarks/spec.md', '# Spec');
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(log.entries.some(e => e.message.toLowerCase().includes('original'))).toBe(true);
  });
});

describe('trackChanges — diff mode', () => {
  function setupWithOriginals(root: string, files: Record<string, { original: string; current: string }>) {
    const app = setupMatter(root);
    for (const [name, content] of Object.entries(files)) {
      // Current version (amended)
      app.vault.files.set(`${root}/02 Amendments and Remarks/${name}`, content.current);
      // Original version
      app.vault.files.set(`${root}/02 Amendments and Remarks/01 Track Changes Originals/${name}`, content.original);
    }
    return app;
  }

  test('writes output file to 02 Track Changes USPTO Markup/', async () => {
    const app = setupWithOriginals('matter', {
      'spec.md': {
        original: '# Specification\n\nThe invention relates to treatment.',
        current: '# Specification\n\nThe invention relates to advanced treatment.',
      }
    });
    const log = new LogService();
    await trackChanges(app as any, log);
    expect(app.vault.files.has('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md')).toBe(true);
  });

  test('overwrites existing output file', async () => {
    const app = setupWithOriginals('matter', {
      'spec.md': {
        original: 'Old text.',
        current: 'New text.',
      }
    });
    app.vault.files.set('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md', 'old output');
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/spec.md') ?? '';
    expect(output).not.toBe('old output');
  });

  test('claims file gets status markers in output', async () => {
    const originalClaims = `1. A method for treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.`;
    const currentClaims = `1. A method for improved treatment comprising:\n    1. applying membrane.\n2. The method of claim 1 wherein:\n    1. the membrane is cryopreserved.\n3. A method of diagnosis comprising:\n    1. measuring corneal health.`;

    const app = setupWithOriginals('matter', {
      'claims.md': { original: originalClaims, current: currentClaims }
    });
    const log = new LogService();
    await trackChanges(app as any, log);
    const output = app.vault.files.get('matter/02 Amendments and Remarks/02 Track Changes USPTO Markup/claims.md') ?? '';
    expect(output).toContain('(Currently Amended)');
    expect(output).toContain('(Original)');
  });

  test('returns false when matter root not found', async () => {
    const app = new MockApp();
    app.workspace.setActiveFile(makeFile('some/file.md'));
    const log = new LogService();
    const result = await trackChanges(app as any, log);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=trackChanges
```

Expected: FAIL

- [ ] **Step 3: Implement `plugin/src/trackChanges.ts`**

```typescript
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
```

- [ ] **Step 4: Run all tests to confirm pass**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test -- --testPathPattern=trackChanges
```

Expected: PASS

- [ ] **Step 5: Run the full test suite**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test
```

Expected: All tests PASS across all files.

---

## Task 11: SidebarPanel

**Files:**
- Create: `plugin/src/SidebarPanel.ts`
- Create: `plugin/styles.css`

UI only — tested manually in Obsidian. The logic is already covered by previous tests. The panel wires UI events to the tested functions.

- [ ] **Step 1: Create `plugin/src/SidebarPanel.ts`**

```typescript
import { ItemView, WorkspaceLeaf, MarkdownView, setIcon } from 'obsidian';
import { LogService, LogLevel } from './LogService';
import { createStructure } from './createStructure';
import { createBackup } from './createBackup';
import { trackChanges } from './trackChanges';

export const VIEW_TYPE = 'office-action-tool';

export class SidebarPanel extends ItemView {
  private log: LogService;
  private logEl: HTMLElement | null = null;
  private notesEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, log: LogService) {
    super(leaf);
    this.log = log;
    this.log.onChange(() => this.renderLog());
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Office Action Tool'; }
  getIcon(): string { return 'briefcase'; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass('oat-panel');

    // --- Tab bar ---
    const tabBar = root.createDiv({ cls: 'oat-tab-bar' });
    const tabContent = root.createDiv({ cls: 'oat-tab-content' });

    const tabs = ['Actions', 'Notes', 'Log'] as const;
    const panes: Record<string, HTMLElement> = {};

    tabs.forEach((name, i) => {
      const btn = tabBar.createEl('button', { text: name, cls: 'oat-tab-btn' });
      const pane = tabContent.createDiv({ cls: 'oat-pane' });
      panes[name] = pane;
      if (i > 0) pane.hide();

      btn.onclick = () => {
        tabBar.querySelectorAll('.oat-tab-btn').forEach(b => b.removeClass('oat-tab-active'));
        tabContent.querySelectorAll('.oat-pane').forEach(p => (p as HTMLElement).hide());
        btn.addClass('oat-tab-active');
        pane.show();
      };

      if (i === 0) btn.addClass('oat-tab-active');
    });

    this.buildActionsPane(panes['Actions']);
    this.buildNotesPane(panes['Notes']);
    this.buildLogPane(panes['Log']);
  }

  private buildActionsPane(pane: HTMLElement): void {
    const actions: { label: string; lucideIcon: string; tooltip: string; handler: () => Promise<void> }[] = [
      {
        label: 'Create Structure',
        lucideIcon: 'folder-plus',
        tooltip: 'Scaffold matter folder structure and AI Instructions',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await createStructure(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
      {
        label: 'Create Backup',
        lucideIcon: 'archive',
        tooltip: 'Copy current amendments to a timestamped version folder',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await createBackup(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
      {
        label: 'Track Changes',
        lucideIcon: 'git-compare',
        tooltip: 'Prime originals or generate USPTO-formatted track changes',
        handler: async () => {
          const countBefore = this.log.entries.length;
          await trackChanges(this.app, this.log);
          this.switchToLogOnError(countBefore);
        },
      },
    ];

    for (const action of actions) {
      const btn = pane.createEl('button', {
        cls: 'oat-action-btn',
        attr: { title: action.tooltip },
      });
      const iconEl = btn.createSpan({ cls: 'oat-btn-icon' });
      setIcon(iconEl, action.lucideIcon);
      btn.createSpan({ text: ' ' + action.label });
      btn.onclick = action.handler;
    }
  }

  private buildNotesPane(pane: HTMLElement): void {
    this.notesEl = pane.createDiv({ cls: 'oat-notes-list' });
    this.renderNotes();

    // Update when active file changes
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.renderNotes())
    );
    this.registerEvent(
      this.app.workspace.on('editor-change', () => this.renderNotes())
    );
  }

  private renderNotes(): void {
    if (!this.notesEl) return;
    this.notesEl.empty();

    const file = this.app.workspace.getActiveFile();
    if (!file) {
      this.notesEl.createEl('p', { text: 'No file open.', cls: 'oat-empty' });
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const content = view?.editor?.getValue() ?? '';

    // Parse footnote definitions: [^label]: text
    const footnoteRe = /\[\^([^\]]+)\]:\s*(.+)/g;
    const footnotes: { label: string; text: string }[] = [];
    let match;
    while ((match = footnoteRe.exec(content)) !== null) {
      footnotes.push({ label: match[1], text: match[2] });
    }

    if (footnotes.length === 0) {
      this.notesEl.createEl('p', { text: 'No footnotes in current document.', cls: 'oat-empty' });
      return;
    }

    for (const fn of footnotes) {
      const item = this.notesEl.createDiv({ cls: 'oat-note-item' });
      item.createSpan({ text: `[^${fn.label}]`, cls: 'oat-note-label' });
      item.createSpan({ text: fn.text, cls: 'oat-note-text' });
      item.onclick = () => this.scrollToFootnote(fn.label);
    }
  }

  private scrollToFootnote(label: string): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.editor) return;
    const editor = view.editor;
    const content = editor.getValue();
    // Find first inline reference [^label] (not the definition)
    const inlineRe = new RegExp(`\\[\\^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?!:)`, '');
    const idx = content.search(inlineRe);
    if (idx < 0) return;
    const pos = editor.offsetToPos(idx);
    editor.setCursor(pos);
    editor.scrollIntoView({ from: pos, to: pos }, true);
  }

  private buildLogPane(pane: HTMLElement): void {
    this.logEl = pane.createDiv({ cls: 'oat-log-list' });
    this.renderLog();
  }

  private renderLog(): void {
    if (!this.logEl) return;
    this.logEl.empty();

    if (this.log.entries.length === 0) {
      this.logEl.createEl('p', { text: 'No activity yet.', cls: 'oat-empty' });
      return;
    }

    for (const entry of this.log.entries) {
      const item = this.logEl.createDiv({ cls: `oat-log-entry oat-log-${entry.level}` });
      item.createSpan({ text: `[${entry.timestamp}] `, cls: 'oat-log-ts' });
      item.createSpan({ text: entry.message });
    }

    // Auto-scroll to bottom
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  /** Switch to Log tab if any entry added since `countBefore` is an error. */
  private switchToLogOnError(countBefore: number): void {
    const newEntries = this.log.entries.slice(countBefore);
    if (newEntries.some(e => e.level === LogLevel.Error)) {
      const logBtn = this.containerEl.querySelector('.oat-tab-btn:last-child') as HTMLElement;
      logBtn?.click();
    }
  }

  async onClose(): Promise<void> {}
}
```

- [ ] **Step 2: Create `plugin/styles.css`**

```css
/* Office Action Tool sidebar panel */
.oat-panel {
  padding: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.oat-tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  padding-bottom: 4px;
}

.oat-tab-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 4px;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
}

.oat-tab-btn:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.oat-tab-btn.oat-tab-active {
  background: var(--background-modifier-active-hover);
  color: var(--text-normal);
  font-weight: 600;
}

.oat-tab-content {
  flex: 1;
  overflow: auto;
}

.oat-action-btn {
  display: block;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--interactive-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font-size: var(--font-ui-medium);
  color: var(--text-normal);
}

.oat-action-btn:hover {
  background: var(--interactive-hover);
}

.oat-action-btn:active {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.oat-notes-list,
.oat-log-list {
  overflow-y: auto;
}

.oat-empty {
  color: var(--text-muted);
  font-style: italic;
  font-size: var(--font-ui-small);
}

.oat-note-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--background-modifier-border);
  cursor: pointer;
}

.oat-note-item:hover {
  background: var(--background-modifier-hover);
}

.oat-note-label {
  font-weight: 600;
  font-size: var(--font-ui-small);
  color: var(--text-accent);
  display: block;
}

.oat-note-text {
  font-size: var(--font-ui-small);
  color: var(--text-normal);
  display: block;
}

.oat-log-entry {
  font-size: var(--font-ui-smaller);
  font-family: var(--font-monospace);
  padding: 2px 0;
  line-height: 1.5;
}

.oat-log-ts { color: var(--text-faint); }
.oat-log-info { color: var(--text-muted); }
.oat-log-success { color: var(--color-green); }
.oat-log-warn { color: var(--color-yellow); }
.oat-log-error { color: var(--color-red); }
```

---

## Task 12: main.ts and Build Verification

**Files:**
- Create: `plugin/src/main.ts`

- [ ] **Step 1: Create `plugin/src/main.ts`**

```typescript
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { SidebarPanel, VIEW_TYPE } from './SidebarPanel';
import { LogService } from './LogService';
import { createStructure } from './createStructure';
import { createBackup } from './createBackup';
import { trackChanges } from './trackChanges';

export default class OfficeActionPlugin extends Plugin {
  private log!: LogService;

  async onload(): Promise<void> {
    this.log = new LogService();

    // Register the sidebar panel view
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) =>
      new SidebarPanel(leaf, this.log)
    );

    // Activate the panel on startup
    this.app.workspace.onLayoutReady(() => this.activateView());

    // Register command palette commands
    // Note: Obsidian prepends the plugin ID, producing e.g. "office-action-tool:create-structure"
    this.addCommand({
      id: 'create-structure',
      name: 'Office Action: Create Structure',
      callback: () => createStructure(this.app, this.log),
    });

    this.addCommand({
      id: 'create-backup',
      name: 'Office Action: Create Backup',
      callback: () => createBackup(this.app, this.log),
    });

    this.addCommand({
      id: 'track-changes',
      name: 'Office Action: Track Changes',
      callback: () => trackChanges(this.app, this.log),
    });

    // Ribbon icon to open/focus the panel
    this.addRibbonIcon('briefcase', 'Office Action Tool', () => this.activateView());
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
}
```

- [ ] **Step 2: Build the plugin**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm run build
```

Expected: `main.js` generated with no TypeScript errors.

- [ ] **Step 3: Check TypeScript type errors only (no emit)**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npx tsc --noEmit --skipLibCheck
```

Expected: No errors.

- [ ] **Step 4: Run the full test suite one final time**

```bash
cd "c:/Dev/Obsidian-Office-Action-Tool/plugin" && npm test
```

Expected: All tests PASS.

---

## Task 13: Manual Installation and Smoke Test in Obsidian

This task is done by the developer in Obsidian — not automated.

- [ ] **Step 1: Create a test vault** (or use an existing non-production vault)

- [ ] **Step 2: Copy built files to the vault's plugins folder**

Create `[vault]/.obsidian/plugins/office-action-tool/` and copy:
- `plugin/main.js`
- `plugin/manifest.json`
- `plugin/styles.css`

- [ ] **Step 3: Enable the plugin** in Obsidian → Settings → Community Plugins → Enable "Office Action Tool"

- [ ] **Step 4: Verify the sidebar panel appears** in the right sidebar with tabs: Actions, Notes, Log

- [ ] **Step 5: Create a test folder** in the vault, create a dummy file inside it, set it as active

- [ ] **Step 6: Click "Create Structure"** — verify all folders and files created correctly, AI Instructions.md has substantive content

- [ ] **Step 7: Add 2-3 `.md` files to `02 Amendments and Remarks/`** (copy the sample files from `docs/Sample_Direcotory/`)

- [ ] **Step 8: Click "Create Backup"** — verify timestamped folder created in `03 Versions/` with correct files

- [ ] **Step 9: Click "Track Changes" (prime)** — verify files copied to `01 Track Changes Originals/`, notice shown

- [ ] **Step 10: Edit a file in `02 Amendments and Remarks/`** — change some text, add a new sentence, delete a word

- [ ] **Step 11: Click "Track Changes" (diff)** — verify output in `02 Track Changes USPTO Markup/` with `~~strikethrough~~` for deletions and `<u>underline</u>` for insertions

- [ ] **Step 12: Add a footnote** to an open document (`[^1]: This is a note`) — verify it appears in the Notes tab, clicking it scrolls to the inline reference

- [ ] **Step 13: Verify Log tab** shows timestamped, color-coded entries for all operations performed

---

## Development Workflow Note

For iterative development, run `npm run dev` (esbuild watch mode) and symlink or copy `main.js` to the vault after each save. On Windows:

```powershell
# Run once — creates a symbolic link so Obsidian always loads the latest build
New-Item -ItemType SymbolicLink -Path "[vault]/.obsidian/plugins/office-action-tool/main.js" -Target "c:\Dev\Obsidian-Office-Action-Tool\plugin\main.js"
```
