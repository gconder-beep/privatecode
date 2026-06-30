@echo off
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed.
    echo Please download and install it from https://nodejs.org
    echo Then double-click this file again.
    pause
    exit /b 1
)
cd /d "%~dp0"
node server.js
pause
