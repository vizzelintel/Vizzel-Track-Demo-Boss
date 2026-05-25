# Build React UI + Go server
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\webapp"
if (-not (Test-Path node_modules)) { npm install }
npm run build
Set-Location $root
go build -o server.exe ./cmd/server
Write-Host "OK: server.exe (UI embedded from internal/spa/dist)"
