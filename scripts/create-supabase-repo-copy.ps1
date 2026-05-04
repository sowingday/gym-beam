param(
  [string]$TargetPath = "C:\Data\Workout Base\workout-base"
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Split-Path -Parent $scriptDir

if (-not (Test-Path $sourcePath)) {
  throw "Source path not found: $sourcePath"
}

if (Test-Path $TargetPath) {
  throw "Target path already exists: $TargetPath"
}

New-Item -ItemType Directory -Path $TargetPath | Out-Null

$excludeDirs = @(
  '.git',
  'node_modules',
  'dist',
  '.idea',
  'android\app\build',
  'android\.gradle'
)

$robocopyArgs = @(
  $sourcePath,
  $TargetPath,
  '/E',
  '/R:1',
  '/W:1',
  '/NFL',
  '/NDL',
  '/NJH',
  '/NJS',
  '/XD'
) + $excludeDirs

& robocopy @robocopyArgs | Out-Null

$robocopyExit = $LASTEXITCODE
if ($robocopyExit -ge 8) {
  throw "Robocopy failed with exit code $robocopyExit"
}

Write-Host "Created local copy at: $TargetPath"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Create an empty GitHub repo named 'workout-base'."
Write-Host "2. Open the new folder:"
Write-Host "   $TargetPath"
Write-Host "3. Run:"
Write-Host "   git init"
Write-Host "   git add ."
Write-Host "   git commit -m `"Initial Supabase migration checkpoint`""
Write-Host "   git branch -M main"
Write-Host "   git remote add origin https://github.com/<your-user>/workout-base.git"
Write-Host "   git push -u origin main"
