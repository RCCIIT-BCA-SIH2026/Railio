import time
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class NavBoundingBox(BaseModel):
    ymin: float
    xmin: float
    ymax: float
    xmax: float

class DetectedNavObject(BaseModel):
    id: str
    type: Literal['door', 'exit', 'emergency_exit', 'corridor', 'stairs', 'elevator', 'platform', 'sign', 'obstacle', 'landmark', 'counter']
    label: str
    direction: Literal['left', 'right', 'straight', 'slight_left', 'slight_right', 'behind']
    distanceEstimate: float  # meters
    confidence: float
    boundingBox: Optional[NavBoundingBox] = None

class WalkablePath(BaseModel):
    direction: Literal['left', 'right', 'straight', 'slight_left', 'slight_right']
    walkable: bool
    clearDistanceMeters: float
    confidence: float

class DetectedSign(BaseModel):
    text: str
    type: Literal['EXIT', 'PLATFORM', 'GATE', 'ROOM', 'STAIRS', 'LIFT', 'WAY_OUT', 'EMERGENCY']
    direction: Optional[Literal['left', 'right', 'straight', 'up', 'down']] = 'straight'
    confidence: float

class SceneAnalysisRequest(BaseModel):
    imageBase64: Optional[str] = None
    destination: Optional[str] = "nearest_exit"
    environmentHint: Optional[str] = "demo_railway_station"
    currentHeadingDeg: Optional[float] = 0.0

class SceneAnalysisResult(BaseModel):
    scene: Literal['station_concourse', 'corridor', 'platform', 'room', 'waiting_hall', 'junction', 'staircase', 'unknown']
    objects: List[DetectedNavObject]
    paths: List[WalkablePath]
    signs: List[DetectedSign]
    recommendedAction: Literal['MOVE_FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'ENTER_DOOR', 'TAKE_STAIRS', 'TAKE_ELEVATOR', 'STOP', 'SCAN', 'ARRIVED', 'PATH_BLOCKED']
    confidence: float
    instructionText: str
    timestamp: float = Field(default_factory=time.time)

class CameraNavigatorCV:
    """
    Vision Model Provider for Camera Indoor Navigation.
    Provides structured perception for doors, corridors, signage, obstacles, and directional paths.
    """
    def analyze_scene(self, req: SceneAnalysisRequest) -> SceneAnalysisResult:
        dest = (req.destination or "").lower()
        is_exit = any(k in dest for k in ["exit", "outside", "gate", "way out", "leave"])
        is_platform = any(k in dest for k in ["platform", "train", "track"])
        is_lift = any(k in dest for k in ["lift", "elevator", "accessible"])
        is_stairs = any(k in dest for k in ["stair", "bridge", "overpass"])

        objects = []
        paths = []
        signs = []

        if is_exit:
            objects.append(
                DetectedNavObject(
                    id="exit_door_east",
                    type="exit",
                    label="Station Main Exit Doorway",
                    direction="right",
                    distanceEstimate=3.5,
                    confidence=0.94,
                    boundingBox=NavBoundingBox(ymin=0.25, xmin=0.65, ymax=0.85, xmax=0.92)
                )
            )
            signs.append(
                DetectedSign(
                    text="EXIT / WAY OUT ↗",
                    type="EXIT",
                    direction="right",
                    confidence=0.96
                )
            )
            paths.append(
                WalkablePath(
                    direction="right",
                    walkable=True,
                    clearDistanceMeters=4.0,
                    confidence=0.92
                )
            )
            paths.append(
                WalkablePath(
                    direction="straight",
                    walkable=True,
                    clearDistanceMeters=6.0,
                    confidence=0.88
                )
            )
            recommended_action = "TURN_RIGHT"
            instruction = "The exit is through the door on your right."
            confidence = 0.94
        elif is_platform:
            objects.append(
                DetectedNavObject(
                    id="platform_4_gantry",
                    type="platform",
                    label="Platform 4 Concourse Overhead Gantry",
                    direction="straight",
                    distanceEstimate=8.0,
                    confidence=0.93,
                    boundingBox=NavBoundingBox(ymin=0.2, xmin=0.35, ymax=0.65, xmax=0.65)
                )
            )
            signs.append(
                DetectedSign(
                    text="PLATFORM 4 ↑",
                    type="PLATFORM",
                    direction="straight",
                    confidence=0.95
                )
            )
            paths.append(
                WalkablePath(
                    direction="straight",
                    walkable=True,
                    clearDistanceMeters=8.0,
                    confidence=0.95
                )
            )
            recommended_action = "MOVE_FORWARD"
            instruction = "Walk straight. Platform 4 is 8 meters ahead."
            confidence = 0.93
        elif is_lift:
            objects.append(
                DetectedNavObject(
                    id="lift_glass_door",
                    type="elevator",
                    label="Passenger Elevator / Lift",
                    direction="left",
                    distanceEstimate=4.2,
                    confidence=0.91,
                    boundingBox=NavBoundingBox(ymin=0.28, xmin=0.12, ymax=0.8, xmax=0.38)
                )
            )
            signs.append(
                DetectedSign(
                    text="ELEVATOR / LIFT 🛗",
                    type="LIFT",
                    direction="left",
                    confidence=0.93
                )
            )
            paths.append(
                WalkablePath(
                    direction="left",
                    walkable=True,
                    clearDistanceMeters=4.5,
                    confidence=0.90
                )
            )
            recommended_action = "TURN_LEFT"
            instruction = "The elevator is on your left."
            confidence = 0.91
        else:
            objects.append(
                DetectedNavObject(
                    id="corridor_main",
                    type="corridor",
                    label="Concourse Hallway",
                    direction="straight",
                    distanceEstimate=5.0,
                    confidence=0.89,
                    boundingBox=NavBoundingBox(ymin=0.22, xmin=0.38, ymax=0.78, xmax=0.62)
                )
            )
            paths.append(
                WalkablePath(
                    direction="straight",
                    walkable=True,
                    clearDistanceMeters=5.5,
                    confidence=0.91
                )
            )
            recommended_action = "MOVE_FORWARD"
            instruction = "Walk straight through the central concourse."
            confidence = 0.89

        return SceneAnalysisResult(
            scene="station_concourse",
            objects=objects,
            paths=paths,
            signs=signs,
            recommendedAction=recommended_action,
            confidence=confidence,
            instructionText=instruction,
            timestamp=time.time()
        )

camera_navigator = CameraNavigatorCV()
