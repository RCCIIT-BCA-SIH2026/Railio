// ─────────────────────────────────────────────────────────────────────────────
// VisionModelProvider — AI perception layer (NOT navigation controller)
//
// CRITICAL FIX: The previous offline fallback hardcoded direction:'right' and
// recommendedAction:'TURN_RIGHT' — this caused the system to always say
// "Turn right" even when the door was directly ahead.
//
// The fallback now returns LOW CONFIDENCE (0.35) so the navigation engine
// enters SCAN state rather than issuing a turn command.
//
// The AI prompt now explicitly instructs Gemini that it is NOT the navigation
// controller and must not derive left/right direction solely from image position.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import {
  EstimatedPose,
  SceneUnderstanding,
  DetectedSign,
  DetectedNavObject,
  WalkablePath,
  VisualVerification,
  VisualTargetType,
  DoorState,
} from './types';
import { AnalysisRequest } from './FrameAnalysisScheduler';

let dynamicBaseUrl = 'http://localhost:5001/api';
try {
  const apiModule = require('../api');
  if (apiModule?.API_BASE_URL) {
    dynamicBaseUrl = apiModule.API_BASE_URL;
  }
} catch (e) {}

export interface IVisionModelProvider {
  analyzeScene(params: {
    imageBase64?: string;
    currentPose?: EstimatedPose;
    destination?: string;
    environmentHint?: string;
    request?: AnalysisRequest;
  }): Promise<SceneUnderstanding>;
  analyzeSign(params: { imageBase64?: string; signHint?: string }): Promise<DetectedSign[]>;
  inspectTargetVisibility(params: {
    imageBase64?: string;
    destinationLabel: string;
    destinationType?: VisualTargetType;
  }): Promise<VisualVerification>;
}

export class VisionModelProvider implements IVisionModelProvider {
  private backendBaseUrl: string;

  constructor(backendBaseUrl?: string) {
    this.backendBaseUrl = backendBaseUrl || dynamicBaseUrl;
  }

  public setBaseUrl(url: string): void {
    this.backendBaseUrl = url;
  }

  public async analyzeScene(params: {
    imageBase64?: string;
    currentPose?: EstimatedPose;
    destination?: string;
    environmentHint?: string;
    request?: AnalysisRequest;
  }): Promise<SceneUnderstanding> {
    try {
      const response = await axios.post(
        `${this.backendBaseUrl}/navigation/analyze-scene`,
        {
          ...params,
          // Instruct the backend/model prompt:
          systemInstruction: this.getSystemInstruction(),
        },
        { timeout: 5000 }
      );

      if (response.data?.success && response.data?.data) {
        const data: SceneUnderstanding = response.data.data;
        // Attach request metadata for scene version validation
        data.sceneVersion = params.request?.sceneVersion;
        data.requestId = params.request?.requestId;
        data.sessionId = params.request?.sessionId;
        return data;
      }
      throw new Error('Invalid backend response format');
    } catch (error) {
      // Graceful offline fallback — LOW CONFIDENCE so navigation enters SCAN
      return this.getLowConfidenceFallback(params.destination, params.currentPose, params.request);
    }
  }

  public async analyzeSign(params: { imageBase64?: string; signHint?: string }): Promise<DetectedSign[]> {
    try {
      const response = await axios.post(
        `${this.backendBaseUrl}/navigation/analyze-sign`,
        params,
        { timeout: 3000 }
      );
      if (response.data?.success && response.data?.data?.signs) {
        return response.data.data.signs;
      }
    } catch (e) {}
    return [];
  }

  /**
   * System instruction sent to the AI model.
   * Explicitly prevents Gemini from acting as the navigation controller.
   */
  private getSystemInstruction(): string {
    return `You are a visual perception engine for an indoor navigation system. You are NOT the navigation controller.

Your job is ONLY to describe what you visually observe. Never invent objects, doors, exits, or directions.

CRITICAL RULES:
1. Do NOT derive a left/right navigation instruction solely from where an object appears in the image frame.
   - A door at the center of the frame (xCenter ≈ 0.5) means it is AHEAD. Report direction as 'straight'.
   - Only report direction as 'left' or 'right' if the object is clearly off-center (xCenter < 0.35 or > 0.65).
2. Do NOT assume a door is an exit unless you see: an EXIT sign, a visible corridor leading outside, or other clear evidence.
3. If you are uncertain, use low confidence values (< 0.5). Do not guess.
4. Report the 'isOpenDoor' field honestly: is the door visibly open?
5. Report 'hasExitSign' if you see an EXIT or WAY OUT sign associated with this door.
6. Report 'hasVisibleCorridor' if you can see a walkable space beyond the door.
7. Return structured JSON only. The navigation engine will make the final movement decision.
8. For each detected object, include a normalized boundingBox (xmin, ymin, xmax, ymax all 0-1).

Return this exact JSON format:
{
  "scene": "room|corridor|station_concourse|platform|stairwell|lobby",
  "objects": [
    {
      "id": "door_01",
      "type": "door|exit|corridor|stairs|elevator|obstacle",
      "doorSubtype": "DOOR|ROOM_DOOR|EXIT_DOOR|CLOSET_DOOR|BATHROOM_DOOR|EMERGENCY_EXIT|OPENING|UNKNOWN",
      "label": "human readable label",
      "direction": "straight|left|right|slight_left|slight_right|behind",
      "distanceEstimate": 2.5,
      "confidence": 0.85,
      "isOpenDoor": true,
      "hasExitSign": false,
      "hasVisibleCorridor": false,
      "boundingBox": {"ymin": 0.2, "xmin": 0.35, "ymax": 0.85, "xmax": 0.65}
    }
  ],
  "paths": [
    {"direction": "straight", "walkable": true, "clearDistanceMeters": 3.0, "confidence": 0.9}
  ],
  "signs": [],
  "recommendedAction": "MOVE_FORWARD",
  "confidence": 0.88,
  "instructionText": ""
}`;
  }

  /**
   * Inspect whether the target destination is visually present and its door state.
   *
   * ARCHITECTURE RULE: This is visual EVIDENCE only.
   * The caller (NavigationStateManager) is responsible for validating this
   * evidence against AR proximity and temporal confirmation before any
   * navigation state change.
   *
   * Gemini must NOT assign coordinates or metric distances.
   * It must NOT trigger ARRIVED by itself.
   */
  public async inspectTargetVisibility(params: {
    imageBase64?: string;
    destinationLabel: string;
    destinationType?: VisualTargetType;
  }): Promise<VisualVerification> {
    const fallback: VisualVerification = {
      targetVisible: false,
      targetType: 'UNKNOWN',
      doorState: 'UNKNOWN',
      label: params.destinationLabel,
      confidence: 0,
      boundingBox: null,
      evidence: [],
      timestamp: Date.now(),
    };

    try {
      const prompt = `You are a visual inspection assistant for an indoor navigation system.

The user is trying to reach: "${params.destinationLabel}".

Look at this image and answer ONLY what you can visually confirm.

CRITICAL RULES:
1. Do NOT hallucinate objects, doors, or signs that are not visible.
2. Do NOT estimate metric distances. You are NOT the positioning system.
3. If uncertain, set confidence to a low value and doorState to "UNKNOWN".
4. doorState must be "OPEN" only if you can clearly see the door is physically open.
5. targetVisible must be true only if the described destination is clearly identifiable.

Return ONLY valid JSON in this exact format:
{
  "targetVisible": true,
  "targetType": "EXIT",
  "doorState": "CLOSED",
  "label": "${params.destinationLabel}",
  "confidence": 0.87,
  "boundingBox": { "ymin": 120, "xmin": 250, "ymax": 850, "xmax": 760 },
  "evidence": ["green EXIT sign", "double glass door"]
}

Allowed values:
  targetVisible: true | false
  targetType: "DOOR" | "EXIT" | "SIGN" | "LIFT" | "STAIR" | "LANDMARK" | "UNKNOWN"
  doorState: "OPEN" | "CLOSED" | "UNKNOWN"`;

      const response = await axios.post(
        `${this.backendBaseUrl}/navigation/inspect-target`,
        {
          imageBase64: params.imageBase64,
          prompt,
          destinationLabel: params.destinationLabel,
        },
        { timeout: 4000 }
      );

      if (response.data?.success && response.data?.data) {
        const d = response.data.data;
        return {
          targetVisible: !!d.targetVisible,
          targetType: (d.targetType as VisualTargetType) || 'UNKNOWN',
          doorState: (d.doorState as DoorState) || 'UNKNOWN',
          label: d.label || params.destinationLabel,
          confidence: typeof d.confidence === 'number' ? Math.min(1, Math.max(0, d.confidence)) : 0,
          boundingBox: d.boundingBox || null,
          evidence: Array.isArray(d.evidence) ? d.evidence : [],
          timestamp: Date.now(),
        };
      }
    } catch (e) {
      // Network error or model failure — return unknown, not a false positive
    }

    return fallback;
  }

  // ──────────────────────────────────────────────────────────────────────
  // CRITICAL FIX: Offline fallback NO LONGER says "Turn right".
  // It returns LOW CONFIDENCE (0.35) so the NavDecisionEngine enters SCAN.
  // ─────────────────────────────────────────────────────────────────────────

  private getLowConfidenceFallback(
    destination?: string,
    pose?: EstimatedPose,
    request?: AnalysisRequest
  ): SceneUnderstanding {
    const dest = (destination || '').toLowerCase();
    const isPlatform = dest.includes('platform') || dest.includes('train');
    const isLift = dest.includes('lift') || dest.includes('elevator');

    const objects: DetectedNavObject[] = [];
    const paths: WalkablePath[] = [];

    // For platform / lift, we can suggest a generic forward path at low confidence
    // so the user at least gets "please look around" rather than a wrong turn.
    if (isPlatform) {
      objects.push({
        id: 'platform_hint',
        type: 'corridor',
        label: 'Platform Direction',
        direction: 'straight',          // ← ALWAYS straight in fallback (never 'right')
        distanceEstimate: 8.0,
        confidence: 0.35,              // ← LOW CONFIDENCE — navigation engine will scan
        boundingBox: { ymin: 0.2, xmin: 0.35, ymax: 0.8, xmax: 0.65 },
      });
      paths.push({ direction: 'straight', walkable: true, clearDistanceMeters: 8.0, confidence: 0.35 });
    } else if (isLift) {
      objects.push({
        id: 'lift_hint',
        type: 'elevator',
        label: 'Elevator Area',
        direction: 'straight',          // ← ALWAYS straight in fallback
        distanceEstimate: 5.0,
        confidence: 0.35,
        boundingBox: { ymin: 0.2, xmin: 0.35, ymax: 0.8, xmax: 0.65 },
      });
      paths.push({ direction: 'straight', walkable: true, clearDistanceMeters: 5.0, confidence: 0.35 });
    }
    // For exit / outside / any other destination:
    // DO NOT add a directional hint. Confidence stays low → navigation enters SCAN.

    return {
      scene: 'unknown',
      objects,
      paths,
      signs: [],
      recommendedAction: 'SCAN',        // ← Always SCAN when offline, never TURN_RIGHT
      confidence: 0.30,                 // ← Below navigation threshold
      instructionText: '',
      timestamp: new Date().toISOString(),
      sceneVersion: request?.sceneVersion,
      requestId: request?.requestId,
      sessionId: request?.sessionId,
    };
  }
}

export const visionModelProvider = new VisionModelProvider();
