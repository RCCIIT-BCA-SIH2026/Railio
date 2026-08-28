from fastapi import APIRouter, HTTPException
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest, DelayPredictionResponse
from app.ml.catch_probability import catch_engine, CatchProbabilityInput, CatchProbabilityOutput
from app.cv.crowd_detector import crowd_cv, PlatformCrowdResult
from app.cv.obstacle_detector import obstacle_cv, ObstacleDetectionResponse
from app.iot.anomaly_detector import anomaly_detector, SensorReading, AnomalyResult
from app.digital_twin.network_twin import digital_twin, WhatIfSimulationRequest, WhatIfSimulationResponse
from app.agent.rail_agent import rail_agent, AgentMessageRequest, AgentResponse

router = APIRouter()

# 1. ML Endpoints
@router.post("/ml/predict-delay", response_model=DelayPredictionResponse)
def predict_delay(req: DelayPredictionRequest):
    return eta_predictor.predict(req)

@router.post("/ml/catch-probability", response_model=CatchProbabilityOutput)
def calculate_catch(req: CatchProbabilityInput):
    return catch_engine.calculate(req)

# 2. Computer Vision Endpoints
@router.get("/cv/crowd/platform/{station_code}/{platform_number}", response_model=PlatformCrowdResult)
def analyze_platform_crowd(station_code: str, platform_number: int):
    return crowd_cv.analyze_platform(station_code, platform_number)

@router.post("/cv/obstacle/detect", response_model=ObstacleDetectionResponse)
def detect_obstacle(scenario: str = "PERSON_ON_TRACK"):
    return obstacle_cv.detect(scenario)

# 3. IoT & Track Anomaly
@router.post("/iot/anomaly", response_model=AnomalyResult)
def detect_track_anomaly(reading: SensorReading):
    return anomaly_detector.process_telemetry(reading)

# 4. Digital Twin & What-If
@router.post("/digital-twin/simulate", response_model=WhatIfSimulationResponse)
def simulate_digital_twin(req: WhatIfSimulationRequest):
    return digital_twin.simulate_what_if(req)

# 5. Agentic AI & RAG
@router.post("/agent/chat", response_model=AgentResponse)
def chat_agent(req: AgentMessageRequest):
    return rail_agent.process_query(req)
