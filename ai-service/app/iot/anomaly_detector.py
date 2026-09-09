import numpy as np
from pydantic import BaseModel
from typing import List, Dict, Any

class SensorReading(BaseModel):
    accelX: float
    accelY: float
    accelZ: float
    gyroX: float = 0.0
    gyroY: float = 0.0
    gyroZ: float = 0.0
    sectionId: str = "SDAH-BNXR-SUB1"
    trainNumber: str = "32211"

class AnomalyResult(BaseModel):
    isAnomaly: bool
    vibrationRms: float
    severity: str  # NORMAL, WARNING, HIGH_RISK, CRITICAL
    confidenceScore: float
    sectionId: str
    riskScore: int  # 0 to 100
    maintenancePriority: str  # LOW, MEDIUM, HIGH, IMMEDIATE
    diagnosis: str
    progressiveTrend: str  # STABLE, INCREASING, DECREASING
    disclaimer: str = "Prototype track anomaly detection — decision support only. Not certified railway safety equipment."

class TrackAnomalyDetector:
    def __init__(self):
        self.normal_rms_threshold = 2.2
        self.warning_threshold = 2.8
        self.critical_threshold = 3.3

    def process_telemetry(self, data: SensorReading) -> AnomalyResult:
        # RMS of 3-axis acceleration
        accel_mag = np.sqrt(data.accelX**2 + data.accelY**2 + data.accelZ**2)
        rms = float(np.round(accel_mag, 2))

        if rms >= self.critical_threshold:
            severity = "CRITICAL"
            is_anomaly = True
            risk_score = 88
            priority = "IMMEDIATE"
            diag = "High amplitude lateral/vertical shock indicative of severe rail joint gap or ballast void."
            trend = "INCREASING"
        elif rms >= self.warning_threshold:
            severity = "HIGH_RISK"
            is_anomaly = True
            risk_score = 78
            priority = "HIGH"
            diag = "Progressive track surface corrugation & sleeper displacement detected."
            trend = "INCREASING"
        elif rms >= self.normal_rms_threshold:
            severity = "WARNING"
            is_anomaly = True
            risk_score = 52
            priority = "MEDIUM"
            diag = "Minor vibration harmonic overshoot; schedule routine ultrasonic testing."
            trend = "STABLE"
        else:
            severity = "NORMAL"
            is_anomaly = False
            risk_score = 16
            priority = "LOW"
            diag = "Track geometry and rail weld integrity within permissible limits."
            trend = "STABLE"

        return AnomalyResult(
            isAnomaly=is_anomaly,
            vibrationRms=rms,
            severity=severity,
            confidenceScore=0.92,
            sectionId=data.sectionId,
            riskScore=risk_score,
            maintenancePriority=priority,
            diagnosis=diag,
            progressiveTrend=trend
        )

anomaly_detector = TrackAnomalyDetector()
