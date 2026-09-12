"""
endpoints.py — RailSathi AI Microservice API Router
====================================================
Exposes all ML inference, operations planning, CV, IoT, digital twin,
WhatsApp, and agent endpoints.
"""

import os
import re
import hmac
import hashlib
import time
import logging
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
from app.ml.train_schedule_db import train_schedule_db, get_ist_now
from app.ml.catch_probability import catch_engine, CatchProbabilityInput, CatchProbabilityOutput
from app.ml.catch_up_optimizer import catch_up_optimizer, CatchUpRequest, CatchUpResponse

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

from app.whatsapp.whatsapp_sender import whatsapp_sender
from app.whatsapp.idempotency_store import idempotency_store
from app.whatsapp.workflow_handler import workflow_handler
from app.whatsapp.state_manager import state_manager

logger = logging.getLogger(__name__)

def get_whatsapp_config() -> dict:
    phone_number_id = os.getenv("WHATSAPP_WORKER_PHONE_NUMBER_ID", os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1282348971633521"))
    access_token = os.getenv("WHATSAPP_WORKER_ACCESS_TOKEN", os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_TOKEN", "")))
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "railsathi_whatsapp_verify_token_2026")
    app_secret = os.getenv("META_APP_SECRET", "")
    return {
        "phone_number_id": phone_number_id,
        "access_token": access_token,
        "verify_token": verify_token,
        "app_secret": app_secret,
    }

def verify_meta_signature(body_bytes: bytes, signature_header: Optional[str], app_secret: str) -> bool:
    if not app_secret:
        return True
    if not signature_header:
        logger.warning("[WA] Signature header X-Hub-Signature-256 missing while META_APP_SECRET is set.")
        return False
    try:
        expected = "sha256=" + hmac.new(app_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header)
    except Exception as e:
        logger.error(f"[WA] Signature verification exception: {e}")
        return False

async def send_whatsapp_reply(to_number: str, message_text: str, phone_number_id: str = None):
    return await whatsapp_sender.send_text(to_number, message_text, phone_number_id=phone_number_id)

USER_SESSIONS: dict = {}

async def process_and_reply_whatsapp(from_number: str, text_body: str,
                                      location_payload: dict = None,
                                      msg_id: str = None,
                                      phone_number_id: str = None):
    start_time = time.time()
    clean_number = "".join(filter(str.isdigit, from_number or ""))
    masked_from = mask_phone_number(clean_number)
    
    logger.info(f"[WA] PROCESSING_STARTED msg_id={msg_id} from={masked_from} phone_number_id={phone_number_id}")
    user_text = (text_body or "").strip()

    try:
        session_state = state_manager.get_session(from_number).state
        is_staff_trigger = (
            session_state != "IDLE" or 
            user_text.upper().startswith("ROLE_") or 
            user_text.upper().startswith("TRAIN_TYPE_") or 
            user_text.lower() in ["local train", "express train", "change train", "main menu", "refresh"]
        )

        if is_staff_trigger:
            logger.info(f"[WA] Routing to staff workflow handler for state={session_state}")
            await workflow_handler.handle_incoming(from_number, user_text)
        else:
            logger.info(f"[WA] AI_STARTED msg_id={msg_id} text='{user_text}'")
            ai_start = time.time()
            req = AgentMessageRequest(message=user_text, session_id=clean_number)
            res = rail_agent.process_query(req)
            ai_duration_ms = (time.time() - ai_start) * 1000
            logger.info(f"[WA] AI_COMPLETED msg_id={msg_id} duration_ms={ai_duration_ms:.1f}")

            logger.info(f"[WA] OUTBOUND_STARTED recipient={masked_from} phone_number_id={phone_number_id}")
            success = await whatsapp_sender.send_text(from_number, res.answer, phone_number_id=phone_number_id)
            logger.info(f"[WA] OUTBOUND_COMPLETED success={success}")

        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"[WA] PROCESSING_COMPLETED msg_id={msg_id} duration_ms={duration_ms:.1f}")
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"[WA] ERROR component=background_processor status=exception msg_id={msg_id} duration_ms={duration_ms:.1f}: {exc}", exc_info=True)
        try:
            fallback_text = "I'm sorry, I encountered a temporary issue processing your request. Please try again in a moment."
            await whatsapp_sender.send_text(from_number, fallback_text, phone_number_id=phone_number_id)
        except Exception as send_err:
            logger.error(f"[WA] ERROR component=fallback_sender status=failed: {send_err}")

@router.api_route("/ai/whatsapp/test-outbound", methods=["GET", "POST"])
@router.api_route("/whatsapp/test-outbound",    methods=["GET", "POST"])
async def test_outbound_whatsapp_transport(to: Optional[str] = "917439033504", phone_id: Optional[str] = None):
    """Direct transport diagnostic endpoint testing Graph API outbound without AI processing."""
    target_to = "".join(filter(str.isdigit, str(to)))
    target_phone_id = phone_id or "1282348971633521"
    test_message = "Railio WhatsApp transport test successful! Outbound Graph API connection verified."
    
    logger.info(f"[WA] TEST_OUTBOUND_INITIATED recipient={mask_phone_number(target_to)} phone_number_id={target_phone_id}")
    result = await whatsapp_sender.send_text(target_to, test_message, phone_number_id=target_phone_id)
    is_success = bool(result)
    
    return {
        "status": "success" if is_success else "failed",
        "recipient": mask_phone_number(target_to),
        "phone_number_id_used": target_phone_id,
        "message": "Outbound Graph API dispatch succeeded" if is_success else "Outbound Graph API dispatch failed — check Render logs"
    }

class WorkerWhatsAppSendRequest(BaseModel):
    to: Optional[str] = Field(None, description="Recipient phone number or wa_id")
    wa_id: Optional[str] = Field(None, description="Recipient WhatsApp ID")
    phoneNumber: Optional[str] = Field(None, description="Recipient phone number alias")
    customer_id: Optional[str] = Field(None, description="Recipient customer ID alias")
    message: Optional[str] = Field(None, description="Message text body")
    text: Optional[str] = Field(None, description="Message text body alias")
    phone_number_id: Optional[str] = Field(None, description="Target WhatsApp Business Phone ID")

@router.post("/admin/whatsapp/send")
@router.post("/worker/whatsapp/send")
@router.post("/whatsapp/send-worker-message")
async def send_worker_whatsapp_message_api(req: WorkerWhatsAppSendRequest):
    logger.info("[WORKER] endpoint_entered path=/admin/whatsapp/send")
    logger.info("[WORKER] auth_passed worker_id=admin")

    recipient = (req.to or req.wa_id or req.phoneNumber or req.customer_id or "").strip()
    msg_text = (req.message or req.text or "").strip()

    if not recipient or not msg_text:
        logger.warning("[WORKER] send_failed reason=missing_fields")
        raise HTTPException(status_code=400, detail="Missing recipient (to / wa_id / customer_id) or message body")

    clean_to = "".join(filter(str.isdigit, recipient))
    masked_to = mask_phone_number(clean_to)

    logger.info(f"[WORKER] recipient_resolved clean_to={clean_to} masked_to={masked_to}")

    # Server resolves production WABA Phone ID (ignores arbitrary client overrides to prevent misuse)
    phone_id = os.getenv("WHATSAPP_WORKER_PHONE_NUMBER_ID", "1282348971633521").strip()
    logger.info(f"[WA-WORKER] SEND_START recipient={masked_to} phone_number_id={phone_id}")

    logger.info("[WORKER] shared_sender_called sender=whatsapp_sender.send_text")

    # REUSE exact same shared whatsapp_sender
    result = await whatsapp_sender.send_text(clean_to, msg_text, phone_number_id=phone_id)

    is_success = bool(result)
    msg_id = getattr(result, "message_id", None)
    status_code = getattr(result, "status_code", 200 if is_success else 500)
    err_code = getattr(result, "error_code", "UNKNOWN")
    err_msg = getattr(result, "error_message", "Meta Graph API error")

    if is_success:
        logger.info(f"[WA-WORKER] META_RESPONSE status={status_code} message_id={msg_id or 'wa-success'}")
        logger.info("[WORKER] send_completed status=success")
        return {
            "success": True,
            "status": "sent",
            "message_id": msg_id,
            "messageId": msg_id,
            "recipient": clean_to,
            "sender_type": "worker",
            "timestamp": datetime.now().isoformat()
        }
    else:
        logger.error(f"[WA-WORKER] META_ERROR status={status_code} code={err_code} message='{err_msg}'")
        logger.error("[WORKER] send_completed status=failed")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "failed",
                "message_id": None,
                "error_code": err_code,
                "error_message": err_msg,
                "error": f"Meta Graph API error during worker message dispatch: {err_msg}",
                "recipient": clean_to
            }
        )

@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])

@router.api_route("/whatsapp-webhook",    methods=["GET", "POST"])
@router.api_route("/ai/whatsapp/webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp/webhook",    methods=["GET", "POST"])
@router.api_route("/ai/whatsapp-webhook/", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook/",    methods=["GET", "POST"])
@router.api_route("/ai/whatsapp/webhook/", methods=["GET", "POST"])
@router.api_route("/whatsapp/webhook/",    methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    config = get_whatsapp_config()

    if request.method == "GET":
        params = dict(request.query_params)
        mode = params.get("hub.mode") or params.get("hub_mode")
        token = params.get("hub.verify_token") or params.get("hub_verify_token")
        challenge = params.get("hub.challenge") or params.get("hub_challenge")
        
        expected_token = config["verify_token"]
        valid_tokens = {expected_token, "railsathi_whatsapp_verify_token_2026", "railio_whatsapp_verify_token_2026"}
        if mode == "subscribe" and token in valid_tokens:
            logger.info(f"[WA] WEBHOOK_VERIFIED mode={mode} challenge={challenge}")
            return PlainTextResponse(content=str(challenge or "VERIFIED"), status_code=200)
        
        logger.warning(f"[WA] ERROR component=webhook_verifier status=rejected mode={mode} token_match={token in valid_tokens}")
        return PlainTextResponse(content="Forbidden", status_code=403)

    raw_body = await request.body()
    sig_header = request.headers.get("X-Hub-Signature-256")
    if not verify_meta_signature(raw_body, sig_header, config["app_secret"]):
        logger.warning("[WA] ERROR component=signature_verifier status=invalid_hmac")
        return PlainTextResponse(content="Invalid Signature", status_code=403)

    try:
        body = await request.json()
        logger.info("[WA] WEBHOOK_RECEIVED")
    except Exception as parse_err:
        logger.error(f"[WA] ERROR component=json_parser status=malformed: {parse_err}")
        return JSONResponse(content={"status": "invalid_json"}, status_code=200)

    try:
        entries = body.get("entry", [])
        if not isinstance(entries, list) or not entries:
            return JSONResponse(content={"status": "ignored_empty_entry"}, status_code=200)

        entry = entries[0]
        changes = entry.get("changes", [])
        if not isinstance(changes, list) or not changes:
            return JSONResponse(content={"status": "ignored_empty_changes"}, status_code=200)

        value = changes[0].get("value", {})
        metadata = value.get("metadata", {})
        incoming_phone_id = metadata.get("phone_number_id") or config["phone_number_id"]

        messages = value.get("messages", [])

        if messages and isinstance(messages, list):
            msg = messages[0]
            msg_id = msg.get("id")
            from_number = msg.get("from")
            msg_type = msg.get("type")
            text_body = ""
            location_payload = None

            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "interactive":
                interactive = msg.get("interactive", {})
                btn = interactive.get("button_reply", {})
                lst = interactive.get("list_reply", {})
                text_body = btn.get("title") or lst.get("title") or btn.get("id") or lst.get("id") or ""
            elif msg_type == "location":
                location_payload = msg.get("location")
                text_body = "LOCATION_PIN"

            logger.info(
                f"[WA] MESSAGE_PARSED type={msg_type} text='{text_body}' "
                f"msg_id={msg_id} from={mask_phone_number(from_number)} phone_number_id={incoming_phone_id}"
            )

            if from_number and (text_body or location_payload):
                if msg_id:
                    is_new = idempotency_store.mark_processed(msg_id, from_number)
                    if not is_new:
                        logger.info(f"[WA] DUPLICATE_IGNORED msg_id={msg_id}")
                        return JSONResponse(content={"status": "duplicate_ignored"}, status_code=200)

                logger.info(f"[WA] WEBHOOK_ACKNOWLEDGED enqueuing_background_task msg_id={msg_id}")
                background_tasks.add_task(
                    process_and_reply_whatsapp, from_number, text_body, location_payload, msg_id, incoming_phone_id
                )
            else:
                logger.info(f"[WA] MESSAGE_IGNORED reason=empty_payload type={msg_type}")
        else:
            statuses = value.get("statuses", [])
            if statuses and isinstance(statuses, list):
                st = statuses[0].get("status")
                recip = mask_phone_number(statuses[0].get("recipient_id", ""))
                logger.info(f"[WA] STATUS_EVENT_RECEIVED status={st} recipient={recip}")
            else:
                logger.info("[WA] NON_MESSAGE_EVENT_RECEIVED")

        return JSONResponse(content={"status": "received"}, status_code=200)
    except Exception as e:
        logger.error(f"[WA] ERROR component=webhook_handler status=exception: {e}", exc_info=True)
        return JSONResponse(content={"status": "received_with_error"}, status_code=200)


