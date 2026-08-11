@echo off
setlocal
cd /d "%~dp0"

echo Updating Mandyal Travels Portal from GitHub...
git pull --ff-only
if errorlevel 1 goto :failed

echo.
echo Backing up the local portal database...
if not exist "prisma\dev.db" (
  echo No existing local database was found; this is a first-time setup.
  goto :backup_complete
)
if not exist "prisma\backups" mkdir "prisma\backups"
if errorlevel 1 goto :failed
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "BACKUP_STAMP=%%i"
if not defined BACKUP_STAMP goto :failed
copy /b /y "prisma\dev.db" "prisma\backups\dev-%BACKUP_STAMP%.db" >nul
if errorlevel 1 goto :failed
echo Database backup created: prisma\backups\dev-%BACKUP_STAMP%.db

:backup_complete

echo.
echo Applying reviewed database changes...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo The database update was not completed. No data-loss warning was accepted automatically.
  echo Keep this window open and ask Codex to review the message above.
  pause
  exit /b 1
)

echo.
echo Preparing the updated portal...
call npx prisma generate
if errorlevel 1 goto :failed

echo.
echo Mandyal Travels Portal is up to date.
echo You can now use START-PORTAL.cmd.
pause
exit /b 0

:failed
echo.
echo The portal update could not be completed. Keep this window open and ask Codex for help.
pause
exit /b 1
