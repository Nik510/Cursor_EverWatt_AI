@echo off
echo ========================================
echo EverWatt Engine - GitHub Upload Script
echo ========================================
echo.

REM Refresh PATH to include Git
set "PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd"

REM Try to find git
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git not found in PATH
    echo Please make sure Git is installed and restart this window
    echo Or run this in a new Command Prompt window
    pause
    exit /b 1
)

echo Git found!
echo.

cd /d "%~dp0"

echo Initializing repository...
git init
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Configuring remote...
git remote remove origin 2>nul
git remote add origin https://github.com/Nik510/Cursor_EverWatt_AI.git
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Adding files...
git add .
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Committing changes...
git commit -m "Initial commit: EverWatt Engine with comprehensive equipment database, HVAC compendiums, and master EE database"
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Setting branch to main...
git branch -M main
if %ERRORLEVEL% NEQ 0 goto error

echo.
echo Pushing to GitHub...
echo NOTE: You may be prompted for username and password
echo Use your GitHub Personal Access Token as the password
echo.
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Push may have failed due to authentication.
    echo You may need to:
    echo 1. Create a Personal Access Token at: https://github.com/settings/tokens
    echo 2. Use the token as your password when prompted
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Code uploaded to GitHub!
echo Repository: https://github.com/Nik510/Cursor_EverWatt_AI
echo ========================================
pause
exit /b 0

:error
echo.
echo ERROR: An error occurred during upload
pause
exit /b 1

