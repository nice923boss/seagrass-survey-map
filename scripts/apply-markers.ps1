# Copy the latest exported markers.json from the Downloads folder into the
# project, then commit and push so GitHub Pages redeploys with the new
# coordinates. Uses the already-authenticated git credentials (no token needed).
#
# Note: we intentionally do NOT set $ErrorActionPreference = "Stop". git writes
# normal progress to stderr, and PowerShell 5.1 would otherwise treat that as an
# error and abort the script (window closes before anything is pushed).

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

$status = git status --porcelain public/data/markers.json
if (-not $status) {
    Write-Host "  Coordinates are unchanged; nothing to upload." -ForegroundColor Yellow
    Read-Host "  Press Enter to close"
    exit 0
}

Write-Host "  Uploading to GitHub..." -ForegroundColor Cyan
git add public/data/markers.json
git commit -m "chore: update marker coordinates"
git pull --rebase origin main
git push
$ok = ($LASTEXITCODE -eq 0)

Write-Host ""
if ($ok) {
    Write-Host "  Done! The website will update in a few minutes." -ForegroundColor Green
}
else {
    Write-Host "  Upload failed. Check your internet connection and try again." -ForegroundColor Red
}
Read-Host "  Press Enter to close"
