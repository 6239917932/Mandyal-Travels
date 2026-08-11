@echo off
setlocal
cd /d "%~dp0"

echo Updating Mandyal Travels Portal from GitHub...
git pull --ff-only
if errorlevel 1 goto :failed

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
