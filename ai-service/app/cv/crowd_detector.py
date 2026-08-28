from pydantic import BaseModel
from typing import List, Dict, Any

class PlatformCrowdResult(BaseModel):
    stationCode: str
    platformNumber: int
    detectedPersons: int
    densityPercentage: int
    crowdLevel: str  # LOW, MODERATE, HIGH, CRITICAL
    colorBadge: str  # GREEN, YELLOW, ORANGE, RED
    recommendation: str

class CoachCrowdResult(BaseModel):
    trainNumber: str
    coaches: List[Dict[str, Any]]
    recommendedCoach: str
    reason: str

class CrowdDetectorCV:
    def analyze_platform(self, station_code: str, platform_number: int) -> PlatformCrowdResult:
        crowd_map = {
            "HWH": {1: (142, 91, "CRITICAL", "RED"), 2: (84, 54, "MODERATE", "YELLOW"), 3: (32, 21, "LOW", "GREEN")},
            "NDLS": {1: (118, 78, "HIGH", "ORANGE"), 5: (92, 62, "MODERATE", "YELLOW"), 10: (68, 45, "MODERATE", "YELLOW")},
            "MMCT": {1: (64, 42, "MODERATE", "YELLOW"), 5: (102, 68, "HIGH", "ORANGE")}
        }
        
        station_data = crowd_map.get(station_code.upper(), {platform_number: (75, 50, "MODERATE", "YELLOW")})
        count, pct, level, badge = station_data.get(platform_number, (55, 38, "LOW", "GREEN"))

        rec = "Platform capacity normal."
        if pct > 80:
            rec = "High passenger density detected near entry foot-over-bridge. Divert to middle coach marker."
        elif pct > 50:
            rec = "Moderate crowd. Boarding queues active."

        return PlatformCrowdResult(
            stationCode=station_code.upper(),
            platformNumber=platform_number,
            detectedPersons=count,
            densityPercentage=pct,
            crowdLevel=level,
            colorBadge=badge,
            recommendation=rec
        )

crowd_cv = CrowdDetectorCV()
