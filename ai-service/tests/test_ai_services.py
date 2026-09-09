import sys
import os

# Set standard UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.ml.eta_delay_predictor import ETADelayPredictor, DelayPredictionRequest
from app.ml.catch_probability import CatchProbabilityEngine, CatchProbabilityInput
from app.iot.anomaly_detector import TrackAnomalyDetector, SensorReading
from app.digital_twin.network_twin import RailwayDigitalTwin, WhatIfSimulationRequest
from app.agent.rail_agent import RailIoAgent, AgentMessageRequest

def test_eta_delay_predictor():
    predictor = ETADelayPredictor()
    req = DelayPredictionRequest(
        trainNumber="12301",
        currentSpeed=88.0,
        distanceRemaining=140.0,
        dwellTime=4.0,
        weatherCondition="Heavy Rain",
        junctionCongestionLevel=0.8
    )
    result = predictor.predict(req)
    assert result.predictedDelayMinutes >= 0
    assert result.confidenceScore > 0
    assert len(result.explainability) > 0
    print("[PASS] ETA Delay Predictor & SHAP Explainability PASSED")

def test_catch_probability_engine():
    engine = CatchProbabilityEngine()
    req = CatchProbabilityInput(
        trainNumber="12301",
        roadDistanceKm=12.0,
        trafficCondition="MODERATE",
        stationEntryBufferMin=7.0
    )
    res = engine.calculate(req)
    assert 0 <= res.catchProbabilityPct <= 100
    assert len(res.recommendation) > 0
    print("[PASS] Catch Probability Engine (Hero Feature) PASSED")

def test_iot_vibration_anomaly():
    detector = TrackAnomalyDetector()
    reading = SensorReading(
        accelX=0.45, accelY=0.32, accelZ=3.10, gyroX=12.0, gyroY=8.5, gyroZ=5.2
    )
    res = detector.process_telemetry(reading)
    assert res.vibrationRms > 0
    assert res.isAnomaly == True
    assert res.riskScore > 0
    print("[PASS] IoT ESP32 MPU6050 Vibration Anomaly Detector PASSED")

def test_digital_twin_precedence():
    twin = RailwayDigitalTwin()
    req = WhatIfSimulationRequest(scenario="FAST_LOCAL_PRIORITY", trainNumber="32211")
    res = twin.simulate_what_if(req)
    assert res.scenario == "FAST_LOCAL_PRIORITY"
    assert res.netNetworkDelayChangeMin is not None
    assert len(res.trainImpacts) > 0
    print("[PASS] NetworkX Digital Twin & What-If Precedence Simulator PASSED")

def test_agent_tool_routing():
    agent = RailIoAgent()
    req = AgentMessageRequest(message="Can I catch my train 12301?")
    res = agent.process_query(req)
    assert len(res.answer) > 0
    assert len(res.toolsExecuted) > 0
    print("[PASS] 10-Tool Agentic AI Router PASSED")

if __name__ == "__main__":
    print("====================================================")
    print("Running RailIo AI/ML Unit & Integration Tests")
    print("====================================================")
    test_eta_delay_predictor()
    test_catch_probability_engine()
    test_iot_vibration_anomaly()
    test_digital_twin_precedence()
    test_agent_tool_routing()
    print("====================================================")
    print("ALL 5 AI/ML MODULE TESTS PASSED WITH 100% SUCCESS!")
    print("====================================================")
