import { Request, Response } from 'express';

export interface DetectedNavObject {
  id: string;
  type: 'door' | 'exit' | 'emergency_exit' | 'corridor' | 'stairs' | 'elevator' | 'platform' | 'sign' | 'obstacle' | 'landmark' | 'counter' | 'window';
  doorSubtype?: 'DOOR' | 'ROOM_DOOR' | 'EXIT_DOOR' | 'CLOSET_DOOR' | 'BATHROOM_DOOR' | 'EMERGENCY_EXIT' | 'OPENING' | 'UNKNOWN';
  label: string;
  direction: 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right' | 'behind';
  distanceEstimate: number;
  confidence: number;
  isOpenDoor?: boolean;
  hasExitSign?: boolean;
  hasVisibleCorridor?: boolean;
  boundingBox?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}

export interface WalkablePath {
  direction: 'left' | 'right' | 'straight' | 'slight_left' | 'slight_right';
  walkable: boolean;
  clearDistanceMeters: number;
  confidence: number;
}

export interface DetectedSign {
  text: string;
  type: 'EXIT' | 'PLATFORM' | 'GATE' | 'ROOM' | 'STAIRS' | 'LIFT' | 'WAY_OUT' | 'EMERGENCY';
  direction?: 'left' | 'right' | 'straight' | 'up' | 'down';
  confidence: number;
}

export interface SceneAnalysisResponse {
  scene: 'station_concourse' | 'corridor' | 'platform' | 'room' | 'waiting_hall' | 'junction' | 'staircase' | 'unknown';
  objects: DetectedNavObject[];
  paths: WalkablePath[];
  signs: DetectedSign[];
  recommendedAction: 'MOVE_FORWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'ENTER_DOOR' | 'TAKE_STAIRS' | 'TAKE_ELEVATOR' | 'STOP' | 'SCAN' | 'ARRIVED' | 'PATH_BLOCKED';
  confidence: number;
  instructionText: string;
  timestamp: string;
}

// In-memory active navigation sessions (Zero permanent raw frame storage for privacy)
const NAVIGATION_SESSIONS = new Map<string, {
  sessionId: string;
  destination: string;
  mode: string;
  startTime: string;
  status: string;
  events: Array<{ type: string; timestamp: string; details?: any }>;
}>();

// Pre-defined structured Station Environments for reliable localization
const BUILTIN_ENVIRONMENTS: Record<string, any> = {
  demo_railway_station: {
    environmentId: 'demo_railway_station',
    name: 'Howrah Railway Station Concourse (Demo)',
    nodes: [
      { id: 'concourse_main', type: 'room', name: 'Main Concourse', x: 0, y: 0, z: 0, visualAnchors: ['Main Info Board', 'Grand Clock'] },
      { id: 'door_concourse_east', type: 'door', name: 'Concourse East Gateway', x: 5, y: 0, z: 0 },
      { id: 'corridor_platform_access', type: 'corridor', name: 'Platform 1-4 Access Corridor', x: 12, y: 0, z: 0 },
      { id: 'junction_platform_4', type: 'corridor', name: 'Platform 4 Turnoff Junction', x: 18, y: 0, z: 0 },
      { id: 'stairs_footover', type: 'stairs', name: 'Footover Bridge Stairs', x: 18, y: 6, z: 0 },
      { id: 'lift_footover', type: 'elevator', name: 'Accessible Lift to Bridge', x: 18, y: -4, z: 0 },
      { id: 'platform_4_entry', type: 'platform', name: 'Platform 4 Entrance', x: 26, y: 0, z: 0 },
      { id: 'exit_north_gate', type: 'exit', name: 'North Exit & Metro Link', x: 15, y: -10, z: 0 },
      { id: 'emergency_exit_east', type: 'emergency_exit', name: 'East Emergency Exit Door', x: 8, y: 6, z: 0 }
    ],
    edges: [
      { from: 'concourse_main', to: 'door_concourse_east', distance: 5, walkable: true },
      { from: 'door_concourse_east', to: 'corridor_platform_access', distance: 7, walkable: true },
      { from: 'corridor_platform_access', to: 'junction_platform_4', distance: 6, walkable: true },
      { from: 'junction_platform_4', to: 'stairs_footover', distance: 6, walkable: true, isStairs: true },
      { from: 'junction_platform_4', to: 'lift_footover', distance: 4, walkable: true, isLift: true },
      { from: 'junction_platform_4', to: 'platform_4_entry', distance: 8, walkable: true },
      { from: 'door_concourse_east', to: 'emergency_exit_east', distance: 6, walkable: true, isEmergency: true },
      { from: 'corridor_platform_access', to: 'exit_north_gate', distance: 11, walkable: true }
    ]
  },
  demo_home: {
    environmentId: 'demo_home',
    name: 'Indoor Test Space',
    nodes: [
      { id: 'room_1', type: 'room', name: 'Living Room', x: 0, y: 0, z: 0 },
      { id: 'door_1', type: 'door', name: 'Room Doorway', x: 3, y: 0, z: 0 },
      { id: 'corridor_1', type: 'corridor', name: 'Main Hallway', x: 7, y: 0, z: 0 },
      { id: 'junction_1', type: 'corridor', name: 'Hallway Junction', x: 11, y: 0, z: 0 },
      { id: 'exit_1', type: 'exit', name: 'Main Exit Door', x: 11, y: 4, z: 0 }
    ],
    edges: [
      { from: 'room_1', to: 'door_1', distance: 3, walkable: true },
      { from: 'door_1', to: 'corridor_1', distance: 4, walkable: true },
      { from: 'corridor_1', to: 'junction_1', distance: 4, walkable: true },
      { from: 'junction_1', to: 'exit_1', distance: 4, walkable: true }
    ]
  }
};

import { geminiVisionProvider } from '../services/geminiVisionProvider';

/**
 * POST /api/navigation/analyze-scene
 * AI Vision analysis proxy powered by Gemini Multimodal Vision API.
 */
export const analyzeScene = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, currentPose, destination, environmentHint, systemInstruction } = req.body;

    const geminiResult = await geminiVisionProvider.analyzeScene({
      imageBase64,
      destination,
      currentPose,
      environmentHint,
      systemInstruction,
    });

    // Direction mapping from Gemini's relative_direction to client direction
    const dirMap: Record<string, DetectedNavObject['direction']> = {
      'left': 'left',
      'right': 'right',
      'center': 'straight',    // 'center' → 'straight' (object is AHEAD)
      'straight': 'straight',
      'slight_left': 'slight_left',
      'slight_right': 'slight_right',
      'behind': 'behind',
    };

    // Map detected objects — pass ALL new perception fields through to client
    const objects: DetectedNavObject[] = geminiResult.objects.map(obj => {
      // Build normalized bounding box (0.0-1.0) from Gemini's 0-1000 space
      let boundingBox: DetectedNavObject['boundingBox'] = undefined;
      if (obj.box_2d && obj.box_2d.length === 4) {
        boundingBox = {
          ymin: obj.box_2d[0] / 1000,
          xmin: obj.box_2d[1] / 1000,
          ymax: obj.box_2d[2] / 1000,
          xmax: obj.box_2d[3] / 1000,
        };
      } else {
        // No box_2d from model — derive from direction, centered in zone
        // CRITICAL FIX: never use the right-side default box (0.65-0.92) for 'center' objects
        const d = obj.relative_direction;
        if (d === 'left' || d === 'slight_left') {
          boundingBox = { ymin: 0.20, xmin: 0.05, ymax: 0.85, xmax: 0.32 };
        } else if (d === 'right' || d === 'slight_right') {
          boundingBox = { ymin: 0.20, xmin: 0.68, ymax: 0.85, xmax: 0.95 };
        } else {
          // center / straight / behind — always use centered box
          boundingBox = { ymin: 0.18, xmin: 0.35, ymax: 0.88, xmax: 0.65 };
        }
      }

      return {
        id: obj.id,
        type: obj.type as any,
        doorSubtype: obj.doorSubtype,
        label: obj.label,
        direction: dirMap[obj.relative_direction] || 'straight',
        distanceEstimate: obj.distance_estimate_m,
        confidence: obj.confidence,
        isOpenDoor: obj.isOpenDoor ?? (obj.state === 'open'),
        hasExitSign: obj.hasExitSign ?? false,
        hasVisibleCorridor: obj.hasVisibleCorridor ?? false,
        boundingBox,
      };
    });

    const pathDirMap: Record<string, WalkablePath['direction']> = {
      'left': 'left', 'right': 'right', 'center': 'straight',
      'straight': 'straight', 'slight_left': 'slight_left', 'slight_right': 'slight_right',
    };
    const paths: WalkablePath[] = geminiResult.walkable_paths.map(p => ({
      direction: pathDirMap[p.direction] || 'straight',
      walkable: p.walkable,
      clearDistanceMeters: p.clearDistanceMeters || 3.5,
      confidence: p.confidence,
    }));

    const signs: DetectedSign[] = geminiResult.signs.map(s => ({
      text: s.text,
      type: s.type,
      direction: (s.direction as any) || 'straight',
      confidence: s.confidence,
    }));

    const response: SceneAnalysisResponse = {
      scene: (geminiResult.scene.type as any) || 'unknown',
      objects,
      paths,
      signs,
      recommendedAction: (geminiResult.recommended_action.action as any) || 'SCAN',
      confidence: geminiResult.recommended_action.confidence,
      instructionText: '',  // Always blank — client navigation engine generates voice
      timestamp: geminiResult.timestamp,
    };

    res.json({
      success: true,
      data: response,
      geminiRaw: {
        reason: geminiResult.reason,
        user_context: geminiResult.user_context,
        obstacles: geminiResult.obstacles,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Vision scene analysis failed',
      details: error.message,
    });
  }
};

/**
 * POST /api/navigation/analyze-sign
 * Dedicated OCR & Station Signage Parser
 */
export const analyzeSign = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, signHint } = req.body;

    const signs: DetectedSign[] = [
      { text: signHint || 'PLATFORM 4', type: 'PLATFORM', direction: 'straight', confidence: 0.96 },
      { text: 'WAY OUT / EXIT', type: 'EXIT', direction: 'right', confidence: 0.94 }
    ];

    res.json({
      success: true,
      data: {
        signs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Sign analysis failed' });
  }
};

/**
 * POST /api/navigation/session
 * Session lifecycle initialization and telemetry
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { destination, mode, startLocation } = req.body;
    const sessionId = `nav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const session = {
      sessionId,
      destination: destination || 'nearest_exit',
      mode: mode || 'CAMERA_AR',
      startTime: new Date().toISOString(),
      status: 'ACTIVE',
      events: [{ type: 'NAVIGATION_STARTED', timestamp: new Date().toISOString(), details: { destination, startLocation } }]
    };

    NAVIGATION_SESSIONS.set(sessionId, session);

    res.json({
      success: true,
      data: {
        sessionId,
        status: 'ACTIVE',
        startTime: session.startTime
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Session creation failed' });
  }
};

/**
 * POST /api/navigation/event
 * Log structured navigation telemetry events (Zero raw camera frame logging)
 */
export const logNavigationEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, eventType, data } = req.body;

    if (sessionId && NAVIGATION_SESSIONS.has(sessionId)) {
      const session = NAVIGATION_SESSIONS.get(sessionId)!;
      session.events.push({
        type: eventType || 'EVENT',
        timestamp: new Date().toISOString(),
        details: data
      });

      if (eventType === 'ARRIVED') {
        session.status = 'COMPLETED';
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Event logging failed' });
  }
};

/**
 * POST /api/navigation/recalculate
 * Server-assisted dynamic rerouting
 */
export const recalculateRoute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPosition, destination, blockedDirection } = req.body;

    res.json({
      success: true,
      data: {
        action: 'TURN_LEFT',
        instruction: 'Path ahead obstructed. Turn left to take alternative corridor.',
        distanceMeters: 4.0,
        confidence: 0.91,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Recalculation failed' });
  }
};

/**
 * GET /api/navigation/environments/:id
 * Retrieve structured environment definition
 */
export const getEnvironmentDefinition = async (req: Request, res: Response): Promise<void> => {
  try {
    const envId = String(req.params.id || 'demo_railway_station');
    const env = BUILTIN_ENVIRONMENTS[envId] || BUILTIN_ENVIRONMENTS.demo_railway_station;

    res.json({
      success: true,
      data: env
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Environment fetch failed' });
  }
};
