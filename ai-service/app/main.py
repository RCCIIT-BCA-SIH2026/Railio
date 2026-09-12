import os
import sys
from dotenv import load_dotenv

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load .env for local development (no-op if not present on Render — Render injects env vars directly)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api.live_nav_ws import router as ws_router
from app.api.future_endpoints import router as future_router
from app.api.smart_services_endpoints import router as services_router

app = FastAPI(
    title="RailIo AI & ML Intelligence Microservice",
    description="ETA Delay Predictor (XGBoost/SHAP), Computer Vision, ESP32 IoT Anomaly Detection, Digital Twin (NetworkX), and 10-Tool RAG Agent",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount router with both root and /api prefix for full backward/forward compatibility
app.include_router(api_router)
app.include_router(api_router, prefix="/api")

# Mount websocket router with /ws prefix
app.include_router(ws_router, prefix="/ws")

# Mount future scope mock endpoints
app.include_router(future_router, prefix="/future")

# Mount smart in-train services
app.include_router(services_router, prefix="/services")

@app.get("/health")
def health():
    # Report env var presence — never expose actual secret values
    wa_token_set = bool(os.getenv("WHATSAPP_ACCESS_TOKEN") or os.getenv("META_WHATSAPP_TOKEN"))
    wa_phone_id_set = bool(os.getenv("WHATSAPP_PHONE_NUMBER_ID"))
    wa_verify_set = bool(os.getenv("WHATSAPP_VERIFY_TOKEN"))
    return {
        "status": "healthy",
        "service": "RailIo AI/ML Engine",
        "models": ["XGBoost Delay", "SHAP XAI", "NetworkX Digital Twin", "YOLO CV Simulator", "RAG Agent"],
        "whatsapp_env": {
            "WHATSAPP_ACCESS_TOKEN": "PRESENT" if wa_token_set else "MISSING",
            "WHATSAPP_PHONE_NUMBER_ID": "PRESENT" if wa_phone_id_set else "MISSING",
            "WHATSAPP_VERIFY_TOKEN": "PRESENT" if wa_verify_set else "MISSING",
        }
    }

@app.get("/")
def root():
    return {
        "message": "RailIo AI Microservice Running - Predict • Protect • Connect",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
