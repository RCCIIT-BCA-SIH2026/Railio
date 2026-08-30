import os
import httpx
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

async def send_whatsapp_reply(to_number: str, message_text: str):
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1362878316903671")
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "EAATDntivkZCkBSbAShiuItsjlIQknZAy95SXfeY6MhYkY9lG3Yy58plMZCPNMmGG7M6ZClqVwfyZBMYzTXxNToEhYjhfMLU916v2G0kChH2dWqIF4zPB9PccaubMOwePqxmRku0HZBc6ZC1OwET5xCT6MwVVwZCIBJvwTXDJ1C4Hu3SifgJQGbjaOkJED6QqsXxuyK35roJgFxrh7VW8zLFTGcbUzpF9jlsqbiWvEZC5VmVOtNyPTk4Dz3koh946QHIzos0nbXz9w22GVUTDeIY3TEvl6")
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    clean_to = "".join(filter(str.isdigit, to_number))
    
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
            res = await client.post(url, json=payload, headers=headers, timeout=8.0)
            print(f"[WhatsApp Dispatch] Status: {res.status_code}, Response: {res.text}")
        except Exception as e:
            print(f"[WhatsApp Dispatch Error] {e}")

# 6. Meta WhatsApp Cloud API Webhook Verification & Listener
@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook", methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request):
    if request.method == "GET":
        params = dict(request.query_params)
        mode = params.get("hub.mode") or params.get("hub_mode")
        token = params.get("hub.verify_token") or params.get("hub_verify_token")
        challenge = params.get("hub.challenge") or params.get("hub_challenge")
        
        expected_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "railsathi_whatsapp_verify_token_2026")
        
        if token == expected_token or mode == "subscribe":
            return PlainTextResponse(content=str(challenge or "VERIFIED"), status_code=200)
        
        return PlainTextResponse(content="Forbidden - Invalid verify token", status_code=403)
    
    # POST Webhook Event Handler
    try:
        body = await request.json()
        entry = body.get("entry", [{}])[0]
        change = entry.get("changes", [{}])[0]
        value = change.get("value", {})
        messages = value.get("messages", [])
        
        if messages:
            msg = messages[0]
            from_number = msg.get("from")
            msg_type = msg.get("type")
            text_body = ""
            
            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "interactive":
                text_body = msg.get("interactive", {}).get("button_reply", {}).get("title", "")
            
            if from_number:
                if text_body.lower().strip() in ["hi", "hello", "hey", "menu", "start"]:
                    reply = (
                        "🚆 *RailSathi AI Railway Assistant*\n\n"
                        "Welcome to *RailSathi* - Predict • Protect • Connect!\n\n"
                        "Reply with:\n"
                        "1️⃣ *Catch 12301* - Check if you can catch train\n"
                        "2️⃣ *Status 12301* - Live train status\n"
                        "3️⃣ *Suburban* - Suburban local timetable"
                    )

                elif "catch" in text_body.lower():
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
                    agent_res = rail_agent.process_query(AgentMessageRequest(message=text_body))
                    reply = f"🚆 *RailSathi AI Response*\n\n{agent_res.answer}"
                
                await send_whatsapp_reply(from_number, reply)

        return JSONResponse(content={"status": "received"}, status_code=200)
    except Exception as e:
        print(f"[Webhook Error]: {e}")
        return JSONResponse(content={"status": "received"}, status_code=200)
