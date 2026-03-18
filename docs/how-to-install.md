# How to Install — Office Action Tool

**Repository:** https://github.com/bearcubsw/obsidian-office-action-tool
**Requires:** Obsidian 1.4 or later · Desktop only (Windows / Mac / Linux)

---

## Option A — One-command install (recommended)

Open a terminal, paste the command for your OS, and replace the vault path with your own.

### Windows (PowerShell)

```powershell
$vault = "C:\path\to\your\vault"
$dir   = "$vault\.obsidian\plugins\office-action-tool"
$base  = "https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest/download"

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest "$base/main.js"       -OutFile "$dir\main.js"
Invoke-WebRequest "$base/manifest.json" -OutFile "$dir\manifest.json"
Invoke-WebRequest "$base/styles.css"    -OutFile "$dir\styles.css"
```

### Mac / Linux (Terminal)

```bash
VAULT="/path/to/your/vault"
DIR="$VAULT/.obsidian/plugins/office-action-tool"
BASE="https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest/download"

mkdir -p "$DIR"
curl -sL "$BASE/main.js"       -o "$DIR/main.js"
curl -sL "$BASE/manifest.json" -o "$DIR/manifest.json"
curl -sL "$BASE/styles.css"    -o "$DIR/styles.css"
```

After running either command, continue to **Enable the plugin** below.

---

## Option B — Manual download

1. Go to the [latest release](https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest)
2. Download `main.js`, `manifest.json`, and `styles.css`
3. In your vault, create the folder:
   `.obsidian/plugins/office-action-tool/`
4. Move the three downloaded files into that folder

---

## Enable the plugin

1. Open Obsidian → **Settings** → **Community plugins**
2. Turn off **Restricted mode** if prompted
3. Find **Office Action Tool** in the list and toggle it on
4. The briefcase icon appears in the left ribbon; the panel opens in the right sidebar

---

## Setting up a matter

1. In the file explorer, create a folder for the matter (e.g. `Smith 19182905`)
2. Create any file inside it (e.g. a blank `notes.md`) and open it
3. In the sidebar panel → **Actions** tab → click **Create Structure**

This scaffolds the full folder tree and generates `AI Instructions.md` for the matter.

---

## Updating

Re-run the same one-command install above — it overwrites the three files in place.
Then in Obsidian: **Settings → Community plugins → Office Action Tool → Reload**.

---

## Changelog

See [change_log.md](change_log.md) for the full version history.
