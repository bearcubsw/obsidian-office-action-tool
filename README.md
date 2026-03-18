# Obsidian Office Action Tool

An Obsidian plugin for patent prosecution workflow and general-purpose task management. Provides a right-sidebar panel with deterministic tools that scaffold folder structures, track document changes in USPTO format, and manage collaborative task lists between AI, user, and third parties.

## Features

- **Create Structure** — Scaffold a full patent prosecution matter folder with AI Instructions, task files, index files, and amendment tracking
- **Create Tasks** — Create a lightweight standalone task management folder for any project (AI Tasks, User Tasks, Third Party Tasks)
- **Create Backup** — Snapshot amendment files to timestamped version folders
- **Track Changes** — Generate USPTO-formatted track changes (claims with status markers, prose with strikethrough/underline)
- **Archive Tasks** — Move completed tasks to a log with sequential numbering
- **Outline** — Heading navigation for the active document
- **Notes** — Footnote panel with click-to-scroll (mirrors Word's comment sidebar)

## Install

### Option 1: PowerShell script

If you have the repo cloned, run:

```powershell
.\scripts\copyplugin.ps1 "C:\path\to\your\vault"
```

Or as a one-liner without cloning:

```powershell
$vault = "C:\path\to\your\vault"
$dir   = "$vault\.obsidian\plugins\office-action-tool"
$base  = "https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest/download"

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest "$base/main.js"       -OutFile "$dir\main.js"
Invoke-WebRequest "$base/manifest.json" -OutFile "$dir\manifest.json"
Invoke-WebRequest "$base/styles.css"    -OutFile "$dir\styles.css"
```

Then restart Obsidian and enable **Office Action Tool** in Settings > Community Plugins.

### Option 2: Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest)
2. Create `<your-vault>/.obsidian/plugins/office-action-tool/`
3. Copy the three files into that folder
4. Restart Obsidian and enable the plugin in Settings > Community Plugins

### Option 3: Build from source

```bash
git clone https://github.com/bearcubsw/obsidian-office-action-tool.git
cd obsidian-office-action-tool/plugin
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` from the `plugin/` directory into your vault's `.obsidian/plugins/office-action-tool/` folder.

## Usage

### Patent Prosecution (Create Structure)

1. Open any file inside the folder you want to use as the matter root
2. Click **Create Structure** in the sidebar Actions tab
3. The plugin scaffolds the full folder tree:

```
[Matter Root]/
├── 01 Tasks/           ← AI, User, Inventor task lists + index
├── 02 USPTO Records/   ← Original filings (read-only reference)
├── 03 Strategy/        ← Strategic notes
├── 04 Meetings/        ← Meeting notes
├── 05 Prior Art/       ← References with Mermaid timeline
├── 06 Amendments/      ← Working copies + versioned backups + USPTO output
├── 07 Remarks/         ← Attorney arguments
├── index.md            ← Matter overview
└── AI Instructions.md  ← AI operating directive
```

### General Task Management (Create Tasks)

1. Open any file inside the folder where you want task tracking
2. Click **Create Tasks** in the sidebar Actions tab
3. The plugin creates a flat task management folder:

```
[Folder]/
├── AI Instructions.md     ← General-purpose task management directive
├── AI Tasks.md
├── User Tasks.md
├── Third Party Tasks.md
└── index.md
```

Use this with Claude Code CLI or any AI assistant — the AI Instructions file tells the AI how to manage the three-party task workflow.

### Track Changes (Patent Workflow)

1. Place working copies of spec/claims/abstract in `06 Amendments/`
2. Click **Create Backup** to establish a baseline
3. Edit your documents
4. Click **Track Changes** to generate USPTO-formatted markup in `02 USPTO Output/`

### Archive Tasks

Works in both matter folders and standalone task folders. Click **Archive Tasks** to move all completed tasks (`- [x]`) into the Completed Tasks Log.

## License

MIT
