from pydantic import BaseModel
from typing import List, Optional

class DetectedBoundingBox(BaseModel):
    label: str
    confidence: float
    box: List[float]  # [ymin, xmin, ymax, xmax] normalized 0.0 to 1.0
    riskLevel: str    # NORMAL, WARNING, HIGH_RISK, CRITICAL
    colorHex: str

class ObstacleDetectionResponse(BaseModel):
    obstacleDetected: bool
    primaryObject: str
    riskLevel: str
    confidenceScore: float
    trackSection: str
    distanceMeters: float
    boundingBoxes: List[DetectedBoundingBox]
    disclaimer: str = "Prototype obstacle detection — decision support only. Not certified railway safety equipment."

class ObstacleDetectorCV:
    def detect(self, scenario: Optional[str] = "PERSON_ON_TRACK") -> ObstacleDetectionResponse:
        scenarios = {
            "PERSON_ON_TRACK": ObstacleDetectionResponse(
                obstacleDetected=True,
                primaryObject="Person / Intruder",
                riskLevel="CRITICAL",
                confidenceScore=0.94,
                trackSection="Section B-17 (KM 64.2)",
                distanceMeters=120.0,
                boundingBoxes=[
                    DetectedBoundingBox(
                        label="Person on Track (Intrusion)",
                        confidence=0.94,
                        box=[0.35, 0.42, 0.78, 0.58],
                        riskLevel="CRITICAL",
                        colorHex="#DC2626"
                    )
                ]
            ),
            "CATTLE_OBSTACLE": ObstacleDetectionResponse(
                obstacleDetected=True,
                primaryObject="Cattle / Animal",
                riskLevel="HIGH_RISK",
                confidenceScore=0.91,
                trackSection="Section CNB-PRYJ-S1 (KM 148)",
                distanceMeters=240.0,
                boundingBoxes=[
                    DetectedBoundingBox(
                        label="Cattle Herd near Rail Gauge",
                        confidence=0.91,
                        box=[0.40, 0.30, 0.72, 0.65],
                        riskLevel="HIGH_RISK",
                        colorHex="#EA580C"
                    )
                ]
            ),
            "CLEAR_TRACK": ObstacleDetectionResponse(
                obstacleDetected=False,
                primaryObject="None (Clear Track)",
                riskLevel="NORMAL",
                confidenceScore=0.98,
                trackSection="Section ST-BRC-VB8 (KM 88)",
                distanceMeters=500.0,
                boundingBoxes=[
                    DetectedBoundingBox(
                        label="Track Gauge Clear",
                        confidence=0.98,
                        box=[0.20, 0.20, 0.90, 0.80],
                        riskLevel="NORMAL",
                        colorHex="#16A34A"
                    )
                ]
            )
        }

        return scenarios.get(scenario, scenarios["PERSON_ON_TRACK"])

obstacle_cv = ObstacleDetectorCV()
