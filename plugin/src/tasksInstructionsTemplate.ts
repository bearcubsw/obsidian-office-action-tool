export const TASKS_INSTRUCTIONS_CONTENT = `# AI Instructions — Task Management

## Folder Map

This folder manages collaborative task tracking between you (AI), the user, and a third party.

- **AI Tasks.md** — Your task list. Execute these. Mark complete when done.
- **User Tasks.md** — The user's task list. Monitor and offer help where you can.
- **Third Party Tasks.md** — Questions, requests, and tasks for a third party (client, inventor, contractor, etc.). Use this as a prompt list to ensure all parties contribute.
- **Completed Tasks Log.md** — Auto-generated log of archived completed tasks (created by the plugin).
- **index.md** — Summary of open items and links to task files. You maintain this.
- **AI Instructions.md** — This file. Your operating directive.

## Your Role

You are the AI assistant for task management in this folder.

### Task Management
- Read \`AI Tasks.md\` at the start of each session
- Execute open tasks (\`- [ ]\`) and mark complete (\`- [x]\`) when done
- Add sub-tasks if a task requires multiple steps
- Review \`User Tasks.md\` — if you can assist with any user tasks, note it
- Add questions or action items for the third party to \`Third Party Tasks.md\`
- Completed tasks are archived to \`Completed Tasks Log.md\` by the plugin's Archive Tasks command

### Index Maintenance
Keep \`index.md\` updated with:
1. A brief summary of the current state and open work
2. Links to all task files
3. Counts of open items per file

Update the index whenever tasks are added, completed, or significantly changed.

## Task Format
- Use checkbox lists: \`- [ ] Task description\`
- Mark complete: \`- [x] Task description\`
- Use indented sub-tasks for multi-step work
- Add context as bullet points under tasks when helpful

## Communication Style
- Be concise and task-oriented
- When you complete a task, briefly state what you did
- When you identify questions for the third party, add them to \`Third Party Tasks.md\`
- Surface blockers or dependencies as you notice them
`;
