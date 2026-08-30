from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse
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

# 6. Meta WhatsApp Cloud API Webhook Verification & Listener
@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook", methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request):
    if request.method == "GET":
        params = dict(request.query_params)
        mode = params.get("hub.mode") or params.get("hub_mode")
        token = params.get("hub.verify_token") or params.get("hub_verify_token")
        challenge = params.get("hub.challenge") or params.get("hub_challenge")
        
        expected_token = "railsathi_whatsapp_verify_token_2026"
        
        if token == expected_token or mode == "subscribe":
            return PlainTextResponse(content=str(challenge or "VERIFIED"), status_code=200)
        
        return PlainTextResponse(content="Forbidden - Invalid verify token", status_code=403)
    
    # POST Webhook Event Handler
    try:
        body = await request.json()
        return JSONResponse(content={"status": "received"}, status_code=200)
    except Exception:
        return JSONResponse(content={"status": "received"}, status_code=200)
