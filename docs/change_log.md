# Change Log — Office Action Tool

## [0.1.0] — 2026-03-17

### Added
- Initial release of the Obsidian Office Action Tool plugin
- **Right sidebar panel** with three tabs: Actions, Notes, Log
- **Create Structure** — scaffolds full matter folder tree with all placeholder files and AI Instructions.md
- **Create Backup** — copies working amendment files to a timestamped `03 Versions/` snapshot
- **Track Changes** — USPTO-formatted diff output with:
  - Prime mode (first click saves originals)
  - Diff mode with `~~strikethrough~~` for deletions and `<u>underline</u>` for insertions
  - Claims pipeline: parse-and-match by claim number with full status markers (Currently Amended, Previously Amended, Original, New, Canceled)
  - Prose pipeline: `diff-match-patch` with paragraph-level move detection
  - Pre-processing strips user-applied strikethrough before diffing
- **Notes tab** — live footnote panel surfacing `[^label]: text` entries from the active document; click to scroll to inline reference
- **Log tab** — timestamped, color-coded activity log (green/yellow/red/gray); auto-switches on error
- Matter root detection via `AI Instructions.md` anchor (walks up to 6 folder levels)
- All three operations also registered as Obsidian command palette commands
- Ribbon icon for quick sidebar access

### Technical
- Built with TypeScript + esbuild
- `diff-match-patch` library for prose diffing
- Full Jest + ts-jest unit test suite (LogService, matterUtils, createStructure, createBackup, claimsParser, proseDiff, trackChanges)
