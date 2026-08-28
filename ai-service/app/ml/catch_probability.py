from pydantic import BaseModel
from typing import Optional, Dict, Any

class CatchProbabilityInput(BaseModel):
    trainNumber: str
    userLat: Optional[float] = None
    userLng: Optional[float] = None
    userLocationName: Optional[str] = "City Center"
    roadDistanceKm: float = 12.0
    trafficCondition: str = "MODERATE"  # LOW, MODERATE, HEAVY, SEVERE
    stationEntryBufferMin: float = 7.0
    scheduledDepartureTime: Optional[str] = "16:50"
    trainData: Optional[Dict[str, Any]] = None

class CatchProbabilityBreakdown(BaseModel):
    roadTime: int
    stationBuffer: int
    safetyMargin: int
    trafficDelay: int
    delayProbability: float

class CatchProbabilityOutput(BaseModel):
    trainNumber: str
    trainName: str
    predictedDeparture: str
    roadTravelMinutes: int
    stationEntryBufferMinutes: int
    requiredMinutes: int
    availableMinutes: int
    catchProbabilityPct: int
    statusRisk: str  # LOW_RISK, MODERATE_RISK, HIGH_RISK, CRITICAL
    recommendation: str
    alternativeTrain: Optional[Dict[str, str]] = None
    breakdown: CatchProbabilityBreakdown

class CatchProbabilityEngine:
    def calculate(self, req: CatchProbabilityInput) -> CatchProbabilityOutput:
        dist = max(1.0, req.roadDistanceKm)
        
        # Traffic multipliers
        traffic_map = {
            "LOW": 1.0,
            "MODERATE": 1.35,
            "HEAVY": 1.85,
            "SEVERE": 2.40
        }
        multiplier = traffic_map.get(req.trafficCondition.upper(), 1.35)
        
        # Base urban speed = 32 km/h
        base_road_time = (dist / 32.0) * 60.0
        road_time_min = int(round(base_road_time * multiplier))
        traffic_delay = int(round(road_time_min - base_road_time))
        
        station_buffer = int(round(req.stationEntryBufferMin))
        safety_margin = 5
        required_time = road_time_min + station_buffer + safety_margin
        
        # Available time calculation
        train_delay = 0
        if req.trainData and "liveState" in req.trainData:
            train_delay = req.trainData["liveState"].get("delayMinutes", 0)
        
        available_time = int(round(max(5, (dist * 2.8) + train_delay)))
        
        # Non-linear probability sigmoid function
        margin = available_time - required_time
        if margin >= 15:
            prob = 0.94
        elif margin >= 8:
            prob = 0.88
        elif margin >= 3:
            prob = 0.72
        elif margin >= -2:
            prob = 0.48
        elif margin >= -8:
            prob = 0.22
        else:
            prob = 0.08

        prob_pct = int(round(prob * 100))

        if prob_pct >= 75:
            risk = "LOW_RISK"
            rec = "🟢 High probability you can catch your train. Leave now."
        elif prob_pct >= 45:
            risk = "MODERATE_RISK"
            rec = "🟡 Moderate risk: Traffic congestion may tighten margin. Proceed without delay."
        else:
            risk = "CRITICAL"
            rec = "🔴 High risk of missing train. Recommend alternate connection."

        train_name = req.trainData.get("name", "Express") if req.trainData else "Express"
        dep_time = req.trainData.get("departureTime", req.scheduledDepartureTime) if req.trainData else "16:50"

        alt_train = None
        if prob_pct < 50:
            alt_train = {
                "trainNumber": "12841",
                "name": "Coromandel Express",
                "departureTime": "18:15"
            }

        return CatchProbabilityOutput(
            trainNumber=req.trainNumber,
            trainName=train_name,
            predictedDeparture=dep_time,
            roadTravelMinutes=road_time_min,
            stationEntryBufferMinutes=station_buffer,
            requiredMinutes=required_time,
            availableMinutes=available_time,
            catchProbabilityPct=prob_pct,
            statusRisk=risk,
            recommendation=rec,
            alternativeTrain=alt_train,
            breakdown=CatchProbabilityBreakdown(
                roadTime=road_time_min,
                stationBuffer=station_buffer,
                safetyMargin=safety_margin,
                trafficDelay=max(0, traffic_delay),
                delayProbability=0.2
            )
        )

catch_engine = CatchProbabilityEngine()
