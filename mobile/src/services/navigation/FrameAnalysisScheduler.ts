// ─────────────────────────────────────────────────────────────────────────────
// FrameAnalysisScheduler — Event-driven AI analysis scheduler
//
// PROBLEM SOLVED: The old system used setInterval(3500ms) to blindly upload
// every 3.5 seconds. This burned mobile data and produced stale AI responses
// that overrode current state.
//
// SOLUTION: Analysis is event-triggered, not time-triggered. Each request
// carries a sceneVersion and requestId so stale responses can be detected
// and discarded.
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisTrigger =
  | 'INITIAL_SCAN'
  | 'NEW_AREA_DETECTED'
  | 'TARGET_SEARCH'
  | 'SCENE_CHANGED'
  | 'TRACKING_LOST'
  | 'LOW_CONFIDENCE'
  | 'JUNCTION_DETECTED'
  | 'USER_REQUESTED'
  | 'PERIODIC_VALIDATION'
  | 'RELOCALIZE';

export interface AnalysisRequest {
  requestId: string;
  sceneVersion: number;
  sessionId: string;
  trigger: AnalysisTrigger;
  timestamp: number;
}

export interface AnalysisRequestConfig {
  trigger: AnalysisTrigger;
  sceneVersion: number;
  sessionId: string;
  frameProvider: () => Promise<string | null>;
  onComplete: (result: any, request: AnalysisRequest) => void;
  onError?: (error: Error, request: AnalysisRequest) => void;
}

// Minimum interval between any AI analysis (ms)
const MIN_ANALYSIS_INTERVAL_MS = 6000;
// Minimum interval for periodic validation specifically (ms)
const PERIODIC_VALIDATION_INTERVAL_MS = 12000;
// Frame similarity threshold — skip if frames are nearly identical (0-1, lower = more strict)
const SIMILARITY_SKIP_THRESHOLD = 0.92;

export class FrameAnalysisScheduler {
  private pendingRequestId: string | null = null;
  private lastAnalysisTime: number = 0;
  private lastPeriodicTime: number = 0;
  private isAnalyzing: boolean = false;
  private lastFrameHash: string | null = null;
  private requestCounter: number = 0;
  private cancelledRequests: Set<string> = new Set();

  /**
   * Schedule an AI analysis for the given trigger.
   * May be rejected if rate-limited, duplicate, or if frame quality is poor.
   * Returns the requestId if scheduled, null if skipped.
   */
  public async scheduleAnalysis(
    config: AnalysisRequestConfig,
    analyzeScene: (imageBase64: string | undefined, request: AnalysisRequest) => Promise<any>
  ): Promise<string | null> {
    const now = Date.now();

    // Rate limiting — minimum interval between analyses
    if (config.trigger !== 'TRACKING_LOST' && config.trigger !== 'USER_REQUESTED') {
      if (now - this.lastAnalysisTime < MIN_ANALYSIS_INTERVAL_MS) {
        return null;
      }
    }

    // Periodic validation has its own, longer minimum interval
    if (config.trigger === 'PERIODIC_VALIDATION') {
      if (now - this.lastPeriodicTime < PERIODIC_VALIDATION_INTERVAL_MS) {
        return null;
      }
    }

    // Don't stack concurrent analyses — cancel the pending one and replace
    if (this.isAnalyzing && this.pendingRequestId) {
      this.cancelledRequests.add(this.pendingRequestId);
    }

    // Capture frame
    let imageBase64: string | undefined;
    try {
      const frame = await config.frameProvider();
      if (frame) {
        // Frame similarity check — skip if nearly identical to last frame
        const frameHash = this.computeFrameHash(frame);
        if (
          config.trigger === 'PERIODIC_VALIDATION' &&
          this.lastFrameHash &&
          this.computeSimilarity(frameHash, this.lastFrameHash) > SIMILARITY_SKIP_THRESHOLD
        ) {
          return null; // Scene hasn't changed meaningfully
        }
        this.lastFrameHash = frameHash;
        imageBase64 = frame;
      }
    } catch {
      // Frame capture failed — proceed without image (model will use context only)
    }

    const requestId = `req_${++this.requestCounter}_${now}`;
    const request: AnalysisRequest = {
      requestId,
      sceneVersion: config.sceneVersion,
      sessionId: config.sessionId,
      trigger: config.trigger,
      timestamp: now,
    };

    this.pendingRequestId = requestId;
    this.isAnalyzing = true;
    this.lastAnalysisTime = now;

    if (config.trigger === 'PERIODIC_VALIDATION') {
      this.lastPeriodicTime = now;
    }

    // Run async — do not await here so camera preview is never blocked
    this.executeAnalysis(request, imageBase64, config, analyzeScene);

    return requestId;
  }

  /**
   * Cancel a pending request by ID.
   * The response will be discarded when it arrives.
   */
  public cancelRequest(requestId: string): void {
    this.cancelledRequests.add(requestId);
    if (this.pendingRequestId === requestId) {
      this.pendingRequestId = null;
    }
  }

  /**
   * Check if a response for this requestId should be accepted.
   * Returns false if cancelled or superseded.
   */
  public isResponseValid(requestId: string, currentSceneVersion: number, responseSceneVersion: number): boolean {
    if (this.cancelledRequests.has(requestId)) return false;
    if (responseSceneVersion !== currentSceneVersion) return false;
    return true;
  }

  /**
   * Reset scheduler state on new session.
   */
  public reset(): void {
    if (this.pendingRequestId) {
      this.cancelledRequests.add(this.pendingRequestId);
    }
    this.pendingRequestId = null;
    this.isAnalyzing = false;
    this.lastAnalysisTime = 0;
    this.lastPeriodicTime = 0;
    this.lastFrameHash = null;
    this.cancelledRequests.clear();
    this.requestCounter = 0;
  }

  public getLastAnalysisTime(): number {
    return this.lastAnalysisTime;
  }

  public isCurrentlyAnalyzing(): boolean {
    return this.isAnalyzing;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async executeAnalysis(
    request: AnalysisRequest,
    imageBase64: string | undefined,
    config: AnalysisRequestConfig,
    analyzeScene: (imageBase64: string | undefined, request: AnalysisRequest) => Promise<any>
  ): Promise<void> {
    try {
      const result = await analyzeScene(imageBase64, request);

      // Discard if cancelled or superseded
      if (this.cancelledRequests.has(request.requestId)) {
        return;
      }

      config.onComplete(result, request);
    } catch (error) {
      if (!this.cancelledRequests.has(request.requestId)) {
        config.onError?.(error as Error, request);
      }
    } finally {
      if (this.pendingRequestId === request.requestId) {
        this.pendingRequestId = null;
        this.isAnalyzing = false;
      }
      // Clean up cancelled set periodically
      if (this.cancelledRequests.size > 50) {
        this.cancelledRequests.clear();
      }
    }
  }

  /**
   * Very lightweight frame hash for similarity comparison.
   * Samples a fixed grid of pixels rather than processing the full frame.
   */
  private computeFrameHash(base64: string): string {
    // Sample every N-th character for a fast hash representative of the image
    const sampleStep = Math.max(1, Math.floor(base64.length / 64));
    let hash = '';
    for (let i = 0; i < base64.length; i += sampleStep) {
      hash += base64[i];
    }
    return hash;
  }

  /**
   * Simple character-match similarity between two hashes.
   * Returns 0 (completely different) to 1 (identical).
   */
  private computeSimilarity(hash1: string, hash2: string): number {
    const len = Math.min(hash1.length, hash2.length);
    if (len === 0) return 0;
    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return matches / len;
  }
}

export const frameAnalysisScheduler = new FrameAnalysisScheduler();
