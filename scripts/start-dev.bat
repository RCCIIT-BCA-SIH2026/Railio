@echo off
TITLE RailSathi (Smart Rail AI) Launcher
echo =================================================================
echo 🚆 LAUNCHING RAILSATHI (SMART RAIL AI) SYSTEM
echo =================================================================
echo.

cd /d "%~dp0\.."

echo [1/4] Starting FastAPI AI/ML Microservice (Port 8000)...
start "RailSathi-AI-Service" cmd /k "cd ai-service && python -m uvicorn app.main:app --port 8000 --reload"

echo [2/4] Starting Node.js Backend Gateway (Port 5000)...
start "RailSathi-Backend" cmd /k "cd backend && npm run dev"

echo [3/4] Starting Admin Web Dashboard (Port 3000)...
start "RailSathi-Admin-Web" cmd /k "cd admin-web && npm run dev"

echo [4/4] Starting Mobile Expo App (Metro + Expo Go QR)...
start "RailSathi-Mobile" cmd /k "cd mobile && set NODE_OPTIONS=--max-old-space-size=8192 && npx expo start -c"

echo.
echo =================================================================
echo 🚀 All 4 services spawned in dedicated background windows!
echo - AI Microservice:    http://localhost:8000/docs
echo - Backend Gateway:    http://localhost:5000
echo - Admin Dashboard:    http://localhost:3000
echo - Mobile Expo Metro:  Scan QR code in RailSathi-Mobile window
echo =================================================================
pause
