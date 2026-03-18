param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$VaultPath
)

$dir = Join-Path $VaultPath ".obsidian\plugins\office-action-tool"
$src = "C:\Dev\Obsidian-Office-Action-Tool\plugin"

# Always clean and recreate to avoid Google Drive sync corruption
if (Test-Path $dir) {
    Remove-Item $dir -Recurse -Force
    Write-Host "Removed existing plugin directory."
}
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$files = @("main.js", "manifest.json", "styles.css")
foreach ($f in $files) {
    Copy-Item (Join-Path $src $f) (Join-Path $dir $f)
    Write-Host "Copied $f"
}

Write-Host "Plugin installed to: $dir"
Write-Host "Restart Obsidian to load the plugin."
