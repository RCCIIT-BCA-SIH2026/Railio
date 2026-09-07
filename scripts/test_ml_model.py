import os
import sys

# Ensure console supports UTF-8 or fall back gracefully
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Ensure ai-service is in python path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai-service"))

try:
    from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest  # type: ignore
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

def run_ml_terminal_test():
    print("==========================================================")
    print("[ML] RailSathi AI/ML Suburban Delay Predictor Terminal Test")
    print("==========================================================")
    
    # Check if params are loaded
    if not eta_predictor.schedules:
        print("[Warning] Train schedules database is empty. Make sure datasets are placed correctly.")
    else:
        print(f"Loaded {len(eta_predictor.schedules)} train schedules from CSV study.")
        
    if eta_predictor.gbr_model:
        print("[OK] Gradient Boosting Regressor Model (joblib) loaded successfully.")
    else:
        print("[WARN] GBR Model file not found. Running on regression baseline heuristics.")
        
    print("\nAvailable Sample Trains for testing:")
    print(" - 37102 Arambagh - Howrah Local (Tarakeswar Line DOWN, Scheduled Dep: 03:00)")
    print(" - 31102 Bangaon - Sealdah Local (Bangaon Line DOWN, Scheduled Dep: 03:00)")
    print(" - 37313 Howrah - Barddhaman Local (Main Line UP, Scheduled Dep: 03:00)")
    print(" - 31106 Gede - Sealdah Local (Main Line DOWN, Scheduled Dep: 04:10)")
    
    while True:
        try:
            print("\n----------------------------------------------------------")
            train_num = input("Enter Suburban Train Number to test (or 'exit' to quit): ").strip()
            if train_num.lower() == 'exit':
                break
                
            if not train_num:
                train_num = "37102"
                print("Using default train: 37102")
                
            # Inputs
            speed_str = input("Enter current train speed in km/h [default: 38]: ").strip()
            speed = float(speed_str) if speed_str else 38.0
            
            dist_str = input("Enter distance remaining in km [default: 12]: ").strip()
            dist = float(dist_str) if dist_str else 12.0
            
            cong_str = input("Enter junction congestion level (0.0 to 1.0) [default: 0.6]: ").strip()
            cong = float(cong_str) if cong_str else 0.6
            
            weather = input("Enter weather condition (Clear/Rain/Fog) [default: Clear]: ").strip()
            if not weather:
                weather = "Clear"
                
            dwell_str = input("Enter current station dwell time in minutes [default: 2.0]: ").strip()
            dwell = float(dwell_str) if dwell_str else 2.0
            
            # Predict
            req = DelayPredictionRequest(
                trainNumber=train_num,
                currentSpeed=speed,
                distanceRemaining=dist,
                junctionCongestionLevel=cong,
                dwellTime=dwell,
                weatherCondition=weather
            )
            
            res = eta_predictor.predict(req)
            
            # Print Output
            print("\n* --- Prediction Results ---")
            print(f"• Train Number: {train_num}")
            print(f"• Expected Delay: {res.expectedDelay}")
            print(f"• Arrival Window: {res.arrivalWindow}")
            print(f"• Model Confidence Score: {res.confidenceScore * 100:.0f}%")
            print(f"• Delay Probability: {res.delayProbability * 100:.0f}%")
            print(f"• Prediction Model Used: {res.modelType}")
            
            print("\n* --- Explainable AI Attribution (SHAP Attribution) ---")
            for factor in res.explainability:
                print(f"  [{factor.category}] {factor.factor}: +{factor.impactMin} min")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    run_ml_terminal_test()
