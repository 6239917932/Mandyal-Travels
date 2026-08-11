@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo Preparing Mandyal Travels Portal for first use...
  call npm install
  if errorlevel 1 (
    echo.
    echo The portal could not be prepared. Keep this window open and ask Codex for help.
    pause
    exit /b 1
  )
)

call npx prisma generate
if errorlevel 1 (
  echo.
  echo The portal database client could not be prepared. Run UPDATE-PORTAL.cmd first.
  pause
  exit /b 1
)

echo Starting Mandyal Travels Portal...
start "Mandyal Travels Portal" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
