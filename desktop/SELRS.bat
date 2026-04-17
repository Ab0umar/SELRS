@echo off
REM SELRS Desktop Launcher - Checks for WebView2 Runtime before launching

setlocal enabledelayedexpansion
set "SELRS_DESKTOP_URL=http://192.168.0.100:4000"
set "SELRS_WINDOW_CHROME=modern"

REM Check for WebView2 Runtime
reg query "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" >nul 2>&1

if errorlevel 1 (
  echo.
  echo ==========================================
  echo WebView2 Runtime Not Found
  echo ==========================================
  echo.
  echo SELRS Desktop requires WebView2 Runtime.
  echo.
  echo Downloading WebView2 Installer...
  echo.

  REM Download WebView2 Bootstrapper
  PowerShell -Command ^
    "$ProgressPreference = 'SilentlyContinue'; ^
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' ^
    -OutFile '%TEMP%\MicrosoftEdgeWebview2Setup.exe'; ^
    Write-Host 'Download complete. Installing WebView2...'; ^
    Start-Process '%TEMP%\MicrosoftEdgeWebview2Setup.exe' -Wait"

  echo.
  echo WebView2 installation complete. Starting SELRS...
  echo.
)

REM Launch SELRS
start "" "%~dp0SELRS.exe"
exit /b 0
