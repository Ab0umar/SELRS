# Check and install WebView2 Runtime if not present
# This script helps Windows 7 users install the WebView2 Runtime

$ErrorActionPreference = "Stop"

$webview2Installed = $false

# Check if WebView2 is installed
try {
  $regPath = "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
  if (Test-Path $regPath) {
    $version = Get-ItemProperty -Path $regPath -Name "pv" -ErrorAction SilentlyContinue
    if ($version) {
      Write-Host "WebView2 Runtime is already installed (version: $($version.pv))" -ForegroundColor Green
      $webview2Installed = $true
    }
  }
}
catch {
  # Registry key doesn't exist, WebView2 probably not installed
}

if (!$webview2Installed) {
  Write-Host ""
  Write-Host "==========================================" -ForegroundColor Cyan
  Write-Host "WebView2 Runtime Not Found" -ForegroundColor Yellow
  Write-Host "==========================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "SELRS Desktop requires WebView2 Runtime to run." -ForegroundColor White
  Write-Host ""
  Write-Host "Please download and install WebView2 Runtime:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Download the 'Evergreen Bootstrapper' and run the installer." -ForegroundColor White
  Write-Host ""
  Write-Host "After installation, restart SELRS." -ForegroundColor White
  Write-Host ""
  Write-Host "==========================================" -ForegroundColor Cyan
  Write-Host ""

  # Try to open the download page
  try {
    Start-Process "https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
    Write-Host "Opening WebView2 download page in your browser..." -ForegroundColor Green
  }
  catch {
    Write-Host "Please visit the URL above to download WebView2 Runtime" -ForegroundColor Yellow
  }

  Read-Host "Press Enter after installing WebView2"
  exit 0
}
else {
  Write-Host "WebView2 Runtime is installed. You can now run SELRS Desktop." -ForegroundColor Green
  exit 0
}
