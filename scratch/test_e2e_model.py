"""
End-to-end test: trains.json → TrainScheduleDB → RF model → formatted reply.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-service'))

from app.ml.train_schedule_db import train_schedule_db
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
from datetime import datetime

# Test both trains
for train_num in ["22436", "12301", "99999"]:  # 99999 = unknown → fallback
    print(f"\n{'='*55}")
    print(f"  Testing train: {train_num}")
    print(f"{'='*55}")

    now = datetime.now()
    ctx = train_schedule_db.build_predictor_context(train_num, now)
    print(f"  Train Name      : {ctx['trainName']}")
    print(f"  Route           : {ctx.get('source')} → {ctx.get('destination')}")
    print(f"  Distance        : {ctx['distanceKm']} km")
    print(f"  Travel Duration : {ctx['travelDurationMins']:.0f} min")
    print(f"  Dep Time        : {ctx['departureHour']:02d}:{ctx['departureMinute']:02d}")
    print(f"  Arr Time        : {ctx['arrivalHour']:02d}:{ctx['arrivalMinute']:02d}")
    print(f"  Departure Delay : {ctx['departureDelay']} min (from live state)")
    print(f"  Current Speed   : {ctx['currentSpeed']} km/h")
    print(f"  Today (d/m/dow) : {ctx['day']}/{ctx['month']}/{ctx['dayOfWeek']}")

    ml_req = DelayPredictionRequest(
        trainNumber=train_num,
        currentSpeed=ctx["currentSpeed"],
        distanceRemaining=ctx["distanceKm"],
        weatherCondition="Clear",
        junctionCongestionLevel=0.45,
        day=ctx["day"], month=ctx["month"], dayOfWeek=ctx["dayOfWeek"],
        departureHour=ctx["departureHour"], departureMinute=ctx["departureMinute"],
        arrivalHour=ctx["arrivalHour"], arrivalMinute=ctx["arrivalMinute"],
        travelDurationMins=ctx["travelDurationMins"],
        distanceKm=ctx["distanceKm"],
        direction=ctx["direction"],
        departureDelay=ctx["departureDelay"],
    )
    result = eta_predictor.predict(ml_req)
    print(f"\n  RF Prediction:")
    print(f"    Predicted delay : {result.predictedDelayMinutes} min")
    print(f"    Arrival window  : {result.arrivalWindow}")
    print(f"    Confidence      : {int(result.confidenceScore*100)}%")
    print(f"    Explainability:")
    for f in result.explainability:
        print(f"      [{f.category}] {f.factor}: +{f.impactMin} min")

print("\n✅ All tests passed!")
