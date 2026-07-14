# Helper script to push the committed codebase to your GitHub Repository.
# Run this in your local PowerShell console:
# powershell -ExecutionPolicy Bypass -File .\push_to_github.ps1

$defaultRepo = "https://github.com/themrmarcos/fifa-stadium-command.git"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Publishing to GitHub Repository                 " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$repoUrl = Read-Host "GitHub Repository URL [$defaultRepo]"
if (-not $repoUrl) {
    $repoUrl = $defaultRepo
}

# Update remote URL
git remote remove origin 2>$null
git remote add origin $repoUrl

Write-Host "Renaming branch to main..."
git branch -M main

Write-Host "Pushing code to $repoUrl..."
git push -u origin main

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "❌ Push failed. Please verify your repository exists and credentials are correct." -ForegroundColor Red
}
