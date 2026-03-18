# Obsidian Office Action Tool — Design Spec
**Date:** 2026-03-17
**Updated:** 2026-03-18 (v2 folder structure)
**Status:** Approved

---

## Overview

An Obsidian plugin for patent prosecution workflow. It provides a right-sidebar panel with deterministic tools (Create Structure, Create Backup, Track Changes, Archive Tasks) that scaffold and maintain a consistent vault structure. The heavy AI work is done externally via CLI, guided by an `AI Instructions.md` file the plugin generates. The plugin also surfaces footnotes from the active document as a comment panel (Notes tab), mirroring the Word comment-sidebar workflow.

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
│   ├── SidebarPanel.ts       # Right-panel ItemView — 4 tabs: Actions, Outline, Notes, Log
│   ├── LogService.ts         # Log state class, instantiated in main.ts, passed by reference
│   ├── matterUtils.ts        # Matter-root detection; shared path helpers
│   ├── createStructure.ts    # Tool 1: scaffold folder tree + placeholder files
│   ├── createBackup.ts       # Tool 2: timestamped version snapshot with timestamp-appended filenames
│   ├── trackChanges.ts       # Tool 3: generate USPTO diff output from version baseline
│   ├── archiveTasks.ts       # Tool 4: archive completed tasks to Completed Tasks Log
│   ├── claimsParser.ts       # Claims document parsing and word-level diffing
│   ├── proseDiff.ts          # Prose document diffing with paragraph move detection
│   └── aiInstructionsTemplate.ts  # AI Instructions template content
├── manifest.json
├── package.json
└── esbuild.config.mjs
```

### Command Palette Registration
All four operations are registered as Obsidian commands in `main.ts`, making them available via the command palette and assignable to hotkeys:
- `office-action-tool:create-structure` — "Office Action: Create Structure"
- `office-action-tool:create-backup` — "Office Action: Create Backup"
- `office-action-tool:track-changes` — "Office Action: Track Changes"
- `office-action-tool:archive-tasks` — "Office Action: Archive Tasks"

These commands call the same handler functions as the sidebar buttons.

---

## Matter Root Detection (`matterUtils.ts`)

All tools rely on locating the matter root before operating.

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
├── 01 Tasks/
│   ├── AI Tasks.md
│   ├── User Tasks.md
│   ├── Inventor Tasks.md
│   └── index.md
├── 02 USPTO Records/
│   └── index.md
├── 03 Strategy/
│   └── index.md
├── 04 Meetings/
│   └── index.md
├── 05 Prior Art/
│   └── index.md  (contains Mermaid Gantt timeline template)
├── 06 Amendments/
│   ├── 01 Versions/
│   └── 02 USPTO Output/
├── 07 Remarks/
│   ├── Remarks.md
│   └── index.md
├── index.md
└── AI Instructions.md
```

### Placeholder File Contents

**`07 Remarks/Remarks.md`**
```markdown
# Remarks

```

**`05 Prior Art/index.md`**
```markdown
# Prior Art Index

## References

<!-- Add prior art entries here. Each reference should have a subfolder under 05 Prior Art/. -->

## Timeline

```mermaid
gantt
    title Patent Prosecution Timeline
    dateFormat  YYYY-MM-DD
    section Prior Art
```
```

**`01 Tasks/AI Tasks.md`**
```markdown
# AI Tasks

<!-- Checkbox list of tasks assigned to the AI. Use subtasks and bullets as needed. -->

```

**`01 Tasks/User Tasks.md`**
```markdown
# User Tasks

<!-- Checkbox list of tasks for the attorney/user. AI monitors this and may assist. -->

```

**`01 Tasks/Inventor Tasks.md`**
```markdown
# Inventor Tasks

<!-- Checkbox list of questions and tasks for the inventor/applicant. -->

```

**`index.md` files** — Each folder (except `06 Amendments/`) gets an `index.md` with a heading, AI maintenance comment, and navigation purpose. The AI is instructed to maintain these with introductions, links, and narrative.

### `AI Instructions.md` — Generated Content

This file is both an orientation guide and an active directive for the AI. It is substantive, not a placeholder. It covers:

1. **Vault map** — folder-by-folder description of purpose with v2 numbering
2. **Index management** — AI responsibility to maintain `index.md` in every folder (except `06 Amendments/`) with intros, links, and narrative
3. **File conventions** — naming patterns, document types (ABST, CLM, SPEC, CTFR, CTNF, etc.)
4. **AI role and responsibilities:**
   - Monitor and execute tasks in `01 Tasks/AI Tasks.md` (checkbox format with subtasks and bulleted sub-items)
   - Monitor `01 Tasks/User Tasks.md` and offer assistance where possible
   - Add inventor/applicant questions to `01 Tasks/Inventor Tasks.md`
   - Manage `05 Prior Art/`: index references in `index.md`, create subfolders, maintain Mermaid Gantt chart
   - Read footnotes in documents (`[^n]: text`) as signals for attorney commentary requiring AI contribution
   - Keep indexes, strategy notes, and meeting notes organized as content is added
5. **Document workflows** — how amendments flow into `06 Amendments/`, track changes lifecycle using version baselines
6. **Claims format** — enumerated outline structure, status marker conventions
7. **Communication style** — AI should be concise, task-oriented, and surface questions for the inventor/applicant in `01 Tasks/Inventor Tasks.md`

---

## Create Backup (`createBackup.ts`)

### Trigger
User clicks "Create Backup" in Actions tab (or invokes command palette).

### Behavior
1. Detect matter root
2. Navigate to `[matter root]/06 Amendments/`
3. If `01 Versions/` does not exist, create it before proceeding
4. Collect all `.md` files directly in `06 Amendments/` (non-recursive — subfolders excluded by design: subfolders contain infrastructure, not working documents)
5. Create `01 Versions/[YYYYMMDDHHMM]/` (24-hour time, e.g., `202603171430`)
6. Copy each file with timestamp appended to the filename: `spec.md` → `spec - 202603171430.md`
7. Log each file copied
8. Show Notice: "Backup created: 01 Versions/202603171430 (4 files)"

### Filename Convention
Backup files have the timestamp appended before the extension: `{basename} - {YYYYMMDDHHMM}.md`. This prevents filename collisions in Obsidian search and allows clear identification of snapshot versions. Track Changes strips this suffix when matching baseline files to current amendment files.

### Edge Cases
- If `06 Amendments/` not found: log error, show Notice
- If no `.md` files present directly in folder: log warning and show Notice "No markdown files found directly in 06 Amendments/ (subfolders are excluded)"

---

## Track Changes (`trackChanges.ts`)

### Trigger
User clicks "Track Changes" in Actions tab (or invokes command palette).

### Baseline Discovery
Track Changes uses the **first** (earliest) version snapshot in `01 Versions/` as the baseline for diffing. Version folder names are timestamps (YYYYMMDDHHMM), so alphabetical sort gives chronological order. The first folder represents the original state before any edits.

If no version snapshots exist, Track Changes warns: "No version snapshots found — click Create Backup first to establish a baseline."

### Starting a New Amendment Cycle
To start a fresh cycle (e.g., after filing a response), delete existing version folders in `01 Versions/` and create a new backup. The new backup becomes the new baseline.

---

### Diff Mode

**Per-file pipeline:**

#### 1. Match files
For each `.md` file directly in `06 Amendments/`, find the corresponding baseline file in the first version folder by stripping the ` - YYYYMMDDHHMM` timestamp suffix from the version filename.

#### 2. Pre-process current file
Strip existing user-applied strikethrough (`~~...~~`) from the current version before diffing. These are treated as content the user has already marked for deletion — they should not appear as "current" material in the diff engine.

#### 3. Detect file type
A file is treated as a **claims document** if ALL of the following are true:
- It contains 3 or more top-level numbered items matching the pattern `/^\d+\.\s/m`
- At least one line contains a claim-element keyword: `comprising`, `consisting`, `wherein`, or `wherein said`
- The file is NOT purely a remarks or strategy document (i.e., does not start with `# Remarks` or `# Strategy`)

If criteria not met → prose pipeline.

#### 4a. Claims Pipeline
1. Parse both baseline and current into structured claim objects:
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
   | Claim exists only in baseline | `(Canceled)` — heading retained with marker, body struck through |

5. Format output with status marker after claim number:
   ```
   1. (Currently Amended) A method for...
   ```

#### 4b. Prose Pipeline (spec, abstract, remarks)
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

#### 5. Write output
Write formatted markdown to `02 USPTO Output/[same filename]`. Always overwrites previous output.

#### 6. Log
Log per-file: filename, number of insertions, number of deletions, claim count if applicable.

---

## Archive Tasks (`archiveTasks.ts`)

### Trigger
User clicks "Archive Tasks" in Actions tab (or invokes command palette).

### Behavior
1. Detect matter root
2. Scan `01 Tasks/AI Tasks.md`, `01 Tasks/User Tasks.md`, and `01 Tasks/Inventor Tasks.md` for completed tasks (`- [x]`)
3. Extract completed task text and remove those lines from source files
4. Append rows to `01 Tasks/Completed Tasks Log.md` with columns: #, Party (AI/User/Inventor), Task, Notes, Date-Time
5. If the log doesn't exist, create it with header row

### Edge Cases
- If no completed tasks found: warn and abort
- If a source file doesn't exist: skip it silently
- Pipe characters in task text are escaped for table formatting

---

## Right Sidebar Panel (`SidebarPanel.ts`)

**Type:** Obsidian `ItemView`, registered to the right sidebar leaf.
**View type ID:** `office-action-tool`
**Display name:** Office Action Tool

### Tab 1: Actions
Four labeled buttons, top to bottom:

| Button | Icon | Hover tooltip |
|--------|------|---------------|
| Create Structure | folder-plus | "Scaffold matter folder structure and AI Instructions" |
| Create Backup | archive | "Copy current amendments to a timestamped version folder" |
| Track Changes | git-compare | "Generate USPTO-formatted track changes from version baseline" |
| Archive Tasks | check-check | "Move completed tasks ( - [x] ) from AI Tasks, User Tasks, and Inventor Tasks into Completed Tasks Log" |

Each button: on click → run operation → on error → switch to Log tab automatically.

### Tab 2: Outline
- Reads all headings from the currently active document
- Displays as a navigable tree with heading levels
- Clicking an entry scrolls the editor to that heading

### Tab 3: Notes (Footnote Panel)
- Reads all footnotes from the currently active document (`[^label]: text` syntax)
- Displays as a scrollable list: label + full footnote text
- Clicking an entry scrolls the editor to the **first occurrence** of the inline reference `[^label]` in the document
- Updates in real-time on active file change and on editor change events
- Empty state message: "No footnotes in current document"

### Tab 4: Log
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
| Track changes versioning | Always overwrite output | Version history lives in `01 Versions/`; no output file sprawl |
| Version baseline | First snapshot in `01 Versions/` | Represents original state; user creates new baseline by clearing versions |
| Backup filenames | Timestamp appended (`spec - YYYYMMDDHHMM.md`) | Prevents filename collisions in Obsidian search; track changes strips suffix to match |
| Backup scope | `.md` files in `06 Amendments/` root only | Subfolders are infrastructure, not working docs |
| Index management | AI maintains `index.md` per folder (except Amendments) | Provides Obsidian navigation and full narrative; Amendments is a working folder |
| LogService | Instance passed by reference from `main.ts` | Correct plugin lifecycle; avoids stale state on hot-reload |
| Footnote scroll target | First occurrence of inline reference | Predictable, simple; multi-use footnotes are edge cases |

---

## Out of Scope (This Version)
- Cross-matter search or vault-wide operations
- PDF parsing or conversion
- Automatic claim dependency graph
- Notes tab collections or cross-file footnote aggregation
- Any AI/LLM calls from within the plugin itself
