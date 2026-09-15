@echo off
cd /d "%~dp0"
echo Starting R76 CertiScale...
echo.
start "R76 CertiScale Server" cmd /k "cd /d %~dp0 && npm run api"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3000/"
