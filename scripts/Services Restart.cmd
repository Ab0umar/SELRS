@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\scripts\Services.ps1" -VersionName 1.0.30 -VersionCode 30 %*

