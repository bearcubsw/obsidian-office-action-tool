# Changelog

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
