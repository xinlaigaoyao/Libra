@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
 echo Please follow README.md to prepare Python and MySQL first.
 pause
 exit /b 1
)
.venv\Scripts\python.exe run.py
pause
