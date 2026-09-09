"""Smoke test for the real RF model integration."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-service'))

from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest

req = DelayPredictionRequest(
    trainNumber="12301",
    currentSpeed=118.0,
    distanceRemaining=310.0,
    weatherCondition="Clear",
    junctionCongestionLevel=0.45,
    day=9, month=9, dayOfWeek=2,
    departureHour=10, departureMinute=0,
    arrivalHour=18, arrivalMinute=30,
    travelDurationMins=480.0,
    distanceKm=1530.0,
    direction=1,
    departureDelay=4.0,
)

result = eta_predictor.predict(req)
print("=== RF Delay Predictor Smoke Test ===")
print(f"Model type      : {result.modelType}")
print(f"Predicted delay : {result.predictedDelayMinutes} min")
print(f"Arrival window  : {result.arrivalWindow}")
print(f"Confidence      : {result.confidenceScore}")
print(f"Delay prob      : {result.delayProbability}")
print(f"\nExplainability breakdown:")
for f in result.explainability:
    print(f"  [{f.category}] {f.factor}: +{f.impactMin} min")
print("\n✅ Test passed!")
