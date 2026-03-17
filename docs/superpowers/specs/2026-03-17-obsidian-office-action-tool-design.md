# Obsidian Office Action Tool — Design Spec
**Date:** 2026-03-17
**Status:** Approved

---

## Overview

An Obsidian plugin for patent prosecution workflow. It provides a right-sidebar panel with deterministic tools (Create Structure, Create Backup, Track Changes) that scaffold and maintain a consistent vault structure. The heavy AI work is done externally via CLI, guided by an `AI Instructions.md` file the plugin generates. The plugin also surfaces footnotes from the active document as a comment panel (Notes tab), mirroring the Word comment-sidebar workflow.

---

## Architecture

### Tech Stack
- **Language:** TypeScript
- **Build:** esbuild (standard Obsidian plugin setup, based on official sample plugin)
- **Diff library:** `diff-match-patch` (Google, MIT licensed) for prose documents; custom parse-and-match for claims files
- **Obsidian API:** `app.workspace.getActiveFile()`, `app.vault`, `ItemView`

### Source Files
```
obsidian-office-action-tool/
├── src/
│   ├── main.ts               # Plugin entry, registers view and commands
│   ├── SidebarPanel.ts       # Right-panel ItemView — 3 tabs: Actions, Notes, Log
│   ├── LogService.ts         # Log state class, instantiated in main.ts, passed by reference
│   ├── matterUtils.ts        # Matter-root detection; shared file helpers
│   ├── createStructure.ts    # Tool 1: scaffold folder tree + placeholder files
│   ├── createBackup.ts       # Tool 2: timestamped version snapshot
│   └── trackChanges.ts       # Tool 3: prime originals or generate USPTO diff output
├── manifest.json
├── package.json
└── esbuild.config.mjs
```

### Command Palette Registration
All three operations are registered as Obsidian commands in `main.ts`, making them available via the command palette and assignable to hotkeys:
- `office-action-tool:create-structure` — "Office Action: Create Structure"
- `office-action-tool:create-backup` — "Office Action: Create Backup"
- `office-action-tool:track-changes` — "Office Action: Track Changes"

These commands call the same handler functions as the sidebar buttons.

---

## Matter Root Detection (`matterUtils.ts`)

All three tools rely on locating the matter root before operating.

**Algorithm:**
1. Get active file via `app.workspace.getActiveFile()`
2. If no active file: show Notice "Open a file inside a matter folder first" and abort
3. Start at `file.parent` (step 0 — check the file's own containing folder first, which handles the case where the user has `AI Instructions.md` itself open)
4. At each level, check if `AI Instructions.md` exists in that folder
5. First match = matter root
6. Walk upward max 6 levels; if no match found: show Notice "No matter root found — open a file inside a matter folder" and abort

**Why `AI Instructions.md` as anchor:** It is created exclusively by this plugin and will not appear in arbitrary folders, making it a reliable, unambiguous marker.

---

## Vault Structure (`createStructure.ts`)

### Trigger
User clicks "Create Structure" in the Actions tab (or invokes the command palette command). Plugin uses matter root detection. If no active file, shows Notice "Open a file inside a matter folder first" and aborts — no fallback to the file explorer (the file explorer's selection state is not a stable Obsidian API surface).

### Guard
If `AI Instructions.md` already exists in the target folder, show Notice "Structure already exists in this folder" and abort — no overwrites.

### Folder Tree Created
```
[Selected Folder]/
├── 01 Prior Filings/
├── 02 Amendments and Remarks/
│   ├── 01 Track Changes Originals/
│   ├── 02 Track Changes USPTO Markup/
│   ├── 03 Versions/
│   ├── 04 Prior Art/
│   │   └── index with Mermaid Timeline.md
│   └── Remarks.md
├── 03 Strategy/
│   └── Strategy Index.md
├── 04 Meetings/
├── 05 Tasks/
│   ├── AI Tasks.md
│   └── User Tasks.md
└── AI Instructions.md
```

### Placeholder File Contents

**`Remarks.md`**
```markdown
# Remarks

```

**`04 Prior Art/index with Mermaid Timeline.md`**
```markdown
# Prior Art Index

## References

<!-- Add prior art entries here. Each reference should have a subfolder under 04 Prior Art/. -->

## Timeline

```gantt
    title Patent Prosecution Timeline
    dateFormat  YYYY-MM-DD
    section Prior Art
```
```

**`03 Strategy/Strategy Index.md`**
```markdown
# Strategy Index

```

**`05 Tasks/AI Tasks.md`**
```markdown
# AI Tasks

<!-- Checkbox list of tasks assigned to the AI. Use subtasks and bullets as needed. -->

```

**`05 Tasks/User Tasks.md`**
```markdown
# User Tasks

<!-- Checkbox list of tasks for the attorney/user. AI monitors this and may assist. -->

```

### `AI Instructions.md` — Generated Content

This file is both an orientation guide and an active directive for the AI. It is substantive, not a placeholder. The exact content is specified in the companion document `AI-Instructions-template.md` (to be authored as part of the implementation plan). It covers:

1. **Vault map** — folder-by-folder description of purpose
2. **File conventions** — naming patterns, document types (ABST, CLM, SPEC, CTFR, CTNF, etc.)
3. **AI role and responsibilities:**
   - Monitor and execute tasks in `AI Tasks.md` (checkbox format with subtasks and bulleted sub-items)
   - Monitor `User Tasks.md` and offer assistance where possible
   - Manage `04 Prior Art/`: when PDFs are dropped in, index them in `index with Mermaid Timeline.md`, create a subfolder per reference, maintain the Mermaid Gantt chart
   - Read footnotes in documents (`[^n]: text`) as signals for attorney commentary requiring AI contribution
   - Keep task lists, strategy index, and meeting notes organized as content is added
4. **Document workflows** — how amendments flow from `01 Prior Filings` into `02 Amendments and Remarks`, track changes lifecycle; note that resetting Track Changes Originals requires manually deleting files from `01 Track Changes Originals/` (see Track Changes section)
5. **Claims format** — enumerated outline structure, status marker conventions
6. **Communication style** — AI should be concise, task-oriented, and surface questions for the inventor/applicant in `User Tasks.md`

---

## Create Backup (`createBackup.ts`)

### Trigger
User clicks "Create Backup" in Actions tab (or invokes command palette).

### Behavior
1. Detect matter root
2. Navigate to `[matter root]/02 Amendments and Remarks/`
3. If `03 Versions/` does not exist, create it before proceeding
4. Collect all `.md` files directly in `02 Amendments and Remarks/` (non-recursive — subfolders excluded by design: subfolders contain infrastructure, not working documents)
5. Create `03 Versions/[YYYYMMDDHHMM]/` (24-hour time, e.g., `202603171430`)
6. Copy each file into the timestamped folder
7. Log each file copied
8. Show Notice: "Backup created: 03 Versions/202603171430 (4 files)"

### Edge Cases
- If `02 Amendments and Remarks/` not found: log error, show Notice
- If no `.md` files present directly in folder: log warning and show Notice "No markdown files found directly in 02 Amendments and Remarks/ (subfolders are excluded)"

---

## Track Changes (`trackChanges.ts`)

### Trigger
User clicks "Track Changes" in Actions tab (or invokes command palette).

### State Detection
Check if `02 Amendments and Remarks/01 Track Changes Originals/` contains any `.md` files.

- **Empty → Prime mode**
- **Has files → Diff mode**

### Resetting Originals
There is no UI button to reset originals. When the attorney begins a new amendment cycle, they manually delete the contents of `01 Track Changes Originals/`. The next click of Track Changes will then prime fresh originals. This workflow is documented in `AI Instructions.md`.

---

### Prime Mode
1. Collect all `.md` files directly in `02 Amendments and Remarks/`
2. Copy each into `01 Track Changes Originals/`
3. Log each file
4. Show Notice: "Originals saved (4 files) — click Track Changes again to generate markup"

---

### Diff Mode

**Per-file pipeline:**

#### 1. Pre-process current file
Strip existing user-applied strikethrough (`~~...~~`) from the current version before diffing. These are treated as content the user has already marked for deletion — they should not appear as "current" material in the diff engine.

#### 2. Detect file type
A file is treated as a **claims document** if ALL of the following are true:
- It contains 3 or more top-level numbered items matching the pattern `/^\d+\.\s/m`
- At least one line contains a claim-element keyword: `comprising`, `consisting`, `wherein`, or `wherein said`
- The file is NOT purely a remarks or strategy document (i.e., does not start with `# Remarks` or `# Strategy`)

If criteria not met → prose pipeline.

#### 3a. Claims Pipeline
1. Parse both original and current into structured claim objects:
   ```
   { claimNumber, existingStatusMarker, preamble, clauses[] }
   ```
2. Match claims by number across versions
3. Word-level diff within each matched claim using `diff-match-patch`
4. Assign status marker per claim:

   | Condition | Marker |
   |-----------|--------|
   | Claim exists in both; content changed | `(Currently Amended)` |
   | Claim exists in both; unchanged; existing marker is `(Currently Amended)`, `(Previously Amended)`, or `(New)` | `(Previously Amended)` |
   | Claim exists in both; unchanged; no prior marker | `(Original)` |
   | Claim exists only in current version | `(New)` |
   | Claim exists only in original | `(Canceled)` — heading retained with marker, body struck through |

5. Format output with status marker after claim number:
   ```
   1. (Currently Amended) A method for...
   ```

#### 3b. Prose Pipeline (spec, abstract, remarks)
1. **Paragraph-level pre-pass:**
   - Split both versions into paragraphs (double newline boundaries)
   - Hash each paragraph
   - Identify paragraphs present in both versions at different positions → mark as `moved`
   - Moved paragraphs are excluded from the line-level diff and annotated separately
2. For non-moved content: run `diff-match-patch` with semantic cleanup
3. Apply formatting:
   - Deletions: `~~deleted text~~`
   - Insertions: `<u>inserted text</u>`
4. Moved paragraphs: wrap in an Obsidian callout block:
   ```markdown
   > [!NOTE] Moved
   > Original paragraph text here...
   ```
   This renders as a visible callout in Obsidian preview. The paragraph appears at its new position in the output with the callout annotation.

#### 4. Write output
Write formatted markdown to `02 Track Changes USPTO Markup/[same filename]`. Always overwrites previous output.

#### 5. Log
Log per-file: filename, number of insertions, number of deletions, claim count if applicable.

---

## Right Sidebar Panel (`SidebarPanel.ts`)

**Type:** Obsidian `ItemView`, registered to the right sidebar leaf.
**View type ID:** `office-action-tool`
**Display name:** Office Action Tool

### Tab 1: Actions
Three labeled buttons, top to bottom:

| Button | Icon | Hover tooltip |
|--------|------|---------------|
| Create Structure | folder-plus | "Scaffold matter folder structure and AI Instructions" |
| Create Backup | archive | "Copy current amendments to a timestamped version folder" |
| Track Changes | git-compare | "Prime originals or generate USPTO-formatted track changes" |

Each button: on click → run operation → on error → switch to Log tab automatically.

### Tab 2: Notes (Footnote Panel)
- Reads all footnotes from the currently active document (`[^label]: text` syntax)
- Displays as a scrollable list: label + full footnote text
- Clicking an entry scrolls the editor to the **first occurrence** of the inline reference `[^label]` in the document
- Updates in real-time on active file change and on editor change events
- Empty state message: "No footnotes in current document"

### Tab 3: Log
- Scrollable list of timestamped log entries
- Color-coded: green = success, yellow = warning, red = error, gray = info
- Format: `[HH:MM:SS] message`
- `LogService` is instantiated in `main.ts` and passed by reference to all tools — it is not a module-level singleton, ensuring clean lifecycle tied to plugin `onload`/`onunload`
- Log is cleared on plugin reload (not persisted to disk)
- Auto-scrolls to latest entry
- On any error during an operation: panel switches to Log tab automatically

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Folder detection anchor | `AI Instructions.md` presence | Plugin-exclusive file; reliable, unambiguous |
| No file explorer fallback | Require active file | Explorer selection state is not a stable Obsidian API |
| Diff library | `diff-match-patch` for prose | Semantic cleanup produces human-readable output; battle-tested |
| Claims diffing | Parse-and-match by claim number | Handles cancellation/renumbering correctly; Myers diff can't |
| Paragraph move detection | Hash-based pre-pass | Covers real-world reordering without full semantic diff engine |
| Moved paragraph annotation | Obsidian callout `> [!NOTE] Moved` | Renders visibly in preview; does not break prose flow |
| Existing strikethrough | Strip before diffing | User markup = user intent; don't re-process |
| Track changes versioning | Always overwrite output | Version history lives in `03 Versions/`; no output file sprawl |
| Originals reset | Manual deletion by user | Explicit user intent required; documented in AI Instructions |
| Backup scope | `.md` files in `02 Amendments and Remarks/` root only | Subfolders are infrastructure, not working docs |
| LogService | Instance passed by reference from `main.ts` | Correct plugin lifecycle; avoids stale state on hot-reload |
| Footnote scroll target | First occurrence of inline reference | Predictable, simple; multi-use footnotes are edge cases |

---

## Out of Scope (This Version)
- Cross-matter search or vault-wide operations
- PDF parsing or conversion
- Automatic claim dependency graph
- Notes tab collections or cross-file footnote aggregation
- Any AI/LLM calls from within the plugin itself
- "Reset Originals" UI button (manual deletion is the mechanism)
