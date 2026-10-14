@echo off
REM Study Companion PS-01 — single-command starter. Double-click start.bat or run: start.bat
REM Needs: LM Studio running (optional, fallback OK) + deps installed (pip install -r backend\requirements.txt, npm install in frontend\)
cd /d %~dp0
echo [1/3] Backend on :8000 ...
start "study-backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --port 8000"
echo [2/3] Frontend on :5173 ...
start "study-frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5173"
echo [3/3] Opening app in browser ...
timeout /t 9 >nul
start "" http://localhost:5173
echo Done. App: http://localhost:5173  API: http://localhost:8000/api/health  Stop: stop.bat
