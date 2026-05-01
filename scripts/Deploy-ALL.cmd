@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\scripts\deploy-web.ps1" %*



@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\scripts\build-android-release.ps1" %*


@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\desktop\build-complete.ps1" %*



@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\desktop-electron\build.ps1" %*


@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\desktop\build-selrs-desktop-win7.ps1" %*


@echo off
setlocal

cd /d "%~dp0\.."

powershell -ExecutionPolicy Bypass -File "E:\SELRS.cc\desktop\build-selrs-installer-win7.ps1" %*
