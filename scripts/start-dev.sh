#!/usr/bin/env bash
# RailSathi (Smart Rail AI) — Linux / macOS Launcher

echo "================================================================="
echo "🚆 LAUNCHING RAILSATHI (SMART RAIL AI) SYSTEM"
echo "================================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to kill child processes on exit
cleanup() {
    echo "Terminating RailSathi services..."
    kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT

echo "[1/4] Starting FastAPI AI/ML Microservice on port 8000..."
(cd "$ROOT_DIR/ai-service" && python3 -m uvicorn app.main:app --port 8000 --reload) &

echo "[2/4] Starting Node.js Backend Gateway on port 5000..."
(cd "$ROOT_DIR/backend" && npm run dev) &

echo "[3/4] Starting Admin Controller Dashboard on port 3000..."
(cd "$ROOT_DIR/admin-web" && npm run dev) &

echo "[4/4] Starting React Native Mobile Web View on port 8081..."
(cd "$ROOT_DIR/mobile" && npm run web) &

echo "================================================================="
echo "🚀 All 4 services running concurrently!"
echo "AI Microservice: http://localhost:8000/docs"
echo "Backend Gateway: http://localhost:5000"
echo "Admin Dashboard: http://localhost:3000"
echo "Mobile Web View: http://localhost:8081"
echo "================================================================="

wait
