@echo off
REM Stop Study Companion servers
powershell -NoProfile -Command "$p=@(8000,5173); foreach ($port in $p) { Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }; 'Servers on :8000 and :5173 stopped.'"
