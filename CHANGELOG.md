# Changelog

## [1.3.0] — 2026-03-18

### Sidebar Reorganization

- **New tab layout:** Scaffold, Amendments, Outline, Notes, Log
- **Scaffold tab** — "Office Action" (full matter structure) and "Task Folder" (standalone tasks)
- **Amendments tab** — "Create Backup" and "Track Changes"
- **Archive Tasks** removed from sidebar; still available via command palette
- **Fixed button cropping** — border-radius no longer clips at panel edges
- **Install script** — `copyplugin.ps1` now detects update vs fresh install

## [1.2.0] — 2026-03-18

### Create Tasks — Standalone Task Management

- **New command: Create Tasks** — creates a lightweight, flat task management folder in any directory. No patent structure, no subfolders — just task files and AI Instructions.
- **New sidebar button** — "Create Tasks" (list-checks icon) positioned after Create Structure
- **New command palette entry** — `Office Action: Create Tasks`
- **Third Party Tasks** — standalone task folders use "Third Party Tasks.md" instead of "Inventor Tasks.md" for general-purpose use (client, contractor, etc.)
- **Archive Tasks works in both layouts** — detects whether task files are in `01 Tasks/` (matter structure) or flat next to `AI Instructions.md` (standalone); handles both automatically
- **Third Party Tasks archiving** — Archive Tasks now also scans `Third Party Tasks.md` (party: "Third Party")
- **README.md** — project documentation with PowerShell install script, manual install, and usage guide

## [1.1.0] — 2026-03-18

### V2 Folder Structure

Complete restructuring of the matter folder scaffold for improved usability and workflow clarity.

#### Folder Changes
- **01 Tasks/** — promoted to first position (was 05); action-first workflow
- **02 USPTO Records/** — renamed from "Prior Filings" for clarity
- **03 Strategy/** — renumbered (was 03)
- **04 Meetings/** — renumbered (was 04)
- **05 Prior Art/** — promoted to root level (was nested inside Amendments)
- **06 Amendments/** — renamed from "Amendments and Remarks"; subfolders reorganized:
  - `01 Versions/` (was `03 Versions/`)
  - `02 USPTO Output/` (was `02 Track Changes USPTO Markup/`)
  - Removed `01 Track Changes Originals/` and `04 Prior Art/`
- **07 Remarks/** — split out from Amendments into its own root folder

#### New Features
- **Inventor Tasks** — new `Inventor Tasks.md` for questions and tasks for the inventor/applicant
- **Index files** — every folder (except 06 Amendments) gets an `index.md` for Obsidian navigation; AI is instructed to maintain these with intros, links, and narrative
- **Timestamp-appended backups** — backup files now named `spec - 202603181047.md` instead of `spec.md`, preventing filename collisions in Obsidian search

#### Track Changes Overhaul
- Removed the two-phase prime/diff system (no more "originals" folder)
- Track Changes now reads the first version snapshot in `01 Versions/` as the baseline
- Creating a backup IS the priming action — first backup establishes the baseline
- Filenames in version snapshots have timestamps stripped for matching against current amendments

#### Archive Tasks Updates
- Renamed log file from `Tasks Change Log.md` to `Completed Tasks Log.md`
- Added `Notes` column to the log table
- Added `Inventor Tasks.md` as a source file (party: "Inventor")

#### Other
- Updated sidebar tooltips for Track Changes and Archive Tasks
- Rewrote `AI Instructions.md` template with v2 vault map, index management section, and updated workflows
- Updated design spec to reflect all v2 changes
- All named index files standardized to `index.md` (`Strategy Index.md`, `Meetings Index.md`, `index with Mermaid Timeline.md` are now just `index.md`)

## [1.0.0] — 2026-03-17

### Initial Release
- Create Structure: scaffold matter folder tree with AI Instructions
- Create Backup: timestamped version snapshots
- Track Changes: USPTO-formatted claims and prose diffing with status markers
- Archive Tasks: move completed tasks to change log
- Right sidebar panel with Actions, Outline, Notes, and Log tabs
- Footnote panel with click-to-scroll navigation
- Heading outline with navigation
