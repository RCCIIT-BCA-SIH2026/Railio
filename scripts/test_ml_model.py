import os
import sys

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Ensure ai-service is in python path
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_THIS_DIR)
_AI_SERVICE_DIR = os.path.join(_PROJECT_ROOT, "ai-service")
if _AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, _AI_SERVICE_DIR)

try:
    from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
    from app.ml.train_schedule_db import train_schedule_db
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

def run_ml_terminal_test():
    print("==========================================================")
    print("[ML] RailSathi AI/ML Dankuni-Sealdah Delay & ETA Predictor")
    print("==========================================================")
    
    trains = train_schedule_db._all_trains
    print(f"Loaded {len(trains)} trains from dataset.")
    if eta_predictor._model:
        print("[OK] RandomForest Delay Model (train_delay_model.pkl) loaded successfully.")
    else:
        print("[WARN] Model file not found. Running on day-wise statistics fallback.")
        
    print("\nSample Real Trains on Corridor (3,680-row dataset):")
    sample_trains = ["32211", "32212", "32216", "32217", "32226", "32243"]
    for tnum in sample_trains:
        t = train_schedule_db.get(tnum)
        if t:
            print(f" - #{tnum} {t.get('name')} (Dep: {t.get('departureTime')}, Arr: {t.get('arrivalTime')}, Avg Delay: {t.get('avgHistoricalDelayMins')}m)")

    print("\nRunning automated day-wise prediction batch test...")
    test_suite = [
        {"train": "32211", "date": "15-06-2026", "depDelay": 0.0, "desc": "Morning Early (04:07)"},
        {"train": "32217", "date": "15-06-2026", "depDelay": 5.0, "desc": "Morning Rush (06:05)"},
        {"train": "32226", "date": "20-07-2026", "depDelay": 0.0, "desc": "Midday Return (09:47)"},
        {"train": "32243", "date": "28-08-2026", "depDelay": 10.0, "desc": "Evening Rush (18:08)"},
    ]

    for item in test_suite:
        req = DelayPredictionRequest(
            trainNumber=str(item["train"]),
            date=str(item["date"]),
            departureDelay=float(item["depDelay"]),
        )
        res = eta_predictor.predict(req)
        print(f"\n[Test #{item['train']} - {item['desc']}] Date: {item['date']}")
        print(f"  • Scheduled Arrival : {res.scheduledArrival}")
        print(f"  • Predicted Delay   : {res.expectedDelay} (Day-wise hist avg: +{res.dayWiseHistoricalAvg:.1f}m)")
        print(f"  • Predicted ETA     : {res.predictedETA} ({res.arrivalWindow})")
        print(f"  • AI Confidence     : {res.confidenceScore * 100:.0f}%")
        print(f"  • Factors:")
        for f in res.explainability:
            print(f"     - [{f.category}] {f.factor}: +{f.impactMin} min")

    print("\n==========================================================")
    print("Automated test completed successfully!")
    print("==========================================================")

if __name__ == "__main__":
    run_ml_terminal_test()
