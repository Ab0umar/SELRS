@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "D:\C\SRV100\scripts\build-android-release.ps1" %*

