# Copy the latest exported markers.json from the Downloads folder into the
# project, then commit and push so GitHub Pages redeploys with the new
# coordinates. Uses the already-authenticated git credentials (no token needed).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$downloads = Join-Path $env:USERPROFILE "Downloads"
$latest = Get-ChildItem -Path $downloads -Filter "markers*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latest) {
    Write-Host "  No markers.json found in your Downloads folder." -ForegroundColor Red
    Write-Host "  Export it from the editor first (the 'Export markers.json' button), then run this again." -ForegroundColor Yellow
    Read-Host "  Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "  Applying: $($latest.Name)   (saved $($latest.LastWriteTime))" -ForegroundColor Cyan
Copy-Item $latest.FullName "public\data\markers.json" -Force

git add public/data/markers.json
if (git status --porcelain public/data/markers.json) {
    git commit -m "chore: update marker coordinates" | Out-Null
    git push
    Write-Host "  Uploaded. The website will update in a few minutes." -ForegroundColor Green
}
else {
    Write-Host "  Coordinates are unchanged; nothing to upload." -ForegroundColor Yellow
}
Read-Host "  Press Enter to close"
