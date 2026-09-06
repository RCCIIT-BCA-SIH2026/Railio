import axios from 'axios';

export interface GeminiObjectDetection {
  id: string;
  type: 'door' | 'exit' | 'emergency_exit' | 'corridor' | 'stairs' | 'elevator' | 'platform' | 'sign' | 'obstacle' | 'landmark' | 'counter' | 'window';
  label: string;
  doorSubtype?: 'DOOR' | 'ROOM_DOOR' | 'EXIT_DOOR' | 'CLOSET_DOOR' | 'BATHROOM_DOOR' | 'EMERGENCY_EXIT' | 'OPENING' | 'UNKNOWN';
  state?: 'open' | 'closed' | 'partially_open';
  isOpenDoor?: boolean;
  hasExitSign?: boolean;
  hasVisibleCorridor?: boolean;
  relative_direction: 'left' | 'center' | 'right' | 'slight_left' | 'slight_right' | 'behind';
  relative_position?: { x: number; y: number };
  distance_estimate_m: number;
  confidence: number;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 space
}

export interface GeminiWalkablePath {
  direction: 'left' | 'center' | 'right' | 'slight_left' | 'slight_right' | 'straight';
  target?: string;
  walkable: boolean;
  clearDistanceMeters?: number;
  confidence: number;
}

export interface GeminiSignDetection {
  text: string;
  type: 'EXIT' | 'PLATFORM' | 'GATE' | 'ROOM' | 'STAIRS' | 'LIFT' | 'WAY_OUT' | 'EMERGENCY';
  direction?: 'left' | 'right' | 'straight' | 'up' | 'down';
  confidence: number;
}

export interface GeminiObstacleDetection {
  label: string;
  direction: 'left' | 'center' | 'right' | 'straight';
  distance_m: number;
  confidence: number;
}

export interface GeminiRecommendedAction {
  action: 'MOVE_FORWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'MOVE_RIGHT' | 'MOVE_LEFT' | 'ENTER_DOOR' | 'TAKE_STAIRS' | 'TAKE_ELEVATOR' | 'STOP' | 'SCAN' | 'ARRIVED' | 'PATH_BLOCKED' | 'TURN_AROUND';
  target?: string;
  confidence: number;
}

export interface GeminiSceneAnalysisResult {
  scene: {
    type: 'room' | 'corridor' | 'platform' | 'hall' | 'concourse' | 'junction' | 'staircase' | 'unknown';
    confidence: number;
  };
  user_context?: {
    estimated_position: string;
    confidence: number;
  };
  objects: GeminiObjectDetection[];
  walkable_paths: GeminiWalkablePath[];
  signs: GeminiSignDetection[];
  obstacles: GeminiObstacleDetection[];
  recommended_action: GeminiRecommendedAction;
  reason: string;
  instructionText: string;
  timestamp: string;
}

export class GeminiVisionProvider {
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Analyze Camera Image via Gemini Multimodal Vision API
   */
  public async analyzeScene(params: {
    imageBase64?: string;
    destination?: string;
    currentPose?: any;
    environmentHint?: string;
    systemInstruction?: string; // System instruction passed from mobile client
  }): Promise<GeminiSceneAnalysisResult> {
    const dest = params.destination || 'nearest exit';

    if (!params.imageBase64 || params.imageBase64.trim() === '') {
      return this.generateLowConfidenceFallback(dest, 'No camera frame received.');
    }

    try {
      const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');

      // ─────────────────────────────────────────────────────────────────────
      // CRITICAL FIX: The old prompt told the model to derive TURN_RIGHT/LEFT
      // from where the door APPEARED in the image. This caused wrong directions
      // when the door was centered.
      //
      // NEW: The model is a PERCEPTION ENGINE only. It reports what it sees
      // (xCenter position, open state, exit signs, walkable corridor beyond).
      // The NavigationDecisionEngine on the client makes the final turn decision.
      // ─────────────────────────────────────────────────────────────────────
      const systemPrompt = `You are a VISUAL PERCEPTION ENGINE for an indoor navigation system.
You are NOT the navigation controller. Do NOT decide whether the user should turn left or right.
Your ONLY job is to describe what you visually observe.

User's navigation destination: "${dest}"

PERCEPTION RULES (strictly follow these):
1. For each detected door/opening, measure its CENTER X position in the frame (0.0 = far left, 1.0 = far right, 0.5 = center).
   - If xCenter is between 0.35 and 0.65: set relative_direction = "center" (door is AHEAD)
   - If xCenter < 0.35: set relative_direction = "left"
   - If xCenter > 0.65: set relative_direction = "right"
   - NEVER set direction based on assumption — only from visual measurement.

2. Do NOT assume a door is an EXIT unless:
   - You can see an EXIT, WAY OUT, or similar sign near it
   - You can see a visible corridor or open space beyond the door
   - Set isOpenDoor = true/false accurately
   - Set hasExitSign = true if you see EXIT/WAY OUT sign associated with this door
   - Set hasVisibleCorridor = true if you can see walkable space beyond the door

3. Classify doorSubtype honestly:
   - "EXIT_DOOR": door leading outside the room with corridor/space visible beyond
   - "ROOM_DOOR": internal door to another room
   - "CLOSET_DOOR": closet or storage
   - "BATHROOM_DOOR": bathroom/toilet
   - "DOOR": generic door, unknown purpose
   - "UNKNOWN": cannot determine

4. If you are uncertain about anything, use confidence < 0.5. Do NOT invent objects.

5. Set recommended_action based on WHAT IS VISIBLE, not where to navigate:
   - "MOVE_FORWARD": clear walkable path straight ahead
   - "SCAN": insufficient visual information to determine scene
   - "PATH_BLOCKED": obstacle directly in path
   (Do NOT output TURN_LEFT or TURN_RIGHT — the navigation engine decides turns)

6. Strictly enforce standardized labels for objects. NEVER output "Exit gate", "Exit Gateway", or hallucinated terms.
   - Use ONLY these exact labels: "Exit Door", "Room Door", "Open Doorway", "Closet Door", "Obstacle", "Stairs", "Elevator".

7. instructionText should be blank (""). The navigation engine generates voice.

Return ONLY valid JSON matching exactly this schema:
{
  "scene": { "type": "room|corridor|hall|junction|staircase|unknown", "confidence": 0.92 },
  "user_context": { "estimated_position": "center", "confidence": 0.75 },
  "objects": [
    {
      "id": "door_01",
      "type": "door",
      "doorSubtype": "EXIT_DOOR",
      "label": "Open Room Door",
      "state": "open",
      "isOpenDoor": true,
      "hasExitSign": false,
      "hasVisibleCorridor": true,
      "relative_direction": "center",
      "distance_estimate_m": 2.5,
      "confidence": 0.92,
      "box_2d": [200, 350, 880, 640]
    }
  ],
  "walkable_paths": [
    { "direction": "straight", "walkable": true, "clearDistanceMeters": 3.0, "confidence": 0.90 }
  ],
  "signs": [],
  "obstacles": [],
  "recommended_action": { "action": "MOVE_FORWARD", "target": "door_01", "confidence": 0.90 },
  "reason": "One open door visible centered in frame with corridor beyond.",
  "instructionText": ""
}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.05,  // Very low temperature — we want consistent, factual output
          response_mime_type: 'application/json'
        }
      };

      const candidateModels = [
        process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash',
      ];

      let lastError: any = null;

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
          const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000,
          });

          const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed: any = JSON.parse(candidateText);
            return this.validateAndNormalizeGeminiResponse(parsed, dest);
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[GeminiVisionProvider] Model ${model} failed:`, err.message?.substring(0, 100));
        }
      }

      console.warn('[GeminiVisionProvider] All models failed — low-confidence fallback');
      return this.generateLowConfidenceFallback(dest, lastError?.message);
    } catch (topLevelError: any) {
      console.warn('[GeminiVisionProvider] Top-level error:', topLevelError.message?.substring(0, 100));
      return this.generateLowConfidenceFallback(dest, topLevelError.message);
    }
  }

  /**
   * Validate and normalize Gemini JSON output into production schema.
   */
  private validateAndNormalizeGeminiResponse(parsed: any, destination: string): GeminiSceneAnalysisResult {
    const scene = {
      type: parsed.scene?.type || 'room',
      confidence: typeof parsed.scene?.confidence === 'number' ? parsed.scene.confidence : 0.85
    };

    const objects: GeminiObjectDetection[] = Array.isArray(parsed.objects)
      ? parsed.objects.map((obj: any, idx: number) => ({
          id: obj.id || `obj_${idx + 1}`,
          type: obj.type || 'door',
          doorSubtype: obj.doorSubtype || 'UNKNOWN',
          label: obj.label || 'Detected Object',
          state: obj.state || 'closed',
          isOpenDoor: obj.isOpenDoor ?? (obj.state === 'open'),
          hasExitSign: obj.hasExitSign ?? false,
          hasVisibleCorridor: obj.hasVisibleCorridor ?? false,
          relative_direction: obj.relative_direction || 'center',
          relative_position: obj.relative_position || { x: 0.5, y: 0.5 },
          distance_estimate_m: typeof obj.distance_estimate_m === 'number' ? obj.distance_estimate_m : 3.0,
          confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.80,
          box_2d: Array.isArray(obj.box_2d) && obj.box_2d.length === 4 ? obj.box_2d : undefined
        }))
      : [];

    const walkable_paths: GeminiWalkablePath[] = Array.isArray(parsed.walkable_paths)
      ? parsed.walkable_paths.map((p: any) => ({
          direction: p.direction || 'straight',
          target: p.target,
          walkable: Boolean(p.walkable !== false),
          clearDistanceMeters: p.clearDistanceMeters || 3.0,
          confidence: typeof p.confidence === 'number' ? p.confidence : 0.80
        }))
      : [{ direction: 'straight' as const, walkable: true, confidence: 0.75 }];

    const signs: GeminiSignDetection[] = Array.isArray(parsed.signs)
      ? parsed.signs.map((s: any) => ({
          text: s.text || 'EXIT',
          type: s.type || 'EXIT',
          direction: s.direction || 'straight',
          confidence: typeof s.confidence === 'number' ? s.confidence : 0.85
        }))
      : [];

    const obstacles: GeminiObstacleDetection[] = Array.isArray(parsed.obstacles)
      ? parsed.obstacles.map((o: any) => ({
          label: o.label || 'Obstacle',
          direction: o.direction || 'center',
          distance_m: o.distance_m || 2.0,
          confidence: typeof o.confidence === 'number' ? o.confidence : 0.80
        }))
      : [];

    // Safe action mapping — only use what the model actually reported
    const rawAction = (parsed.recommended_action?.action || 'MOVE_FORWARD').toUpperCase();
    let action: GeminiRecommendedAction['action'] = 'MOVE_FORWARD';
    if (rawAction.includes('BLOCKED')) action = 'PATH_BLOCKED';
    else if (rawAction.includes('ARRIVED')) action = 'ARRIVED';
    else if (rawAction.includes('SCAN')) action = 'SCAN';
    else if (rawAction === 'ENTER_DOOR') action = 'ENTER_DOOR';
    else if (rawAction.includes('STAIR')) action = 'TAKE_STAIRS';
    else if (rawAction.includes('ELEVATOR') || rawAction.includes('LIFT')) action = 'TAKE_ELEVATOR';
    else if (rawAction.includes('TURN_AROUND') || rawAction.includes('AROUND')) action = 'TURN_AROUND';
    // NOTE: We intentionally do NOT map TURN_LEFT/TURN_RIGHT from the model here.
    // The navigation engine determines turns based on xCenter position.
    // If the model outputs TURN_LEFT/TURN_RIGHT we conservatively use MOVE_FORWARD.

    return {
      scene,
      user_context: parsed.user_context || { estimated_position: 'center', confidence: 0.70 },
      objects,
      walkable_paths,
      signs,
      obstacles,
      recommended_action: {
        action,
        target: parsed.recommended_action?.target,
        confidence: typeof parsed.recommended_action?.confidence === 'number'
          ? parsed.recommended_action.confidence
          : 0.80
      },
      reason: parsed.reason || 'Scene analyzed.',
      instructionText: '', // Always blank — navigation engine generates voice
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Low-confidence fallback — triggers SCAN state on client, never a wrong turn.
   * CRITICAL: No hardcoded directions in fallback.
   */
  private generateLowConfidenceFallback(destination: string, note?: string): GeminiSceneAnalysisResult {
    return {
      scene: { type: 'unknown', confidence: 0.30 },
      user_context: { estimated_position: 'unknown', confidence: 0.30 },
      objects: [],        // No objects — client enters SCAN state
      walkable_paths: [],
      signs: [],
      obstacles: [],
      recommended_action: {
        action: 'SCAN',   // Always SCAN — never a direction turn
        confidence: 0.30
      },
      reason: note || 'Insufficient visual data.',
      instructionText: '',
      timestamp: new Date().toISOString()
    };
  }
}

export const geminiVisionProvider = new GeminiVisionProvider();
