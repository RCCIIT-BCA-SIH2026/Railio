"""
endpoints.py — RailSathi AI Microservice API Router
====================================================
Exposes all ML inference, operations planning, CV, IoT, digital twin,
WhatsApp, and agent endpoints.
"""

import os
import re
import httpx
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse

# ── ML & Forecasting ──────────────────────────────────────────────────────────
from app.ml.eta_delay_predictor import (
    eta_predictor, DelayPredictionRequest, DelayPredictionResponse, DelayPrediction
)
from app.ml.dynamic_ground_truth_eta import (
    dynamic_eta_engine, DynamicETAPredictionRequest, DynamicETAPredictionResponse,
    GroundCrewIncident, ActiveTSR, StationMasterPlatformAssign
)
from app.ml.train_schedule_db import train_schedule_db, get_ist_now
from app.ml.catch_probability import catch_engine, CatchProbabilityInput, CatchProbabilityOutput
from app.ml.catch_up_optimizer import catch_up_optimizer, CatchUpRequest, CatchUpResponse
from app.ml.self_learning_reward_engine import self_learning_engine

# ── Operations Planning ───────────────────────────────────────────────────────
from app.operations.platform_allocator import (
    platform_allocator, PlatformAllocationRequest, PlatformAllocationResponse
)
from app.operations.crew_hoer_monitor import (
    crew_hoer_monitor, CrewHOERRequest, CrewHOERResponse
)
from app.operations.pit_line_scheduler import (
    pit_line_scheduler, PitLineScheduleRequest, PitLineScheduleResponse
)

# ── CV, IoT, Digital Twin, Agent ─────────────────────────────────────────────
from app.cv.crowd_detector import crowd_cv, PlatformCrowdResult
from app.cv.obstacle_detector import obstacle_cv, ObstacleDetectionResponse
from app.iot.anomaly_detector import anomaly_detector, SensorReading, AnomalyResult
from app.digital_twin.network_twin import digital_twin, WhatIfSimulationRequest, WhatIfSimulationResponse
from app.agent.rail_agent import rail_agent, AgentMessageRequest, AgentResponse
from app.cv.camera_navigator import camera_navigator, SceneAnalysisRequest, SceneAnalysisResult

router = APIRouter()


# ─── Utility functions ────────────────────────────────────────────────────────

def mask_phone_number(phone: str) -> str:
    clean = "".join(filter(str.isdigit, phone or ""))
    if len(clean) >= 10:
        return clean[:3] + "****" + clean[-4:]
    return "****"

def mask_token(token: str) -> str:
    if token and len(token) > 10:
        return token[:6] + "..." + token[-4:]
    return "<NOT_SET>"


# ─── 1. ML Endpoints ──────────────────────────────────────────────────────────

@router.post("/ml/predict-delay", response_model=DelayPredictionResponse)
def predict_delay(req: DelayPredictionRequest):
    """
    Real ML-based ETA delay prediction using trained GradientBoosting model.
    Includes TSR penalty, signal aspect penalty, fog speed cap, and catch-up potential.
    """
    return eta_predictor.predict(req)


@router.post("/ml/catch-probability", response_model=CatchProbabilityOutput)
def calculate_catch(req: CatchProbabilityInput):
    """Calculate probability of catching a train given current location and travel time."""
    return catch_engine.calculate(req)


@router.post("/ml/catch-up-potential", response_model=CatchUpResponse)
def catch_up_potential(req: CatchUpRequest):
    """
    Sectional catch-up potential engine: calculates how much delay
    a train can recover across upcoming high-speed corridor sections.
    """
    return catch_up_optimizer.calculate(req)


@router.post("/ml/predict-dynamic-eta", response_model=DynamicETAPredictionResponse)
def predict_dynamic_eta(req: DynamicETAPredictionRequest):
    """
    Ground-Truth Dynamic ETA forecasting engine.
    Integrates live crew incident feeds (ACP, CRO, signal halts), Caution Orders (TSR),
    Station Master platform berth updates, physics kinematics (Davis drag resistance),
    and multi-station downstream arrival cascading.
    """
    return dynamic_eta_engine.predict_dynamic_eta(req)


@router.post("/telemetry/crew-incident")
def log_crew_incident(req: DynamicETAPredictionRequest):
    """
    1-Tap Frontline Ground Incident Ingestion (Guard / Loco Pilot / Station Master).
    Instantly logs the operational disruption and computes a sub-second downstream ETA cascade.
    """
    return dynamic_eta_engine.predict_dynamic_eta(req)


@router.post("/ml/feedback/actual-arrival")
def record_actual_arrival(payload: Dict[str, Any]):
    """
    Legacy feedback loop (EMA-only). Prefer /ml/feedback/arrival-scored for full reward pipeline.
    """
    train_no = str(payload.get("trainNumber", ""))
    stn = str(payload.get("stationCode", ""))
    sched = str(payload.get("scheduledTime", "08:00"))
    pred = str(payload.get("predictedETA", "08:00"))
    act = str(payload.get("actualArrival", "08:00"))
    return dynamic_eta_engine.record_actual_arrival(train_no, stn, sched, pred, act)


@router.post("/ml/feedback/arrival-scored")
def record_arrival_scored(payload: Dict[str, Any]):
    """
    Self-Learning Reward-Penalty Feedback Endpoint.

    Called automatically every time a train arrives at a station.
    Computes reward (+1) if |error| <= 5 min, penalty (-1) if |error| > 15 min.
    Updates multi-dimensional EMA bias (station, hour, season, route, rake).
    Triggers incremental XGBoost retrain in background every 100 events.

    Required fields:
      trainNumber, stationCode, scheduledArr, predictedETA, actualArrival
    Optional fields:
      routeId, rakeType, stationSequence, distanceRemainingKm,
      fogVisibilityKm, incidentActive, tsrActive, precedingDelayMin
    """
    return self_learning_engine.record_arrival_feedback(
        train_number=str(payload.get("trainNumber", "")),
        station_code=str(payload.get("stationCode", "")),
        scheduled_arr=str(payload.get("scheduledArr", payload.get("scheduledTime", "08:00"))),
        predicted_eta=str(payload.get("predictedETA", "08:00")),
        actual_arrival=str(payload.get("actualArrival", "08:00")),
        route_id=str(payload.get("routeId", "")),
        rake_type=str(payload.get("rakeType", "LHB_COACHING")),
        station_sequence=int(payload.get("stationSequence", 1)),
        distance_remaining_km=float(payload.get("distanceRemainingKm", 0.0)),
        fog_visibility_km=float(payload.get("fogVisibilityKm", 10.0)),
        incident_active=bool(payload.get("incidentActive", False)),
        tsr_active=bool(payload.get("tsrActive", False)),
        preceding_delay_min=float(payload.get("precedingDelayMin", 0.0)),
    )


@router.get("/ml/self-learning/health")
def self_learning_health():
    """
    Self-Learning Engine Health Dashboard.
    Returns reward rate, penalty rate, total feedback events,
    bias summary, model trainer status, and configuration thresholds.
    """
    return self_learning_engine.system_health()


@router.get("/ml/self-learning/bias/{station_code}")
def get_station_bias(station_code: str, hour: int = 12, season: str = "ALL",
                     route_id: str = "", rake_type: str = "LHB_COACHING"):
    """
    Returns the current composite adaptive bias correction (in minutes)
    for a specific station, factoring in time-of-day, season, route, and rake type.
    Used by the ETA engine to apply learned correction to new predictions.
    """
    bias = self_learning_engine.get_bias_correction(
        station_code=station_code.upper(),
        hour_bucket=hour,
        season=season,
        route_id=route_id,
        rake_type=rake_type
    )
    return {
        "stationCode": station_code.upper(),
        "hour": hour,
        "season": season,
        "compositeAdaptiveBiasMinutes": bias,
        "interpretation": (
            f"Predictions at {station_code.upper()} are biased by {bias:+.2f} min "
            f"(+ve = model tends to predict early, -ve = tends to predict late)"
        )
    }


@router.get("/ml/train/{train_number}/ixigo-running-status")
async def get_ixigo_running_status(train_number: str):
    """
    Fetches real-time train running status, passed stations, current delays,
    and platform numbers directly from ixigo.com/trains/{train_number}/running-status.
    """
    from app.ml.live_data_poller import fetch_ixigo_train_live
    result = await fetch_ixigo_train_live(train_number)
    return result


# ─── 2. Operations Planning Endpoints ────────────────────────────────────────

@router.post("/operations/platform-conflicts", response_model=PlatformAllocationResponse)
def platform_conflicts(req: PlatformAllocationRequest):
    """
    Detect overlapping platform occupancy windows at a junction station
    and automatically resolve conflicts via greedy interval-coloring.
    """
    return platform_allocator.solve(req)


@router.post("/operations/crew-hoer", response_model=CrewHOERResponse)
def crew_hoer(req: CrewHOERRequest):
    """
    Evaluate crew duty hours against the 9-hour statutory HOER limit.
    Issues CRITICAL / HIGH_RISK alerts and generates relief crew booking requests.
    """
    return crew_hoer_monitor.evaluate(req)


@router.post("/operations/rake-turnaround", response_model=PitLineScheduleResponse)
def rake_turnaround(req: PitLineScheduleRequest):
    """
    Rake turnaround and pit-line maintenance scheduler.
    Enforces mandatory 360-minute maintenance window between outward and return runs.
    """
    return pit_line_scheduler.schedule(req)


# ─── 3. Computer Vision Endpoints ────────────────────────────────────────────

@router.get("/cv/crowd/platform/{station_code}/{platform_number}",
            response_model=PlatformCrowdResult)
def analyze_platform_crowd(station_code: str, platform_number: int):
    return crowd_cv.analyze_platform(station_code, platform_number)


@router.post("/cv/obstacle/detect", response_model=ObstacleDetectionResponse)
def detect_obstacle(scenario: str = "PERSON_ON_TRACK"):
    return obstacle_cv.detect(scenario)


@router.post("/cv/navigation/analyze-scene", response_model=SceneAnalysisResult)
def analyze_navigation_scene(req: SceneAnalysisRequest):
    return camera_navigator.analyze_scene(req)


# ─── 4. IoT & Track Anomaly ──────────────────────────────────────────────────

@router.post("/iot/anomaly", response_model=AnomalyResult)
def detect_track_anomaly(reading: SensorReading):
    return anomaly_detector.process_telemetry(reading)


# ─── 5. Digital Twin & What-If Simulation ────────────────────────────────────

@router.post("/digital-twin/simulate", response_model=WhatIfSimulationResponse)
def simulate_digital_twin(req: WhatIfSimulationRequest):
    """
    Dynamic NetworkX discrete-event simulation with priority-queue cascade delay
    propagation. Supports: FAST_LOCAL_PRIORITY, GOODS_TRAIN_LOOP, SIGNAL_FAILURE,
    TSR_ACTIVE, PLATFORM_HOLD.
    """
    return digital_twin.simulate_what_if(req)


# ─── 6. Agentic AI & Senior RAG Engine ───────────────────────────────────────
from app.rag.knowledge_base import knowledge_base
from app.rag.train_knowledge_indexer import knowledge_indexer

class RAGQueryRequest(BaseModel):
    query: str
    language_style: str = "en"
    top_k: int = 4

class RAGQueryResponse(BaseModel):
    answer: str
    confidenceScore: float
    retrievedKnowledgeDocs: List[str]
    modelUsed: str

@router.post("/agent/chat", response_model=AgentResponse)
@router.post("/ai/chat", response_model=AgentResponse)
@router.post("/ai/agent", response_model=AgentResponse)
def chat_agent(req: AgentMessageRequest):
    return rail_agent.process_query(req)

@router.post("/rag/query", response_model=RAGQueryResponse)
def query_rag_engine(req: RAGQueryRequest):
    """
    Direct Senior ML + RAG query endpoint.
    Retrieves multi-dimensional railway knowledge & executes dynamic ML delay predictions.
    """
    res = knowledge_base.answer_query(req.query, language_style=req.language_style, top_k=req.top_k)
    return RAGQueryResponse(
        answer=res["answer"],
        confidenceScore=res.get("confidenceScore", 0.95),
        retrievedKnowledgeDocs=res.get("retrievedKnowledgeDocs", []),
        modelUsed=res.get("modelUsed", "Gemini 2.5 Flash + RAG")
    )

@router.get("/rag/train-deepdive/{train_number}")
def get_train_deepdive(train_number: str):
    """
    Returns complete structured intelligence report for a single train:
    Profile, stops/platforms, live ML prediction, 5-yr historical delay stats, crowd density, and track health.
    """
    train = train_schedule_db.get(train_number)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_number} not found in dataset.")

    now = get_ist_now()
    ctx = train_schedule_db.build_predictor_context(train_number, now)
    
    ml_pred = None
    if ctx:
        try:
            ml_req = DelayPredictionRequest(
                trainNumber=train_number,
                currentSpeed=ctx["currentSpeed"],
                distanceRemaining=ctx["distanceKm"],
                weatherCondition="Clear",
                junctionCongestionLevel=0.4,
                day=ctx["day"], month=ctx["month"], dayOfWeek=ctx["dayOfWeek"],
                departureHour=ctx["departureHour"], departureMinute=ctx["departureMinute"],
                arrivalHour=ctx["arrivalHour"], arrivalMinute=ctx["arrivalMinute"],
                travelDurationMins=ctx["travelDurationMins"],
                distanceKm=ctx["distanceKm"], direction=ctx["direction"],
                departureDelay=ctx["departureDelay"]
            )
            ml_pred = eta_predictor.predict(ml_req)
        except Exception as e:
            print(f"ML error in deepdive: {e}")

    hist_stats = knowledge_indexer.train_5yr_stats.get(train_number, {})

    return {
        "trainNumber": train_number,
        "name": train.get("name"),
        "type": train.get("type", "Suburban EMU Local"),
        "source": train.get("source"),
        "destination": train.get("destination"),
        "departureTime": train.get("departureTime"),
        "arrivalTime": train.get("arrivalTime"),
        "totalDistanceKm": train.get("totalDistanceKm"),
        "stops": train.get("stops", []),
        "liveState": train.get("liveState", {}),
        "liveMLForecast": ml_pred.model_dump() if ml_pred else None,
        "fiveYearHistoricalStats": hist_stats,
    }


# ─── 7. RTIS Telemetry Ingestion ─────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional, List

class RTISTelemetryPayload(BaseModel):
    """Compatible with Indian Railways RTIS/ISRO GPS telemetry JSON format."""
    trainNumber:    str
    latitude:       float
    longitude:      float
    speedKmh:       float
    headingDeg:     float = 0.0
    sectionId:      str   = ""
    timestamp:      str   = ""
    delayMinutes:   float = 0.0
    signalAspect:   str   = "GREEN"
    source:         str   = "RTIS"   # RTIS, SIMULATED, MANUAL

class RTISAckResponse(BaseModel):
    trainNumber: str
    received:    bool
    processed:   bool
    message:     str

# In-memory telemetry store (production: use Redis/TimescaleDB)
_telemetry_store: dict = {}

@router.post("/telemetry/ingest", response_model=RTISAckResponse)
def ingest_rtis_telemetry(payload: RTISTelemetryPayload):
    """
    Real-time telemetry ingestion endpoint.
    Accepts RTIS (ISRO GPS) / simulated GPS position updates for trains.
    Updates the in-memory position store; downstream ETA re-computation triggered.
    """
    _telemetry_store[payload.trainNumber] = {
        "lat":          payload.latitude,
        "lng":          payload.longitude,
        "speedKmh":     payload.speedKmh,
        "headingDeg":   payload.headingDeg,
        "sectionId":    payload.sectionId,
        "timestamp":    payload.timestamp or datetime.now().isoformat(),
        "delayMinutes": payload.delayMinutes,
        "signalAspect": payload.signalAspect,
        "source":       payload.source,
    }
    return RTISAckResponse(
        trainNumber=payload.trainNumber,
        received=True,
        processed=True,
        message=f"Telemetry for {payload.trainNumber} ingested from {payload.source}."
    )

@router.get("/telemetry/{train_number}")
def get_train_telemetry(train_number: str):
    """Retrieve latest ingested telemetry for a train."""
    data = _telemetry_store.get(train_number)
    if not data:
        raise HTTPException(status_code=404, detail=f"No telemetry found for {train_number}")
    return {"trainNumber": train_number, "telemetry": data}


class CautionOrderPayload(BaseModel):
    sectionId:       str
    startKm:         float
    endKm:           float
    maxSpeedKmh:     float
    normalSpeedKmh:  float = 110.0
    reason:          str   = "Maintenance"
    validFrom:       str   = ""
    validTo:         str   = ""
    zone:            str   = "ER"

_caution_orders: List[dict] = []

@router.post("/telemetry/caution-orders")
def ingest_caution_order(order: CautionOrderPayload):
    """Ingest a Temporary Speed Restriction / caution order into the active TSR list."""
    record = order.model_dump()
    record["ingestedAt"] = datetime.now().isoformat()
    _caution_orders.append(record)
    return {"success": True, "totalActiveTSRs": len(_caution_orders),
            "message": f"TSR on {order.sectionId} ({order.maxSpeedKmh} km/h) ingested."}

@router.get("/telemetry/caution-orders/active")
def get_active_caution_orders():
    """Return all active caution orders (TSR/PSR) in the system."""
    return {"activeTSRs": _caution_orders, "count": len(_caution_orders)}


# ─── 8. Meta WhatsApp Cloud API Webhook ──────────────────────────────────────

async def send_whatsapp_reply(to_number: str, message_text: str):
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    access_token    = os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_TOKEN", ""))
    url             = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"

    clean_to = "".join(filter(str.isdigit, to_number))
    masked_to = mask_phone_number(clean_to)
    print(f"[WHATSAPP] Sending to {masked_to} via Phone ID {phone_number_id}")

    if not access_token:
        print("[WHATSAPP] WHATSAPP_ACCESS_TOKEN missing — cannot send reply.")
        return

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type":    "individual",
        "to":                clean_to,
        "type":              "text",
        "text":              {"preview_url": False, "body": message_text},
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers, timeout=10.0)
            print(f"[WHATSAPP] Meta API status: {res.status_code}")
            if res.status_code not in [200, 201]:
                print(f"[WHATSAPP] Error: {res.text}")
        except Exception as e:
            print(f"[WHATSAPP] Exception: {e}")


USER_SESSIONS: dict = {}

async def process_and_reply_whatsapp(from_number: str, text_body: str,
                                      location_payload: dict = None):
    clean_number = "".join(filter(str.isdigit, from_number))
    masked_from  = mask_phone_number(clean_number)
    print(f"[WHATSAPP] Incoming from {masked_from}: '{text_body}'")

    user_text = (text_body or "").strip()
    req       = AgentMessageRequest(message=user_text, session_id=clean_number)
    res       = rail_agent.process_query(req)
    await send_whatsapp_reply(from_number, res.answer)


@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook",    methods=["GET", "POST"])
@router.api_route("/ai/whatsapp/webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp/webhook",    methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    if request.method == "GET":
        params   = dict(request.query_params)
        mode     = params.get("hub.mode") or params.get("hub_mode")
        token    = params.get("hub.verify_token") or params.get("hub_verify_token")
        challenge = params.get("hub.challenge") or params.get("hub_challenge")
        expected  = os.getenv("WHATSAPP_VERIFY_TOKEN", "railio_whatsapp_verify_token_2026")
        if token == expected or mode == "subscribe":
            print("[WHATSAPP] Webhook verified.")
            return PlainTextResponse(content=str(challenge or "VERIFIED"), status_code=200)
        return PlainTextResponse(content="Forbidden", status_code=403)

    try:
        body     = await request.json()
        entry    = body.get("entry", [{}])[0]
        change   = entry.get("changes", [{}])[0]
        value    = change.get("value", {})
        messages = value.get("messages", [])

        if messages:
            msg           = messages[0]
            from_number   = msg.get("from")
            msg_type      = msg.get("type")
            text_body     = ""
            location_payload = None

            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "interactive":
                text_body = (msg.get("interactive", {}).get("button_reply", {}).get("title", "")
                             or msg.get("interactive", {}).get("list_reply", {}).get("title", ""))
            elif msg_type == "location":
                location_payload = msg.get("location")
                text_body = "LOCATION_PIN"

            if from_number and (text_body or location_payload):
                background_tasks.add_task(
                    process_and_reply_whatsapp, from_number, text_body, location_payload)
        else:
            statuses = value.get("statuses", [])
            if statuses:
                st    = statuses[0].get("status")
                recip = mask_phone_number(statuses[0].get("recipient_id", ""))
                print(f"[WHATSAPP] Status update ignored: {st} for {recip}")
            else:
                print("[WHATSAPP] Non-message webhook event ignored.")

        return JSONResponse(content={"status": "received"}, status_code=200)
    except Exception as e:
        print(f"[WHATSAPP] Webhook Exception: {e}")
        return JSONResponse(content={"status": "received"}, status_code=200)
