# Change Log — Office Action Tool

## [1.0.0] — 2026-03-17

### Added
- Initial stable release of the Obsidian Office Action Tool plugin
- **Right sidebar panel** with four tabs: Actions (Create Structure, Create Backup, Track Changes, Archive Tasks), Outline, Notes, Log
- **Create Structure** — scaffolds full matter folder tree with all placeholder files and AI Instructions.md
- **Create Backup** — copies working amendment files to a timestamped `03 Versions/` snapshot
- **Track Changes** — USPTO-formatted diff output with:
  - Prime mode (first click saves originals)
  - Word-level diff with ` ~~strikethrough~~ ` for deletions and `<u>underline</u>` for insertions
  - Space inserted between adjacent strikethrough and underline for readability
  - Claims pipeline: parse-and-match by claim number with full status markers (Currently Amended, Previously Amended, Original, New, Cancelled, Withdrawn)
  - Deleted clauses shown as struck-through (clause number preserved outside markup)
  - Prose pipeline: `diff-match-patch` with paragraph-level move detection
  - Pre-processing strips user-applied strikethrough before diffing
  - Case-insensitive status marker recognition
- **Outline tab** — live heading navigator; click any heading to jump to it in the editor
- **Notes tab** — live footnote panel surfacing `[^label]: text` entries from the active document; click to scroll to inline reference
- **Log tab** — timestamped, color-coded activity log (green/yellow/red/gray); auto-switches on error
- **Archive Tasks** — moves all completed tasks (`- [x]`) from `AI Tasks.md` and `User Tasks.md` into a `Tasks Change Log.md` table (created automatically if absent); removes archived lines from source files; rows are numbered sequentially and stamped with today's date
- Matter root detection via `AI Instructions.md` anchor (walks up to 6 folder levels)
- Sidebar state preserved when sidebar takes focus (outline/notes don't clear on click)
- All four operations also registered as Obsidian command palette commands
- Ribbon icon for quick sidebar access

### Technical
- Built with TypeScript + esbuild
- `diff-match-patch` library for prose and word-level claim diffing
- Full Jest + ts-jest unit test suite (77 tests)
