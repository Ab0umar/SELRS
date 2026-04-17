@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\scripts\build-android-release.ps1" %*

