# Script to upload EverWatt Engine to GitHub
# Run this script after Git is installed

Write-Host "Checking Git installation..." -ForegroundColor Cyan
$gitPath = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $gitPath) {
    Write-Host "ERROR: Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Git found at: $gitPath" -ForegroundColor Green
Write-Host ""

# Change to project directory
Set-Location $PSScriptRoot

# Check if .git exists
if (-not (Test-Path .git)) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to initialize Git repository" -ForegroundColor Red
        exit 1
    }
}

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote repository..." -ForegroundColor Cyan
    git remote add origin https://github.com/Nik510/Cursor_EverWatt_AI.git
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to add remote repository" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Remote already exists: $remoteExists" -ForegroundColor Green
    Write-Host "Updating remote URL..." -ForegroundColor Cyan
    git remote set-url origin https://github.com/Nik510/Cursor_EverWatt_AI.git
}

# Check current branch
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    Write-Host "No branch exists. Creating initial commit..." -ForegroundColor Cyan
    git add .
    git commit -m "Initial commit: EverWatt Engine with comprehensive equipment database"
    $currentBranch = "main"
    git branch -M main
} else {
    Write-Host "Current branch: $currentBranch" -ForegroundColor Green
    Write-Host "Adding files to staging..." -ForegroundColor Cyan
    git add .
    
    $status = git status --porcelain
    if ($status) {
        Write-Host "Committing changes..." -ForegroundColor Cyan
        git commit -m "Update: EverWatt Engine with comprehensive equipment database and fixes"
    } else {
        Write-Host "No changes to commit." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Ready to push to GitHub!" -ForegroundColor Green
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""
Write-Host "To push, run:" -ForegroundColor Yellow
Write-Host "  git push -u origin $currentBranch" -ForegroundColor White
Write-Host ""
Write-Host "If this is the first push and your default branch is 'master', run:" -ForegroundColor Yellow
Write-Host "  git push -u origin $currentBranch:main" -ForegroundColor White
Write-Host ""
Write-Host "You may need to authenticate with GitHub (username/token or SSH key)" -ForegroundColor Cyan

