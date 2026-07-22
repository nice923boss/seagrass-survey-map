# Local Windows build helper.
#
# Works around a rolldown (Vite 8 bundler) crash that happens when the project
# path contains non-ASCII characters (e.g. Chinese). It builds inside an ASCII
# temp directory, junctioning node_modules and public in so nothing large is
# copied, then copies dist back to the project.
#
# GitHub Actions builds on an ASCII path and is NOT affected; this is only for
# building locally on Windows when the project sits under a Chinese path.
#
# Usage:  npm run build:win     (optionally set VITE_BASE first)

$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $PSScriptRoot
$temp = Join-Path $env:TEMP "seagrass-build"

# Clean any previous run (remove junctions first so targets are untouched)
if (Test-Path "$temp\node_modules") { cmd /c "rmdir `"$temp\node_modules`"" }
if (Test-Path "$temp\public") { cmd /c "rmdir `"$temp\public`"" }
Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $temp | Out-Null

# Mirror sources into the ASCII temp dir
Copy-Item "$src\src" "$temp\src" -Recurse
Copy-Item "$src\index.html", "$src\admin.html", "$src\vite.config.ts", "$src\tsconfig.json", "$src\package.json", "$src\package-lock.json" $temp
New-Item -ItemType Junction -Path "$temp\node_modules" -Target "$src\node_modules" | Out-Null
New-Item -ItemType Junction -Path "$temp\public" -Target "$src\public" | Out-Null

# Build on the ASCII path
Set-Location $temp
if (-not $env:VITE_BASE) { $env:VITE_BASE = "/" }
cmd /c "npm run build"
$code = $LASTEXITCODE

# Copy dist back to the real project on success
Set-Location $src
if ($code -eq 0) {
  Remove-Item -Recurse -Force "$src\dist" -ErrorAction SilentlyContinue
  Copy-Item "$temp\dist" "$src\dist" -Recurse
  Write-Output "Build OK. dist copied back to the project."
}
else {
  Write-Output "Build failed with exit code $code."
}

# Clean up (remove junctions first)
cmd /c "rmdir `"$temp\node_modules`""
cmd /c "rmdir `"$temp\public`""
Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
exit $code
