@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "scripts\build-android-release.ps1" %*

