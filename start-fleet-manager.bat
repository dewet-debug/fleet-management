@echo off
title Fleet Manager
echo ==========================================
echo   Fleet Manager - Starting Application
echo ==========================================
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install --silent 2>nul

echo.
echo Starting server and client...
echo.
echo   Server: http://localhost:3001
echo   Client: http://localhost:5173
echo.
echo Close this window to stop the application.
echo ==========================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:5173

npm run dev
