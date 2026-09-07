# RailSathi (Smart Rail AI) — All-in-One Development Launcher
# Starts: Backend (Port 5000), AI Service (Port 8000), Admin Web (Port 3000), and Mobile Web (Port 8081)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "🚆 LAUNCHING RAILSATHI (SMART RAIL AI) COMPLETE ECOSYSTEM" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "• FastAPI AI/ML Microservice -> http://localhost:8000 (Docs: /docs)" -ForegroundColor Green
Write-Host "• Node.js Gateway & Simulation Engine -> http://localhost:5000" -ForegroundColor Green
Write-Host "• Admin Controller Web Dashboard -> http://localhost:3000" -ForegroundColor Green
Write-Host "• React Native Mobile Expo App -> Metro Bundler (Port 8081)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot

# 1. Start AI Microservice
Write-Host "`n[1/4] Starting FastAPI AI/ML Microservice on port 8000..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c python -m uvicorn app.main:app --port 8000 --reload" -WorkingDirectory "$root\ai-service"

# 2. Start Node.js Backend Gateway
Write-Host "`n[2/4] Starting Node.js Backend Gateway on port 5000..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$root\backend"

# 3. Start Admin Web Dashboard
Write-Host "`n[3/4] Starting Admin Controller Dashboard on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory "$root\admin-web"

# 4. Start React Native Mobile App
Write-Host "`n[4/4] Starting React Native Mobile Metro Bundler (Expo Go QR)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx expo start -c" -WorkingDirectory "$root\mobile"

Write-Host "`n🚀 ALL RAILSATHI SERVICES ARE RUNNING CONCURRENTLY!" -ForegroundColor Green
Write-Host "• FastAPI AI Service -> http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "• Node Backend       -> http://localhost:5000" -ForegroundColor Gray
Write-Host "• Admin Dashboard    -> http://localhost:3000" -ForegroundColor Gray
Write-Host "• Mobile Expo App    -> Port 8081" -ForegroundColor Gray
