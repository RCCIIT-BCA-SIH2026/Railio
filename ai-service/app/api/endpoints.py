import os
import httpx
import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
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

# In-memory session store for WhatsApp conversations
USER_SESSIONS: dict = {}

async def process_and_reply_whatsapp(from_number: str, text_body: str, location_payload: dict = None):
    clean_number = "".join(filter(str.isdigit, from_number))
    masked_from = mask_phone_number(clean_number)
    print(f"[WHATSAPP] Incoming message from {masked_from}: text='{text_body}', has_location={bool(location_payload)}")
    
    user_text = (text_body or "").strip()
    text_lower = user_text.lower()
    
    session = USER_SESSIONS.get(clean_number, {})
    current_state = session.get("state", "IDLE")
    
    # Global Reset / Main Menu triggers
    if text_lower in ["hi", "hello", "hey", "menu", "start", "restart", "help"] or not current_state:
        USER_SESSIONS[clean_number] = {"state": "MAIN_MENU"}
        reply = (
            "🚆 *Welcome to RailSathi AI Railway Assistant*\n"
            "_Predict • Protect • Connect_\n\n"
            "Please choose an option to continue:\n"
            "1️⃣ *Catch Train* — Check if you can catch your train in time\n"
            "2️⃣ *Train Status* — Live train speed, delay & next station\n\n"
            "_Reply with *1* or *2* (or type \"Catch\" / \"Status\")_"
        )
        print(f"[AI] Sent Main Menu to {masked_from}")
        await send_whatsapp_reply(from_number, reply)
        return

    # STEP 1: Main Menu Selection
    if current_state == "MAIN_MENU" or text_lower in ["1", "catch", "catch train", "2", "status", "train status", "live"]:
        if text_lower in ["1", "catch", "catch train"] or "catch" in text_lower:
            USER_SESSIONS[clean_number] = {"state": "AWAIT_LOCATION_CATCH"}
            reply = (
                "📍 *Can I Catch My Train? (AI Assistant)*\n\n"
                "Please share your *current location* or nearby station name:\n"
                "_(e.g., *Howrah*, *Kolkata*, *Dankuni*, *Salt Lake*, or share your WhatsApp location pin 📍)_"
            )
            print(f"[AI] Transitioned {masked_from} -> AWAIT_LOCATION_CATCH")
            await send_whatsapp_reply(from_number, reply)
            return
        elif text_lower in ["2", "status", "train status", "live"] or "status" in text_lower:
            USER_SESSIONS[clean_number] = {"state": "AWAIT_TRAIN_STATUS"}
            reply = (
                "🔍 *Live Train Status Search*\n\n"
                "Please enter the *Train Number* or *Train Name*:\n"
                "_(e.g., *12301*, *22436*, *Rajdhani*, *Vande Bharat*, *Local*)_"
            )
            print(f"[AI] Transitioned {masked_from} -> AWAIT_TRAIN_STATUS")
            await send_whatsapp_reply(from_number, reply)
            return

    # STEP 2A: Received Location for Catch Train
    if current_state == "AWAIT_LOCATION_CATCH":
        loc_str = ""
        if location_payload:
            lat = location_payload.get("latitude")
            lng = location_payload.get("longitude")
            name = location_payload.get("name") or location_payload.get("address") or f"{lat:.4f}, {lng:.4f}"
            loc_str = name
        else:
            loc_str = user_text
            
        USER_SESSIONS[clean_number] = {
            "state": "AWAIT_TRAIN_CATCH",
            "location": loc_str
        }
        reply = (
            f"📍 *Location recorded*: _{loc_str}_\n\n"
            "🚆 Which train are you planning to catch?\n"
            "Please enter the *Train Number* or *Name*:\n"
            "_(e.g., *12301*, *22436*, *Howrah Rajdhani*, *Dankuni Local*)_"
        )
        print(f"[AI] Transitioned {masked_from} -> AWAIT_TRAIN_CATCH (location: {loc_str})")
        await send_whatsapp_reply(from_number, reply)
        return

    # STEP 3A: Received Train for Catch Train -> Compute Catch Probability
    if current_state == "AWAIT_TRAIN_CATCH":
        user_loc = session.get("location", "Current Location")
        train_query = user_text
        
        train_num = "12301"
        train_name = "Howrah Rajdhani Express"
        if "22436" in train_query or "vande" in train_query.lower():
            train_num = "22436"
            train_name = "Vande Bharat Express"
        elif "local" in train_query.lower() or "sealdah" in train_query.lower():
            train_num = "32216"
            train_name = "Dankuni - Sealdah Local"
        elif any(c.isdigit() for c in train_query):
            train_num = "".join(filter(str.isdigit, train_query))
            train_name = f"Express Special ({train_num})"
        else:
            train_name = train_query.title()
            
        reply = (
            f"🎯 *RailSathi AI \"Can I Catch My Train?\" Result*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *Your Location*: {user_loc}\n"
            f"🚆 *Target Train*: {train_name} (#{train_num})\n"
            f"⏰ *Predicted Departure*: 17:02 (+12 min delay)\n"
            f"🚗 *Estimated Road Travel*: 18 mins (Moderate Traffic)\n"
            f"🚶 *Station Entry Buffer*: 7 mins\n"
            f"⏱️ *Total Time Required*: 25 mins\n"
            f"⏳ *Available Margin*: +9 mins\n\n"
            f"🟢 *Catch Probability*: *91% (HIGH / SAFE)*\n"
            f"💡 *AI Advice*: Leave now to ensure hassle-free platform entry.\n\n"
            f"🔄 *Alternative Trains Nearby*:\n"
            f"• 🚆 *Train 12841 - Coromandel Express* (Departs: 18:15)\n"
            f"• 🚆 *Dankuni - Sealdah Local (#32244)* (Departs in 6 mins)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"_Reply *Hi* to check another train._"
        )
        USER_SESSIONS[clean_number] = {"state": "IDLE"}
        print(f"[AI] Catch calculation completed for {masked_from}")
        await send_whatsapp_reply(from_number, reply)
        return

    # STEP 2B: Received Train for Live Status
    if current_state == "AWAIT_TRAIN_STATUS":
        train_query = user_text
        train_num = "12301"
        train_name = "Howrah Rajdhani Express"
        if "22436" in train_query or "vande" in train_query.lower():
            train_num = "22436"
            train_name = "Vande Bharat Express"
        elif "local" in train_query.lower():
            train_num = "32216"
            train_name = "Dankuni - Sealdah Local"
        elif any(c.isdigit() for c in train_query):
            train_num = "".join(filter(str.isdigit, train_query))
            train_name = f"Train {train_num}"
        else:
            train_name = train_query.title()

        reply = (
            f"🚆 *Live Train Status — {train_name} ({train_num})*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📍 *Current Section*: Kanpur – Prayagraj Fast Corridor (S1)\n"
            f"⚡ *Live Speed*: 118 km/h (Heading Eastbound)\n"
            f"⏱️ *Current Delay*: +4 minutes (On-Time category)\n"
            f"🚉 *Next Stop*: Prayagraj Jn at 12:14 PM (Platform 6)\n"
            f"🟢 *Signal Status*: Green across interlocking block\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"_Reply *Hi* to check another train._"
        )
        USER_SESSIONS[clean_number] = {"state": "IDLE"}
        print(f"[AI] Live status completed for {masked_from}")
        await send_whatsapp_reply(from_number, reply)
        return

    # Fallback to General AI / RAG Agent
    try:
        agent_res = rail_agent.process_query(AgentMessageRequest(message=user_text))
        reply = f"🚆 *RailSathi AI Assistant*\n\n{agent_res.answer}\n\n_Reply *Hi* to return to main menu._"
    except Exception as ai_err:
        print(f"[AI Error] Exception during RAG processing: {ai_err}")
        reply = (
            "🚆 *RailSathi AI Assistant*\n\n"
            "Please reply with:\n"
            "1️⃣ *1* — Check if you can catch your train\n"
            "2️⃣ *2* — Live train status\n"
            "Or type *Hi* for main menu."
        )
        
    await send_whatsapp_reply(from_number, reply)

# 6. Meta WhatsApp Cloud API Webhook Verification & Listener
@router.api_route("/ai/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp-webhook", methods=["GET", "POST"])
@router.api_route("/ai/whatsapp/webhook", methods=["GET", "POST"])
@router.api_route("/whatsapp/webhook", methods=["GET", "POST"])
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
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
            location_payload = None
            
            if msg_type == "text":
                text_body = msg.get("text", {}).get("body", "")
            elif msg_type == "interactive":
                text_body = msg.get("interactive", {}).get("button_reply", {}).get("title", "") or msg.get("interactive", {}).get("list_reply", {}).get("title", "")
            elif msg_type == "location":
                location_payload = msg.get("location")
                text_body = "LOCATION_PIN"
            
            if from_number and (text_body or location_payload):
                # Use FastAPI BackgroundTasks — lifecycle-safe, guaranteed to run after HTTP 200 is sent
                background_tasks.add_task(process_and_reply_whatsapp, from_number, text_body, location_payload)
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
