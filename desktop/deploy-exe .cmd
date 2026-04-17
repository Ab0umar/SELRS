:: This script builds and deploys the desktop Electron application.
:: Prerequisites:
::   - PowerShell must be installed and available in PATH.
::   - Node.js and npm should be installed if required by build.ps1.
:: Usage:
::   deploy-exe.cmd [build.ps1 arguments]
@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "desktop-electron\build.ps1" %*
