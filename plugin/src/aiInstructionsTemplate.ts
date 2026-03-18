export const AI_INSTRUCTIONS_CONTENT = `# AI Instructions — Patent Prosecution Vault

## Vault Map

This vault manages a single patent prosecution matter. Folder purposes:

- **index.md** — Matter overview and navigation hub. AI: keep updated with links to all folders.
- **01 Tasks/** — Action items for all parties.
  - **AI Tasks.md** — Your task list. Execute these. Mark complete when done.
  - **User Tasks.md** — Attorney task list. Monitor and offer help where you can.
  - **Inventor Tasks.md** — Questions and tasks for the inventor/applicant. Prompts to ensure all parties contribute.
  - **Completed Tasks Log.md** — Auto-generated log of archived completed tasks.
  - **index.md** — Summary of open items and links to task files.
- **02 USPTO Records/** — Original USPTO documents and prior submissions. Read-only reference. Contains specifications, claims, abstracts, office actions, and responses.
  - **index.md** — Chronological listing of all filings and office actions.
- **03 Strategy/** — Strategic notes and analysis.
  - **index.md** — Running summary and links to strategy notes. Update as strategy evolves.
- **04 Meetings/** — Meeting notes. Subfolder or file per meeting (YYYYMMDD -- Description).
  - **index.md** — Links to meeting notes with dates and summaries.
- **05 Prior Art/** — Prior art references, one subfolder per reference.
  - **index.md** — Reference listing with Mermaid Gantt timeline.
- **06 Amendments/** — Active working documents for claim, specification, and abstract amendments.
  - **01 Versions/** — Timestamped backups. The first version folder serves as the track changes baseline.
  - **02 USPTO Output/** — Generated track-changes markup. Do not modify manually.
- **07 Remarks/** — Attorney remarks and arguments for the current response.
  - **Remarks.md** — The remarks document.
  - **index.md** — Summary of arguments and links.
- **AI Instructions.md** — This file. Your operating directive.

## Index Management

You are responsible for maintaining the \`index.md\` file in every folder (except \`06 Amendments/\`, which is a working folder managed by the plugin).

Each \`index.md\` should contain:
1. A brief introduction describing the folder's purpose and current state
2. Links to all files and subfolders within
3. A narrative summary that helps the reader navigate the matter via Obsidian

Update indexes whenever files are added, removed, or significantly changed. Keep them current so the attorney can navigate the full matter through linked index files.

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
- Read \`01 Tasks/AI Tasks.md\` at the start of each session
- Execute open tasks (\`- [ ]\`) and mark complete (\`- [x]\`) when done
- Add sub-tasks if a task requires multiple steps
- Review \`01 Tasks/User Tasks.md\` — if you can assist with any user tasks, note it
- Add questions for the inventor/applicant to \`01 Tasks/Inventor Tasks.md\`
- Completed tasks are archived to \`01 Tasks/Completed Tasks Log.md\` by the plugin's Archive Tasks command

### Prior Art Management
When references are added to \`05 Prior Art/\`:
1. Create a subfolder for each new reference (e.g., \`01 US12345678 Widget/\`)
2. Update \`05 Prior Art/index.md\`: add entry with reference number, title, date, key claims
3. Update the Mermaid Gantt chart in the index with the reference's relevant date
4. Note in \`01 Tasks/AI Tasks.md\` if the reference requires further analysis

### Footnote Review
When reviewing documents, look for footnotes (\`[^n]: text\`). These are attorney annotations. If a footnote raises a question or task you can address, do so and note it in \`01 Tasks/AI Tasks.md\`.

### Document Maintenance
- Keep \`03 Strategy/index.md\` updated as strategy develops
- When meeting notes are added to \`04 Meetings/\`, extract action items and add them to the appropriate task file
- Update relevant \`index.md\` files whenever content changes

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

1. Place working copies of specification, claims, and abstract in \`06 Amendments/\`
2. Click "Create Backup" to snapshot current state to \`01 Versions/\` — the first backup establishes the baseline
3. Edit working documents in \`06 Amendments/\`
4. Click "Track Changes" to generate USPTO-formatted markup in \`02 USPTO Output/\`
5. To start a fresh amendment cycle: delete existing version folders in \`01 Versions/\` and create a new backup

## Communication Style
- Be concise and task-oriented
- When you identify questions for the inventor, add them to \`01 Tasks/Inventor Tasks.md\`
- When you complete a task, briefly state what you did
- Flag claim scope issues, prior art overlap, or specification support gaps as you notice them
`;
