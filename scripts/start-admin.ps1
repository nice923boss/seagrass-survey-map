# Start the Vite dev server (if not already running) and open the admin
# point-coordinate editor in the default browser.
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$port = 5173
$url = "http://localhost:$port/admin.html"

Write-Host ""
Write-Host "  Opening the Seagrass Map point editor..." -ForegroundColor Cyan

$listening = netstat -ano | Select-String ":$port\s.*LISTENING"
if (-not $listening) {
    Write-Host "  Starting the local server (keep the black window open while editing)..." -ForegroundColor Yellow
    Start-Process cmd -WorkingDirectory $root -ArgumentList "/k", "title Seagrass Map Server (close this window to stop) && npm run dev"
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        $listening = netstat -ano | Select-String ":$port\s.*LISTENING"
        if ($listening) { break }
    }
    Start-Sleep -Seconds 1
}

Write-Host "  Opening browser: $url" -ForegroundColor Green
Start-Process $url
Start-Sleep -Seconds 2
