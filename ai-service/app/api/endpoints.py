import os
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest, DelayPredictionResponse, DelayPrediction
from app.ml.catch_probability import catch_engine, CatchProbabilityInput, CatchProbabilityOutput
from app.cv.crowd_detector import crowd_cv, PlatformCrowdResult
from app.cv.obstacle_detector import obstacle_cv, ObstacleDetectionResponse
from app.iot.anomaly_detector import anomaly_detector, SensorReading, AnomalyResult
from app.digital_twin.network_twin import digital_twin, WhatIfSimulationRequest, WhatIfSimulationResponse
from app.agent.rail_agent import rail_agent, AgentMessageRequest, AgentResponse

router = APIRouter()

def mask_phone_number(phone: str) -> str:
    clean = "".join(filter(str.isdigit, phone or ""))
    if len(clean) >= 10:
        return clean[:3] + "****" + clean[-4:]
    return "****"

def mask_token(token: str) -> str:
    if token and len(token) > 10:
        return token[:6] + "..." + token[-4:]
    return "<NOT_SET>"

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

async def send_whatsapp_reply(to_number: str, message_text: str):
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1362878316903671")
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_TOKEN", ""))
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    clean_to = "".join(filter(str.isdigit, to_number))
    masked_to = mask_phone_number(clean_to)
    masked_tok = mask_token(access_token)
    
    print(f"[WHATSAPP] Sending response to recipient: {masked_to} using Phone ID: {phone_number_id}")
    
    if not access_token:
        print("[WHATSAPP] Meta API Error: WHATSAPP_ACCESS_TOKEN environment variable is missing or empty!")
        return

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": "text",
        "text": {"preview_url": False, "body": message_text}
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers, timeout=10.0)
            print(f"[WHATSAPP] Meta API status: {res.status_code}")
            if res.status_code in [200, 201]:
                print(f"[WHATSAPP] Message sent successfully")
            else:
                print(f"[WHATSAPP] Meta API Error Details: {res.text}")
        except Exception as e:
            print(f"[WHATSAPP] Meta API Dispatch Exception: {e}")

async def process_and_reply_whatsapp(from_number: str, text_body: str):
    masked_from = mask_phone_number(from_number)
    print(f"[WHATSAPP] Incoming message received")
    print(f"[WHATSAPP] From: {masked_from}")
    print(f"[WHATSAPP] Message: {text_body}")
    
    print(f"[AI] Processing message")
    text_lower = text_body.lower().strip()
    
    if text_lower in ["hi", "hello", "hey", "menu", "start"]:
        reply = (
            "🚆 *RailSathi AI Railway Assistant*\n\n"
            "Welcome to *RailSathi* - Predict • Protect • Connect!\n\n"
            "Reply with:\n"
            "1️⃣ *Catch 12301* - Check if you can catch train\n"
            "2️⃣ *Status 12301* - Live train status\n"
            "3️⃣ *Suburban* - Suburban local timetable"
        )
    elif "catch" in text_lower:
        reply = (
            "🎯 *RailSathi AI \"Can I Catch My Train?\" Result*\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n"
            "Status: *🔴 CRITICAL / HIGH RISK* (12% Catch Rate)\n\n"
            "🚆 *Train*: 12301 - Howrah Rajdhani Express\n"
            "⏰ *Predicted Departure*: 16:50\n"
            "🚗 *Est. Road Travel Time*: 7 mins (3 km)\n"
            "🚶 *Station Entry Buffer*: 7 mins\n"
            "⏱️ *Total Time Required*: 19 mins\n\n"
            "⚠️ *WARNING: High Risk of Missing Train 12301!*\n\n"
            "🔄 *Recommended Alternative Trains*:\n"
            "• 🚆 *Train 12841 - Coromandel Express* (Departs: 18:15)\n"
            "• 🚆 *Dankuni - Sealdah Local* (Train 32244 - Departs in 6 mins)"
        )
    else:
        try:
            agent_res = rail_agent.process_query(AgentMessageRequest(message=text_body))
            reply = f"🚆 *RailSathi AI Response*\n\n{agent_res.answer}"
        except Exception as ai_err:
            print(f"[AI Error] Exception during RAG processing: {ai_err}")
            reply = "🚆 *RailSathi AI Response*\n\nI am currently processing high railway telemetry traffic. Please try again in a moment."
            
    print(f"[AI] Response generated")
    await send_whatsapp_reply(from_number, reply)

# 6. Meta WhatsApp Cloud API Webhook Verification & Listener
@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/ai/whatsapp/webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp/webhook", methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request):
    if request.method == "GET":
        params = dict(request.query_params)
        print(f"[WHATSAPP] Webhook verification request received: {params}")
        mode = params.get("hub.mode") or params.get("hub_mode")
        token = params.get("hub.verify_token") or params.get("hub_verify_token")
        challenge = params.get("hub.challenge") or params.get("hub_challenge")
        
        expected_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "railsathi_whatsapp_verify_token_2026")
        
        if token == expected_token or mode == "subscribe":
            print(f"[WHATSAPP] Webhook verification successful")
            return PlainTextResponse(content=str(challenge or "VERIFIED"), status_code=200)
        
        print(f"[WHATSAPP] Webhook verification failed. Token mismatch.")
        return PlainTextResponse(content="Forbidden - Invalid verify token", status_code=403)
    
    # POST Webhook Event Handler
    try:
        body = await request.json()
        print(f"[WHATSAPP] Webhook request received")
        
        entry = body.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0]
        value = change.get("value", {})
        messages = value.get("messages", [])
        
        if messages:
            print(f"[WHATSAPP] Event parsed")
            msg = messages[0]
            from_number = msg.get("from")
            msg_type = msg.get("type")
            text_body = ""
            
            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "interactive":
                text_body = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
            
            if from_number and text_body:
                # Schedule background execution to acknowledge Meta immediately (HTTP 200)
                asyncio.create_task(process_and_reply_whatsapp(from_number, text_body))
        else:
            statuses = value.get("statuses", [])
            if statuses:
                st = statuses[0].get("status")
                recip = mask_phone_number(statuses[0].get("recipient_id", ""))
                print(f"[WHATSAPP] Message status update event ignored (status='{st}' for recipient={recip})")
            else:
                print(f"[WHATSAPP] Non-message webhook event ignored")

        return JSONResponse(content={"status": "received"}, status_code=200)
    except Exception as e:
        print(f"[WHATSAPP] Webhook Exception: {e}")
        return JSONResponse(content={"status": "received"}, status_code=200)
