param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$VaultPath
)

$dir  = Join-Path $VaultPath ".obsidian\plugins\office-action-tool"
$base = "https://github.com/bearcubsw/obsidian-office-action-tool/releases/latest/download"

$isUpdate = Test-Path (Join-Path $dir "manifest.json")

New-Item -ItemType Directory -Force -Path $dir | Out-Null

$files = @("main.js", "manifest.json", "styles.css")
foreach ($f in $files) {
    Write-Host "Downloading $f..."
    Invoke-WebRequest "$base/$f" -OutFile (Join-Path $dir $f)
}

if ($isUpdate) {
    Write-Host "Plugin updated in: $dir"
} else {
    Write-Host "Plugin installed to: $dir"
}
Write-Host "Restart Obsidian to load the new version."
