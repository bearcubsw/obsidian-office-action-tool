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
