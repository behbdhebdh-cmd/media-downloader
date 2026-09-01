param(
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $root "src-tauri\binaries"

function Get-HostTriple {
    $tuple = & rustc --print host-tuple 2>$null
    if ($LASTEXITCODE -eq 0 -and $tuple) {
        return $tuple.ToString().Trim()
    }
    $info = & rustc -vV
    foreach ($line in $info) {
        if ($line -match "^host:\s+(\S+)") {
            return $Matches[1]
        }
    }
    throw "Could not determine the Rust target triple. Is rustc on PATH?"
}

function Assert-Sidecar([string]$Path, [string]$Label, [long]$MinBytes) {
    if (!(Test-Path -LiteralPath $Path)) {
        throw "$Label is missing: $Path. Run: npm run fetch-sidecars"
    }
    $size = (Get-Item -LiteralPath $Path).Length
    if ($size -lt $MinBytes) {
        throw "$Label is too small ($size bytes), not a real build: $Path"
    }
}

$triple = Get-HostTriple
$ytdlp = Join-Path $binDir "yt-dlp-$triple.exe"
$qjs = Join-Path $binDir "qjs-$triple.exe"

if ($CheckOnly) {
    Assert-Sidecar $ytdlp "yt-dlp" 1MB
    Assert-Sidecar $qjs "qjs" 100KB
    Write-Host "Sidecars OK ($triple)"
    exit 0
}

New-Item -ItemType Directory -Force -Path $binDir | Out-Null

Write-Host "Downloading yt-dlp.exe ..."
curl.exe -L --fail --retry 3 --ssl-no-revoke -A "MediaDownloader/0.1" -o $ytdlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
if ($LASTEXITCODE -ne 0) { throw "Failed to download yt-dlp.exe." }

Write-Host "Downloading QuickJS-NG qjs.exe ..."
curl.exe -L --fail --retry 3 --ssl-no-revoke -A "MediaDownloader/0.1" -o $qjs "https://github.com/quickjs-ng/quickjs/releases/latest/download/qjs-windows-x86_64.exe"
if ($LASTEXITCODE -ne 0) { throw "Failed to download qjs.exe." }

Assert-Sidecar $ytdlp "yt-dlp" 1MB
Assert-Sidecar $qjs "qjs" 100KB
Write-Host "Sidecars are in src-tauri/binaries/ (triple $triple)"
