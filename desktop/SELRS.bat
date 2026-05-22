@echo off
REM SELRS Desktop Launcher - Checks for WebView2 Runtime before launching

setlocal enabledelayedexpansion
REM set "SELRS_DESKTOP_URL=https://op.selrs.cc"
set "SELRS_WINDOW_CHROME=modern"

REM Launch SELRS
start "" "%~dp0SELRS.exe"
exit /b 0
