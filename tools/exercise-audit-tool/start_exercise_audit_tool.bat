@echo off
setlocal
cd /d "%~dp0"
where pythonw >nul 2>nul
if %errorlevel%==0 (
  start "" pythonw "%~dp0exercise_audit_tool.pyw"
) else (
  start "" python "%~dp0exercise_audit_tool.pyw"
)
