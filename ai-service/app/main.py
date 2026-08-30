from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

app = FastAPI(
    title="RailSathi AI & ML Intelligence Microservice",
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

app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "RailSathi AI/ML Engine",
        "models": ["XGBoost Delay", "SHAP XAI", "NetworkX Digital Twin", "YOLO CV Simulator", "RAG Agent"]
    }

@app.get("/")
def root():
    return {
        "message": "RailSathi AI Microservice Running - Predict • Protect • Connect",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
