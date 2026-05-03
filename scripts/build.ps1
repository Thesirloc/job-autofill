# Build the extension into dist\jobfill-v<version>.zip and dist\unpacked\.
# Use from PowerShell on Windows. Mirrors scripts/build.sh.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$manifest = Get-Content -Raw manifest.json | ConvertFrom-Json
$version = $manifest.version
if (-not $version) { throw "Could not read version from manifest.json" }

$name     = "jobfill-v$version"
$dist     = Join-Path $root "dist"
$unpacked = Join-Path $dist "unpacked"
$zip      = Join-Path $dist "$name.zip"

$include = @("manifest.json", "background", "content", "icons", "lib", "options", "popup")

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $unpacked | Out-Null

foreach ($item in $include) {
  if (-not (Test-Path $item)) { throw "Missing required path: $item" }
  Copy-Item -Path $item -Destination $unpacked -Recurse
}

Compress-Archive -Path (Join-Path $unpacked "*") -DestinationPath $zip -Force

Write-Host "Built  : $zip"
Write-Host "Unpack : $unpacked"
Write-Host "Version: $version"
