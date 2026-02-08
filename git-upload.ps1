# Git Upload Script for EverWatt Engine
# Run this in a NEW PowerShell window after installing Git

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Try to find Git
$gitExe = $null
$possiblePaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
    "$env:ProgramFiles\Git\bin\git.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $gitExe = $path
        Write-Host "Found Git at: $gitExe" -ForegroundColor Green
        break
    }
}

# If still not found, try using git command (might work after PATH refresh)
if (-not $gitExe) {
    try {
        $null = Get-Command git -ErrorAction Stop
        $gitExe = "git"
        Write-Host "Git found in PATH" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Git not found. Please:" -ForegroundColor Red
        Write-Host "1. Close and reopen PowerShell/Terminal" -ForegroundColor Yellow
        Write-Host "2. Or restart your computer after installing Git" -ForegroundColor Yellow
        Write-Host "3. Then run this script again" -ForegroundColor Yellow
        exit 1
    }
}

# Change to project directory
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath
Write-Host "Working in: $projectPath" -ForegroundColor Cyan

# Initialize repository if needed
if (-not (Test-Path .git)) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    & $gitExe init
}

# Configure remote
$remoteUrl = "https://github.com/Nik510/Cursor_EverWatt_AI.git"
$existingRemote = & $gitExe remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote repository..." -ForegroundColor Cyan
    & $gitExe remote add origin $remoteUrl
} else {
    Write-Host "Updating remote URL..." -ForegroundColor Cyan
    & $gitExe remote set-url origin $remoteUrl
}

# Configure Git user (if not already set)
$userName = & $gitExe config user.name 2>$null
if (-not $userName) {
    Write-Host "Configuring Git user..." -ForegroundColor Cyan
    & $gitExe config user.name "Nik510"
    & $gitExe config user.email "your-email@example.com"
    Write-Host "Note: Update email with: git config user.email 'your-email@example.com'" -ForegroundColor Yellow
}

# Add all files
Write-Host "Adding files to staging..." -ForegroundColor Cyan
& $gitExe add .

# Check if there are changes to commit
$status = & $gitExe status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Cyan
    & $gitExe commit -m "Initial commit: EverWatt Engine with comprehensive equipment database, HVAC compendiums, and master EE database"
} else {
    Write-Host "No changes to commit." -ForegroundColor Yellow
}

# Get current branch
$branch = & $gitExe branch --show-current 2>$null
if (-not $branch) {
    $branch = "main"
    & $gitExe branch -M main
}

Write-Host ""
Write-Host "Ready to push!" -ForegroundColor Green
Write-Host "Branch: $branch" -ForegroundColor Cyan
Write-Host ""

# Try to push
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "You may be prompted for authentication." -ForegroundColor Yellow
Write-Host ""

& $gitExe push -u origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS! Code uploaded to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Nik510/Cursor_EverWatt_AI" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push may have failed due to authentication." -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Use a Personal Access Token (recommended)" -ForegroundColor White
    Write-Host "   Create at: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "   Use token as password when prompted" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Or use SSH: git remote set-url origin git@github.com:Nik510/Cursor_EverWatt_AI.git" -ForegroundColor White
}

