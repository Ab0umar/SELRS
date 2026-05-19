:: This script builds and deploys the SELRS desktop application.
:: Prerequisites:
::   - PowerShell must be installed and available in PATH.
:: Usage:
::   deploy-exe.cmd [build-complete.ps1 arguments]
@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "desktop\build-complete.ps1" %*
