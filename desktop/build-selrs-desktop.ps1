param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$OutDir = (Join-Path $PSScriptRoot "publish")
)

$ErrorActionPreference = "Stop"

# Sync version from root package.json
$packageJsonPath = Join-Path (Split-Path -Parent $PSScriptRoot) "package.json"
$packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
$version = $packageJson.version

$project = Join-Path $PSScriptRoot "SelrsDesktop\SelrsDesktop.csproj"

Write-Host "[SELRS] Publishing version $version..." -ForegroundColor Cyan
dotnet publish $project `
  -c $Configuration `
  -r $Runtime `
  --self-contained false `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -p:Version=$version `
  -p:InformationalVersion=$version `
  -o $OutDir
if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed with exit code $LASTEXITCODE"
}

Write-Host "[SELRS] Done: $OutDir" -ForegroundColor Green
