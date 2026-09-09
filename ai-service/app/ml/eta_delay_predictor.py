"""
eta_delay_predictor.py — Real ML Inference Engine for RailSathi ETA Forecasting
=================================================================================
Loads the serialized GradientBoosting model (suburban_gbr_model.joblib) and the
companion statistical params JSON.  Falls back gracefully to a calibrated
multi-factor statistical regressor if the joblib model is unavailable.

Feature vector (10 dims, matching training schema in train_suburban_models.py):
  [dep_min, sin_dep, cos_dep, is_peak_rush,
   line_val, div_val, dir_val, dist, duration, avg_delay_5yr]

Two additional real-world penalty factors are computed post-model and summed:
  + tsr_penalty_min  (Temporary Speed Restriction time-loss)
  + signal_penalty_min (Signal aspect / Block headway delay)
"""

import os
import json
import math
import warnings
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# ─── Paths ────────────────────────────────────────────────────────────────────
_THIS_DIR    = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR  = os.path.join(_THIS_DIR, "models")
_GBR_PATH    = os.path.join(_MODELS_DIR, "suburban_gbr_model.joblib")
_PARAMS_PATH = os.path.join(_MODELS_DIR, "suburban_model_params.json")

# ─── Feature mappings (must match training) ───────────────────────────────────
LINE_MAPPING      = {"Tarakeswar Line": 0, "Main Line": 1, "Chord Line": 2,
                     "Bangaon Line": 3, "South Line": 4,
                     "Circular Railway": 5, "Chord Link": 6}
DIVISION_MAPPING  = {"Howrah": 0, "Sealdah": 1}
DIRECTION_MAPPING = {"UP": 0, "DOWN": 1}

# ─── Pydantic models ─────────────────────────────────────────────────────────

class TSRSegment(BaseModel):
    """Temporary Speed Restriction on a track section."""
    sectionId:        str
    startKm:          float
    endKm:            float
    maxSpeedKmh:      float   = 30.0
    normalSpeedKmh:   float   = 110.0
    reason:           str     = "Maintenance"

class SignalAspect(BaseModel):
    """Current signal aspect ahead of the train."""
    aspect:           str     = "GREEN"   # GREEN, DOUBLE_YELLOW, YELLOW, RED
    distanceMeters:   float   = 1000.0
    expectedHaltMin:  float   = 0.0

class DelayPredictionRequest(BaseModel):
    # ── Identity ────────────────────────────────────────────────────────────
    trainNumber:       str
    # ── Schedule context ────────────────────────────────────────────────────
    departureTime:     str    = "08:00"   # "HH:MM" 24-h
    arrivalTime:       str    = "09:30"
    travelDurationMins: float = 90.0
    distanceKm:        float  = 50.0
    line:              str    = "Main Line"
    division:          str    = "Sealdah"
    direction:         str    = "DOWN"
    avgDelay5Yr:       float  = 5.0       # historical average delay (mins)
    # ── Live operational context ─────────────────────────────────────────────
    departureDelay:    float  = 0.0       # minutes already delayed at origin
    currentSpeed:      float  = 80.0
    dwellTime:         float  = 2.0
    weatherCondition:  str    = "Clear"
    junctionCongestionLevel: float = 0.3
    # ── Ground-reality infrastructure ─────────────────────────────────────
    activeTSRs:        List[TSRSegment]   = []
    signalAspect:      Optional[SignalAspect] = None
    precedingTrainDelayMin: float         = 0.0   # headway impact
    fogVisibilityKm:   float              = 10.0  # <1 = dense fog cap
    # ── Legacy schedule fields (backward compat) ─────────────────────────
    day:               int    = 15
    month:             int    = 9
    dayOfWeek:         int    = 2
    departureHour:     int    = 8
    departureMinute:   int    = 0
    arrivalHour:       int    = 9
    arrivalMinute:     int    = 30


class ExplainabilityFactor(BaseModel):
    factor:     str
    impactMin:  float
    category:   str


class DelayPredictionResponse(BaseModel):
    predictedDelayMinutes:  int
    arrivalWindow:          str
    confidenceScore:        float
    confidenceIntervalMin:  List[float]   # [lower, upper]
    delayProbability:       float
    expectedDelay:          str
    explainability:         List[ExplainabilityFactor]
    catchUpPotentialMin:    float         # recoverable time in downstream sections
    modelType:              str           = "GradientBoosting (suburban_gbr)"

# Backward-compat alias
DelayPrediction = DelayPredictionResponse


# ─── Predictor ───────────────────────────────────────────────────────────────

class ETADelayPredictor:
    """
    Real ML-based ETA delay predictor.
    Primary:  suburban_gbr_model.joblib (GradientBoostingRegressor, MAE ~10.5 min)
    Fallback: calibrated multi-factor statistical regressor
    """

    def __init__(self):
        self._model = None
        self._params: Dict[str, Any] = {}
        self._feature_importances: Optional[np.ndarray] = None
        self._load_model()

    # ── Model loading ─────────────────────────────────────────────────────────

    def _load_model(self):
        # Load params JSON (always available)
        if os.path.exists(_PARAMS_PATH):
            try:
                with open(_PARAMS_PATH, "r") as f:
                    self._params = json.load(f)
                print("[ETADelayPredictor] Loaded suburban_model_params.json")
            except Exception as e:
                print(f"[ETADelayPredictor] Could not load params: {e}")

        # Load GBR joblib model
        if os.path.exists(_GBR_PATH):
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    self._model = joblib.load(_GBR_PATH)
                imp = getattr(self._model, "feature_importances_", None)
                self._feature_importances = np.array(imp) if imp is not None else None
                print(f"[ETADelayPredictor] GBR model loaded from {_GBR_PATH}")
            except Exception as e:
                print(f"[ETADelayPredictor] GBR load failed: {e}. Using statistical fallback.")
                self._model = None
        else:
            print(f"[ETADelayPredictor] {_GBR_PATH} not found. Using statistical fallback.")

    # ── Feature engineering ───────────────────────────────────────────────────

    @staticmethod
    def _hhmm_to_min(t: str) -> int:
        """'HH:MM' → total minutes from midnight."""
        try:
            h, m = (int(x) for x in str(t).strip().split(":"))
            return h * 60 + m
        except Exception:
            return 0

    def _build_feature_vector(self, req: DelayPredictionRequest) -> np.ndarray:
        """
        Build the 10-dim feature vector matching train_suburban_models.py schema:
        [dep_min, sin_dep, cos_dep, is_peak_rush,
         line_val, div_val, dir_val, dist, duration, avg_delay_5yr]
        """
        dep_min  = self._hhmm_to_min(req.departureTime)
        dep_hour = dep_min // 60

        sin_dep  = math.sin(2.0 * math.pi * dep_min / 1440.0)
        cos_dep  = math.cos(2.0 * math.pi * dep_min / 1440.0)
        is_peak  = 1.0 if (7 <= dep_hour <= 10 or 17 <= dep_hour <= 20) else 0.0

        line_val = LINE_MAPPING.get(req.line, 1)
        div_val  = DIVISION_MAPPING.get(req.division, 1)
        dir_val  = DIRECTION_MAPPING.get(req.direction.upper(), 1)

        return np.array([[
            dep_min, sin_dep, cos_dep, is_peak,
            line_val, div_val, dir_val,
            req.distanceKm, req.travelDurationMins, req.avgDelay5Yr
        ]])

    # ── Infrastructure penalty calculators ───────────────────────────────────

    def _compute_tsr_penalty(self, tsrs: List[TSRSegment]) -> float:
        """
        For each active TSR segment compute additional time lost:
          penalty = section_length / tsr_speed - section_length / normal_speed  (hours)
          → convert to minutes
        """
        total = 0.0
        for tsr in tsrs:
            seg_km = abs(tsr.endKm - tsr.startKm)
            if seg_km <= 0:
                continue
            normal_h = seg_km / max(tsr.normalSpeedKmh, 10)
            tsr_h    = seg_km / max(tsr.maxSpeedKmh, 5)
            total   += (tsr_h - normal_h) * 60.0
        return round(max(0.0, total), 1)

    def _compute_signal_penalty(self, aspect: Optional[SignalAspect],
                                preceding_delay: float) -> float:
        """
        Signal aspect penalty:
          RED:           mandatory halt (expectedHaltMin or 3 min min)
          YELLOW:        braking approach — 1.5 min average
          DOUBLE_YELLOW: cautionary — 0.5 min average
          GREEN:         0
        Headway from preceding train: if > 0, add proportional delay.
        """
        aspect_penalty = 0.0
        if aspect:
            a = aspect.aspect.upper()
            if a == "RED":
                aspect_penalty = max(3.0, aspect.expectedHaltMin)
            elif a == "YELLOW":
                aspect_penalty = max(1.5, aspect.expectedHaltMin)
            elif a == "DOUBLE_YELLOW":
                aspect_penalty = max(0.5, aspect.expectedHaltMin * 0.5)

        headway_penalty = min(preceding_delay * 0.35, 8.0)  # max 8 min headway bleed
        return round(aspect_penalty + headway_penalty, 1)

    def _compute_fog_penalty(self, fog_vis_km: float, dist_km: float) -> float:
        """
        Dense fog (< 1 km visibility): speed capped to 15 km/h (IR Fog Working Order)
        Light fog (1-3 km):            speed capped to 40 km/h
        """
        if fog_vis_km < 1.0:
            # Time at fog speed vs normal speed for remaining distance
            normal_time = (dist_km / 110.0) * 60  # assume 110 km/h normal
            fog_time    = (dist_km / 15.0)  * 60
            return round(max(0, fog_time - normal_time), 1)
        elif fog_vis_km < 3.0:
            normal_time = (dist_km / 110.0) * 60
            fog_time    = (dist_km / 40.0)  * 60
            return round(max(0, fog_time - normal_time), 1)
        return 0.0

    def _compute_weather_penalty(self, condition: str) -> float:
        c = condition.lower()
        if "dense fog" in c or "heavy fog" in c:
            return 12.0
        if "fog" in c:
            return 6.0
        if "storm" in c or "cyclone" in c:
            return 10.0
        if "heavy rain" in c:
            return 7.0
        if "rain" in c:
            return 4.0
        return 0.0

    # ── Statistical fallback ──────────────────────────────────────────────────

    def _statistical_predict(self, req: DelayPredictionRequest) -> float:
        """
        Calibrated multi-factor statistical regressor.
        Uses coefficient_baseline from params JSON if available.
        """
        cb = self._params.get("coefficient_baseline", {})
        j  = cb.get("junction_congestion", 8.5)
        wr = cb.get("weather_rain", 6.0)
        do = cb.get("dwell_overrun", 1.2)
        sd = cb.get("speed_deficit", 0.15)
        pk = cb.get("peak_rush_weight", 2.5)
        h5 = cb.get("avg_5yr_weight", 0.85)

        dep_min  = self._hhmm_to_min(req.departureTime)
        dep_hour = dep_min // 60
        is_peak  = (7 <= dep_hour <= 10 or 17 <= dep_hour <= 20)

        delay  = req.junctionCongestionLevel * j
        delay += self._compute_weather_penalty(req.weatherCondition)
        delay += max(0.0, req.dwellTime - 2.0) * do
        delay += max(0.0, 100.0 - req.currentSpeed) * sd
        delay += (2.5 if is_peak else 0.0) * pk * 0.4
        delay += req.avgDelay5Yr * h5 * 0.1
        delay += req.departureDelay * 0.6
        return max(0.0, delay)

    # ── Confidence interval ───────────────────────────────────────────────────

    def _confidence_interval(self, total_delay: float,
                              req: DelayPredictionRequest) -> List[float]:
        """
        Approximate ±σ confidence interval.
        GBR MAE ≈ 10.5 min; widen for bad conditions.
        """
        mae = self._params.get("gbr_mae", 10.5) if self._model else 15.0
        fog_factor   = 1.5 if req.fogVisibilityKm < 1.0 else 1.0
        signal_factor = 1.3 if (req.signalAspect and
                                 req.signalAspect.aspect in ("RED","YELLOW")) else 1.0
        sigma = mae * fog_factor * signal_factor
        return [round(max(0, total_delay - sigma), 1),
                round(total_delay + sigma, 1)]

    # ── Explainability ────────────────────────────────────────────────────────

    def _build_explainability(self, req: DelayPredictionRequest,
                               base_delay: float,
                               tsr_penalty: float,
                               signal_penalty: float,
                               fog_penalty: float,
                               weather_penalty: float,
                               dwell_penalty: float,
                               catchup: float) -> List[ExplainabilityFactor]:
        factors: List[ExplainabilityFactor] = []

        if self._feature_importances is not None and base_delay > 0:
            fi = self._params.get("feature_importance", {}).get("gbr",
                     list(self._feature_importances))
            labels = [
                ("Departure timing & cyclical schedule", "SCHEDULE"),
                ("Sine-encoded departure hour", "SCHEDULE"),
                ("Cosine-encoded departure hour", "SCHEDULE"),
                ("Peak rush hour congestion", "TRAFFIC"),
                ("Line/Route congestion profile", "INFRASTRUCTURE"),
                ("Railway Division operational load", "OPERATIONAL"),
                ("Train direction (Up/Down)", "TRAFFIC"),
                ("Route distance", "INFRASTRUCTURE"),
                ("Journey duration vs. MPS", "INFRASTRUCTURE"),
                ("5-Year avg historical delay", "HISTORICAL"),
            ]
            ranked = sorted(enumerate(fi), key=lambda x: x[1], reverse=True)[:3]
            for idx, importance in ranked:
                if idx < len(labels):
                    label, cat = labels[idx]
                    impact = max(0.5, round(importance * base_delay, 1))
                    factors.append(ExplainabilityFactor(
                        factor=label, impactMin=impact, category=cat))

        # Real-world additive factors (always shown if non-zero)
        if tsr_penalty > 0:
            factors.append(ExplainabilityFactor(
                factor=f"Temporary Speed Restriction ({len(req.activeTSRs)} active)",
                impactMin=round(tsr_penalty, 1),
                category="CAUTION_ORDER"))
        if signal_penalty > 0:
            asp = req.signalAspect.aspect if req.signalAspect else "HEADWAY"
            factors.append(ExplainabilityFactor(
                factor=f"Signal aspect / Block headway ({asp})",
                impactMin=round(signal_penalty, 1),
                category="SIGNAL"))
        if fog_penalty > 0:
            factors.append(ExplainabilityFactor(
                factor=f"Dense fog speed cap (vis={req.fogVisibilityKm:.1f} km)",
                impactMin=round(fog_penalty, 1),
                category="WEATHER"))
        if weather_penalty > 0 and fog_penalty == 0:
            factors.append(ExplainabilityFactor(
                factor=f"Weather condition ({req.weatherCondition})",
                impactMin=round(weather_penalty, 1),
                category="WEATHER"))
        if dwell_penalty > 0:
            factors.append(ExplainabilityFactor(
                factor="Dwell time overrun at intermediate stations",
                impactMin=round(dwell_penalty, 1),
                category="OPERATIONAL"))
        if req.departureDelay > 0:
            factors.append(ExplainabilityFactor(
                factor="Delay already accrued at origin",
                impactMin=round(req.departureDelay, 1),
                category="OPERATIONAL"))
        if catchup > 0:
            factors.append(ExplainabilityFactor(
                factor=f"Recovery: catch-up potential in downstream sections",
                impactMin=round(-catchup, 1),
                category="RECOVERY"))

        if not factors:
            factors.append(ExplainabilityFactor(
                factor="Green corridor — no significant delay factors",
                impactMin=0, category="NORMAL"))

        return factors

    # ── Public predict entry point ────────────────────────────────────────────

    def predict(self, req: DelayPredictionRequest) -> DelayPredictionResponse:
        # 1. ML base prediction
        if self._model is not None:
            X = self._build_feature_vector(req)
            raw_base = float(self._model.predict(X)[0])
        else:
            raw_base = self._statistical_predict(req)

        base_delay = max(0.0, raw_base)

        # 2. Real-world infrastructure penalties
        tsr_penalty     = self._compute_tsr_penalty(req.activeTSRs)
        signal_penalty  = self._compute_signal_penalty(req.signalAspect,
                                                        req.precedingTrainDelayMin)
        fog_penalty     = self._compute_fog_penalty(req.fogVisibilityKm,
                                                     req.distanceKm)
        weather_penalty = self._compute_weather_penalty(req.weatherCondition)
        dwell_penalty   = max(0.0, (req.dwellTime - 2.0) * 1.2)

        # 3. Departure delay propagation (60% carry-over to arrival)
        origin_carryover = req.departureDelay * 0.6

        # 4. Catch-up potential (simple speed cushion estimate)
        catchup_potential = self._estimate_catchup(req)

        total_delay = max(0, int(round(
            base_delay + tsr_penalty + signal_penalty +
            fog_penalty + dwell_penalty + origin_carryover - catchup_potential
        )))

        # 5. Confidence
        dep_hour = self._hhmm_to_min(req.departureTime) // 60
        is_peak  = (7 <= dep_hour <= 10 or 17 <= dep_hour <= 20)
        confidence = float(np.clip(
            0.94
            - (req.junctionCongestionLevel * 0.06)
            - (0.04 if "rain" in req.weatherCondition.lower() else 0)
            - (0.06 if req.fogVisibilityKm < 1.0 else 0)
            - (0.02 if len(req.activeTSRs) > 0 else 0)
            - (0.01 if req.signalAspect and req.signalAspect.aspect == "RED" else 0),
            0.72, 0.97
        ))

        delay_prob = float(np.clip(total_delay / 35.0 + 0.08, 0.05, 0.97))
        ci = self._confidence_interval(total_delay, req)

        expl = self._build_explainability(
            req, base_delay, tsr_penalty, signal_penalty,
            fog_penalty, weather_penalty, dwell_penalty, catchup_potential)

        model_label = ("GradientBoosting (suburban_gbr_model.joblib)"
                       if self._model else "Statistical Multi-Factor Regressor")

        return DelayPredictionResponse(
            predictedDelayMinutes=total_delay,
            arrivalWindow=(
                f"+{total_delay} to +{ci[1]:.0f} min"
                if total_delay > 0 else "On Time (±2 min)"
            ),
            confidenceScore=round(confidence, 2),
            confidenceIntervalMin=ci,
            delayProbability=round(delay_prob, 2),
            expectedDelay=(
                f"+{total_delay} minutes" if total_delay > 0 else "On Time"
            ),
            explainability=expl,
            catchUpPotentialMin=round(catchup_potential, 1),
            modelType=model_label,
        )

    def _estimate_catchup(self, req: DelayPredictionRequest) -> float:
        """
        Quick sectional catch-up estimate:
        If train is below its MPS, it can potentially recover time in
        high-speed sections ahead (rough heuristic — full engine in catch_up_optimizer.py).
        """
        if req.currentSpeed <= 0 or req.distanceKm <= 0:
            return 0.0
        # Assume MPS for line type
        mps_map = {
            "Main Line": 110.0, "Chord Line": 100.0,
            "Bangaon Line": 90.0, "Tarakeswar Line": 80.0,
            "South Line": 85.0, "Circular Railway": 70.0
        }
        mps = mps_map.get(req.line, 90.0)
        if req.currentSpeed >= mps * 0.95:
            return 0.0
        speed_deficit = mps - req.currentSpeed
        # Recoverable over remaining distance (assume 30% of dist at higher speed)
        effective_dist = req.distanceKm * 0.30
        scheduled_t = (effective_dist / mps) * 60
        current_t   = (effective_dist / req.currentSpeed) * 60
        return round(min(current_t - scheduled_t, 8.0), 1)  # cap at 8 min


# Singleton
eta_predictor = ETADelayPredictor()
