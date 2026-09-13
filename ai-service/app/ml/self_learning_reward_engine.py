"""
self_learning_reward_engine.py — Self-Learning Reward-Penalty ML Pipeline for Indian Railways ETA
==================================================================================================
Implements a continuous online reinforcement-style learning loop that:

  1. OBSERVES  — Receives real arrival feedback from live trains across India
  2. SCORES    — Computes reward (+) if prediction within 5-min threshold, penalty (-) otherwise
  3. UPDATES   — Adjusts per-station, per-route, per-hour, per-season bias weights via EMA
  4. RETRAINS  — Triggers periodic incremental XGBoost model weight update from accumulated data
  5. VALIDATES — Auto-validates model drift; rolls back if retrain degrades accuracy

Architecture:
  Live Train Arrives -> Actual Arrival Reported (via API)
         |
  RewardPenaltyScorer  ->  Score in {+1 REWARD, -1 PENALTY, 0 NEUTRAL}
         |
  FeedbackMemoryStore  ->  Rolling 30-day circular buffer (50k cap)
         |
  OnlineBiasCalibrator ->  EMA per (station, hour_bucket, season)
         |
  IncrementalModelTrainer -> XGBoost warm_start every 100 feedback events
         |
  ModelQualityGuard    ->  MAE/accuracy gate, auto-rollback

Self-reward thresholds (matches user requirement of 5-min latency max):
  |error| <= 5 min   ->  +1 REWARD   (accurate prediction, model weight reinforced)
  |error| 5-15 min   ->   0 NEUTRAL  (within acceptable tolerance, no update)
  |error| > 15 min   ->  -1 PENALTY  (bad prediction, model bias corrected aggressively)
"""

import os
import json
import math
import time
import pickle
import logging
import hashlib
import threading
from datetime import datetime, timedelta
from collections import deque, defaultdict
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path

import numpy as np

logger = logging.getLogger("SelfLearningRewardEngine")

# ---- Configuration Constants -----------------------------------------------

REWARD_THRESHOLD_MIN    = 5.0    # <= 5 min error -> REWARD
NEUTRAL_THRESHOLD_MIN   = 15.0   # 5-15 min error -> NEUTRAL (no penalty)
PENALTY_THRESHOLD_MIN   = 15.0   # > 15 min error -> PENALTY

# EMA learning rates (alpha values)
EMA_ALPHA_REWARD        = 0.08   # Gentle reinforcement of good station bias
EMA_ALPHA_PENALTY       = 0.25   # Aggressive correction on bad predictions
EMA_ALPHA_NEUTRAL       = 0.03   # Tiny drift correction

# Trigger incremental retrain after this many new feedback events
RETRAIN_TRIGGER_COUNT   = 100
# Rolling feedback memory buffer size (max events in RAM)
FEEDBACK_BUFFER_CAPACITY = 50_000
# Minimum data points required before retraining
MIN_RETRAIN_SAMPLES     = 50

# Persistence paths
MODEL_DIR = Path(__file__).parent / "models"
FEEDBACK_STORE_PATH = MODEL_DIR / "self_learning_feedback.jsonl"
BIAS_STORE_PATH     = MODEL_DIR / "bias_calibration.json"
MODEL_WEIGHTS_PATH  = MODEL_DIR / "eta_online_weights.pkl"
ROLLBACK_PATH       = MODEL_DIR / "eta_online_weights_rollback.pkl"


# ---- Score Labels -----------------------------------------------------------

class ScoreLabel:
    REWARD  = "REWARD"    # |error| <= 5 min
    NEUTRAL = "NEUTRAL"   # 5 < |error| <= 15 min
    PENALTY = "PENALTY"   # |error| > 15 min


# ---- 1. Reward / Penalty Scorer --------------------------------------------

class RewardPenaltyScorer:
    """
    Computes numeric reward/penalty score from prediction error.

    Score function:
      f(e) = +1.0 * (1 - e/5)       if |e| <= 5 min    (graded reward, max at e=0)
           =  0.0                    if 5 < |e| <= 15 min
           = -1.0 * (e - 15) / 45   if |e| > 15 min    (graded penalty, -1 at e=60)
    """

    @staticmethod
    def score(error_min: float) -> Tuple[float, str]:
        """
        Args:
            error_min: Signed error (actual_arrival - predicted_eta) in minutes.
        Returns:
            (numeric_score, label)
        """
        abs_err = abs(error_min)

        if abs_err <= REWARD_THRESHOLD_MIN:
            numeric = +(1.0 - abs_err / REWARD_THRESHOLD_MIN)
            return round(numeric, 4), ScoreLabel.REWARD

        elif abs_err <= NEUTRAL_THRESHOLD_MIN:
            return 0.0, ScoreLabel.NEUTRAL

        else:
            numeric = -min(1.0, (abs_err - NEUTRAL_THRESHOLD_MIN) / 45.0)
            return round(numeric, 4), ScoreLabel.PENALTY


# ---- 2. Feedback Memory Store -----------------------------------------------

class FeedbackMemoryStore:
    """
    Thread-safe rolling circular buffer for feedback events.
    Also persists to JSONL disk file for crash recovery and scheduled retraining.
    """

    def __init__(self, capacity: int = FEEDBACK_BUFFER_CAPACITY):
        self._buffer: deque = deque(maxlen=capacity)
        self._lock = threading.Lock()
        self._pending_persist: List[Dict] = []
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        self._load_persisted_feedback()

    def _load_persisted_feedback(self):
        """Load recent feedback from disk on startup (last 7 days)."""
        if not FEEDBACK_STORE_PATH.exists():
            return
        cutoff = datetime.utcnow() - timedelta(days=7)
        loaded = 0
        try:
            with open(FEEDBACK_STORE_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    d = json.loads(line)
                    rec_at_str = d.get("recorded_at", "2000-01-01T00:00:00")
                    rec_at = datetime.fromisoformat(rec_at_str.replace("Z", ""))
                    if rec_at >= cutoff:
                        self._buffer.append(d)
                        loaded += 1
            logger.info(f"[FeedbackStore] Loaded {loaded} records from disk (last 7 days).")
        except Exception as e:
            logger.warning(f"[FeedbackStore] Could not load persisted feedback: {e}")

    def add(self, record: Dict[str, Any]):
        """Add a new feedback record to memory and queue for persistence."""
        with self._lock:
            self._buffer.append(record)
            self._pending_persist.append(record)
        if len(self._pending_persist) >= 10:
            self._flush_to_disk()

    def _flush_to_disk(self):
        """Append pending records to the JSONL file."""
        with self._lock:
            to_write = list(self._pending_persist)
            self._pending_persist.clear()
        try:
            with open(FEEDBACK_STORE_PATH, "a", encoding="utf-8") as f:
                for d in to_write:
                    f.write(json.dumps(d, default=str) + "\n")
        except Exception as e:
            logger.warning(f"[FeedbackStore] Disk flush failed: {e}")

    def get_recent(self, n: int = 1000) -> List[Dict]:
        with self._lock:
            return list(self._buffer)[-n:]

    def get_by_station(self, station_code: str, n: int = 500) -> List[Dict]:
        with self._lock:
            all_recs = list(self._buffer)
        return [r for r in all_recs if r.get("station_code") == station_code][-n:]

    def total_count(self) -> int:
        with self._lock:
            return len(self._buffer)

    def reward_rate(self, last_n: int = 1000) -> float:
        recs = self.get_recent(last_n)
        if not recs:
            return 0.0
        rewards = sum(1 for r in recs if r.get("score_label") == ScoreLabel.REWARD)
        return round(rewards / len(recs), 4)

    def penalty_rate(self, last_n: int = 1000) -> float:
        recs = self.get_recent(last_n)
        if not recs:
            return 0.0
        penalties = sum(1 for r in recs if r.get("score_label") == ScoreLabel.PENALTY)
        return round(penalties / len(recs), 4)


# ---- 3. Online Bias Calibrator ----------------------------------------------

class OnlineBiasCalibrator:
    """
    Maintains per-key adaptive bias corrections using Exponential Moving Average.

    Bias dimensions:
      station_code             -> station-level bias
      station_code + hour      -> time-of-day bias (0-23)
      station_code + season    -> seasonal bias (WINTER/SUMMER/MONSOON)
      route_id                 -> route-level bias
      rake_type                -> rolling-stock bias
    """

    def __init__(self):
        self._biases: Dict[str, float] = {}
        self._update_counts: Dict[str, int] = defaultdict(int)
        self._lock = threading.Lock()
        self._load_from_disk()

    def _load_from_disk(self):
        if BIAS_STORE_PATH.exists():
            try:
                with open(BIAS_STORE_PATH, "r") as f:
                    data = json.load(f)
                    self._biases = data.get("biases", {})
                    self._update_counts = defaultdict(int, data.get("counts", {}))
                logger.info(f"[BiasCalibrator] Loaded {len(self._biases)} bias entries from disk.")
            except Exception as e:
                logger.warning(f"[BiasCalibrator] Could not load bias store: {e}")

    def _save_to_disk(self):
        try:
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            with open(BIAS_STORE_PATH, "w") as f:
                json.dump({
                    "biases": self._biases,
                    "counts": dict(self._update_counts),
                    "saved_at": datetime.utcnow().isoformat() + "Z"
                }, f, indent=2)
        except Exception as e:
            logger.warning(f"[BiasCalibrator] Could not save bias store: {e}")

    def _make_keys(self, station_code: str, hour_bucket: int, season: str,
                   route_id: str, rake_type: str) -> List[str]:
        return [
            f"station:{station_code}",
            f"station_hour:{station_code}:{hour_bucket}",
            f"station_season:{station_code}:{season}",
            f"route:{route_id}",
            f"rake:{rake_type}",
        ]

    def update(self, error_min: float, score_label: str, station_code: str,
               hour_bucket: int, season: str, route_id: str, rake_type: str):
        """Update EMA bias values for all keys based on prediction error and score label."""
        if score_label == ScoreLabel.REWARD:
            alpha = EMA_ALPHA_REWARD
        elif score_label == ScoreLabel.PENALTY:
            alpha = EMA_ALPHA_PENALTY
        else:
            alpha = EMA_ALPHA_NEUTRAL

        keys = self._make_keys(station_code, hour_bucket, season, route_id, rake_type)
        with self._lock:
            for key in keys:
                curr = self._biases.get(key, 0.0)
                self._biases[key] = round((1 - alpha) * curr + alpha * error_min, 3)
                self._update_counts[key] += 1

        total_updates = sum(self._update_counts.values())
        if total_updates % 50 == 0:
            self._save_to_disk()

    def get_bias(self, station_code: str, hour_bucket: int = 0, season: str = "ALL",
                 route_id: str = "", rake_type: str = "LHB_COACHING") -> float:
        """Returns weighted composite bias correction (minutes) for a prediction context."""
        weights = {
            f"station:{station_code}": 0.40,
            f"station_hour:{station_code}:{hour_bucket}": 0.25,
            f"station_season:{station_code}:{season}": 0.15,
            f"route:{route_id}": 0.12,
            f"rake:{rake_type}": 0.08,
        }
        with self._lock:
            composite = sum(self._biases.get(k, 0.0) * w for k, w in weights.items())
        return round(composite, 2)

    def get_all_biases(self) -> Dict[str, float]:
        with self._lock:
            return dict(self._biases)

    def bias_summary(self) -> Dict[str, Any]:
        with self._lock:
            total = len(self._biases)
            if total == 0:
                return {"total_keys": 0, "mean_abs_bias": 0.0, "max_abs_bias": 0.0}
            vals = list(self._biases.values())
        return {
            "total_keys": total,
            "mean_abs_bias": round(float(np.mean(np.abs(vals))), 3),
            "max_abs_bias": round(float(np.max(np.abs(vals))), 3),
            "mean_bias": round(float(np.mean(vals)), 3),
        }


# ---- 4. Incremental Model Trainer -------------------------------------------

class IncrementalModelTrainer:
    """
    Performs incremental (warm-start) retraining of the XGBoost ETA model
    using accumulated feedback data.

    Training strategy:
      - Labels: actual_arrival - scheduled_arrival (true delay residuals)
      - Features: station_sequence, distance_km, hour_bucket, day_of_week,
                  season_code, rake_type_code, tsr_active, incident_active,
                  fog_severity, preceding_delay_min, station_bias
      - Model: XGBoost with xgb_model warm-start parameter
      - Validation: 20% held-out recent data with MAE quality gate
      - Rollback: if new MAE > old MAE * 1.10, reject and keep old model
    """

    FEATURE_COLS = [
        "station_sequence", "distance_remaining_km", "hour_bucket",
        "day_of_week", "season_code", "rake_type_code",
        "tsr_active", "incident_active", "fog_severity",
        "preceding_delay_min", "station_bias"
    ]

    RAKE_TYPE_MAP = {
        "VANDE_BHARAT_TRAINSET": 0, "LHB_COACHING": 1,
        "ICF_COACHING": 2, "SUBURBAN_EMU_12CAR": 3, "FREIGHT_BOXN": 4
    }
    SEASON_MAP = {"WINTER": 0, "SUMMER": 1, "MONSOON": 2, "ALL": 3}

    def __init__(self, bias_calibrator: OnlineBiasCalibrator):
        self._bias_calibrator = bias_calibrator
        self._feedback_since_last_train = 0
        self._model = self._load_model()
        self._last_retrain_at: Optional[datetime] = None
        self._retrain_history: List[Dict] = []
        self._lock = threading.Lock()

    def _load_model(self):
        if MODEL_WEIGHTS_PATH.exists():
            try:
                with open(MODEL_WEIGHTS_PATH, "rb") as f:
                    model = pickle.load(f)
                logger.info("[IncrementalTrainer] Loaded existing model from disk.")
                return model
            except Exception as e:
                logger.warning(f"[IncrementalTrainer] Could not load model: {e}")
        return None

    def _extract_features(self, records: List[Dict]) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        X_rows, y_vals = [], []
        for r in records:
            try:
                station_seq = float(r.get("station_sequence") or 1)
                dist_rem    = float(r.get("distance_remaining_km") or 0.0)
                hour_b      = float(r.get("hour_bucket") or 0)
                rec_at_str  = r.get("recorded_at", datetime.utcnow().isoformat())
                day_w       = float(datetime.fromisoformat(rec_at_str.replace("Z", "")).weekday())
                season      = float(self.SEASON_MAP.get(r.get("season", "ALL"), 3))
                rake        = float(self.RAKE_TYPE_MAP.get(r.get("rake_type", "LHB_COACHING"), 1))
                tsr_active  = float(bool(r.get("tsr_active", False)))
                inc_active  = float(bool(r.get("incident_active", False)))
                fog_vis     = float(r.get("fog_visibility_km") or 10.0)
                fog_sev     = 1.0 if fog_vis < 0.1 else (0.5 if fog_vis < 0.5 else 0.0)
                prec_delay  = float(r.get("preceding_delay_min") or 0.0)
                stn_bias    = self._bias_calibrator.get_bias(
                    station_code=r.get("station_code", ""),
                    hour_bucket=int(hour_b),
                    season=r.get("season", "ALL"),
                    route_id=r.get("route_id", ""),
                    rake_type=r.get("rake_type", "LHB_COACHING")
                )
                X_rows.append([station_seq, dist_rem, hour_b, day_w, season, rake,
                                tsr_active, inc_active, fog_sev, prec_delay, stn_bias])
                y_vals.append(float(r.get("error_minutes") or 0.0))
            except Exception as e:
                logger.debug(f"[IncrementalTrainer] Skipping record: {e}")
                continue

        if len(X_rows) < MIN_RETRAIN_SAMPLES:
            return None, None
        return np.array(X_rows, dtype=np.float32), np.array(y_vals, dtype=np.float32)

    def notify_new_feedback(self):
        with self._lock:
            self._feedback_since_last_train += 1
            should_retrain = self._feedback_since_last_train >= RETRAIN_TRIGGER_COUNT

        if should_retrain:
            threading.Thread(target=self._async_retrain, daemon=True).start()

    def _async_retrain(self):
        """Background retraining thread — never blocks the main prediction API."""
        logger.info("[IncrementalTrainer] Starting incremental retrain...")
        with self._lock:
            self._feedback_since_last_train = 0

        recent_records = []
        if FEEDBACK_STORE_PATH.exists():
            cutoff = datetime.utcnow() - timedelta(days=30)
            try:
                with open(FEEDBACK_STORE_PATH, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        d = json.loads(line)
                        rec_at_str = d.get("recorded_at", "2000-01-01T00:00:00")
                        rec_at = datetime.fromisoformat(rec_at_str.replace("Z", ""))
                        if rec_at >= cutoff:
                            recent_records.append(d)
            except Exception as e:
                logger.error(f"[IncrementalTrainer] Failed to load feedback: {e}")
                return

        X, y = self._extract_features(recent_records)
        if X is None:
            logger.info(f"[IncrementalTrainer] Not enough samples. Skipping retrain.")
            return

        split = max(MIN_RETRAIN_SAMPLES, int(len(X) * 0.8))
        X_train, y_train = X[:split], y[:split]
        X_val, y_val = X[split:], y[split:]

        try:
            import xgboost as xgb

            dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=self.FEATURE_COLS)
            dval   = xgb.DMatrix(X_val,   label=y_val,   feature_names=self.FEATURE_COLS)

            params = {
                "objective": "reg:squarederror",
                "max_depth": 6,
                "eta": 0.05,
                "subsample": 0.8,
                "colsample_bytree": 0.9,
                "min_child_weight": 3,
                "gamma": 0.1,
                "eval_metric": "mae",
                "tree_method": "hist",
                "seed": 42,
            }

            num_rounds = 30 if self._model is None else 15
            new_model = xgb.train(
                params=params,
                dtrain=dtrain,
                num_boost_round=num_rounds,
                xgb_model=self._model,
                evals=[(dval, "validation")],
                early_stopping_rounds=5,
                verbose_eval=False,
            )

            mae_old = None
            mae_new = None

            if len(X_val) >= 10:
                y_pred_new = new_model.predict(dval)
                mae_new = float(np.mean(np.abs(y_pred_new - y_val)))

                if self._model is not None:
                    y_pred_old = self._model.predict(dval)
                    mae_old = float(np.mean(np.abs(y_pred_old - y_val)))

                    if mae_new > mae_old * 1.10:
                        logger.warning(
                            f"[IncrementalTrainer] ROLLBACK: New MAE {mae_new:.2f} > Old MAE {mae_old:.2f}. Keeping old model."
                        )
                        with self._lock:
                            self._retrain_history.append({
                                "timestamp": datetime.utcnow().isoformat() + "Z",
                                "outcome": "ROLLBACK",
                                "mae_new": round(mae_new, 3),
                                "mae_old": round(mae_old, 3),
                                "training_samples": int(split)
                            })
                        return

                logger.info(f"[IncrementalTrainer] Retrain ACCEPTED. MAE: {mae_new:.2f} min")
            else:
                logger.info("[IncrementalTrainer] Retrain ACCEPTED (no validation split).")

            # Save rollback copy
            if self._model is not None and MODEL_WEIGHTS_PATH.exists():
                import shutil
                shutil.copy2(MODEL_WEIGHTS_PATH, ROLLBACK_PATH)

            with open(MODEL_WEIGHTS_PATH, "wb") as f:
                pickle.dump(new_model, f)

            with self._lock:
                self._model = new_model
                self._last_retrain_at = datetime.utcnow()
                self._retrain_history.append({
                    "timestamp": self._last_retrain_at.isoformat() + "Z",
                    "outcome": "ACCEPTED",
                    "mae_new": round(mae_new, 3) if mae_new else None,
                    "mae_old": round(mae_old, 3) if mae_old else None,
                    "training_samples": int(split),
                    "validation_samples": len(X_val)
                })

        except ImportError:
            logger.warning("[IncrementalTrainer] XGBoost not found. Using NumPy Ridge fallback.")
            self._numpy_fallback_retrain(X_train, y_train, X_val, y_val)
        except Exception as e:
            logger.error(f"[IncrementalTrainer] Retrain failed: {e}", exc_info=True)

    def _numpy_fallback_retrain(self, X_train, y_train, X_val, y_val):
        """Ridge regression fallback for resource-constrained deployments."""
        try:
            lam = 1.0
            A = X_train.T @ X_train + lam * np.eye(X_train.shape[1])
            b = X_train.T @ y_train
            w = np.linalg.solve(A, b)
            y_pred = X_val @ w
            mae = float(np.mean(np.abs(y_pred - y_val)))
            logger.info(f"[IncrementalTrainer] Ridge fallback MAE: {mae:.2f} min")
            with self._lock:
                self._model = {"type": "ridge", "weights": w.tolist(), "feature_cols": self.FEATURE_COLS}
                self._last_retrain_at = datetime.utcnow()
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            with open(MODEL_WEIGHTS_PATH, "wb") as f:
                pickle.dump(self._model, f)
        except Exception as e:
            logger.error(f"[IncrementalTrainer] Ridge fallback failed: {e}")

    def predict_residual(self, features: Dict[str, float]) -> float:
        """Returns ML-predicted delay residual (minutes) for a given feature dict."""
        with self._lock:
            model = self._model
        if model is None:
            return 0.0
        try:
            row = np.array([[
                features.get("station_sequence", 1),
                features.get("distance_remaining_km", 0.0),
                features.get("hour_bucket", 0),
                features.get("day_of_week", 0),
                features.get("season_code", 3),
                features.get("rake_type_code", 1),
                features.get("tsr_active", 0),
                features.get("incident_active", 0),
                features.get("fog_severity", 0),
                features.get("preceding_delay_min", 0.0),
                features.get("station_bias", 0.0),
            ]], dtype=np.float32)

            if isinstance(model, dict) and model.get("type") == "ridge":
                w = np.array(model["weights"])
                return float(row[0] @ w)

            import xgboost as xgb
            dtest = xgb.DMatrix(row, feature_names=self.FEATURE_COLS)
            return float(model.predict(dtest)[0])
        except Exception as e:
            logger.warning(f"[IncrementalTrainer] Residual prediction failed: {e}")
            return 0.0

    def status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "model_loaded": self._model is not None,
                "feedback_since_last_train": self._feedback_since_last_train,
                "retrain_trigger_at": RETRAIN_TRIGGER_COUNT,
                "last_retrain_at": self._last_retrain_at.isoformat() + "Z" if self._last_retrain_at else None,
                "retrain_history": self._retrain_history[-5:],
            }


# ---- 5. Self-Learning Reward Engine (Facade) --------------------------------

class SelfLearningRewardEngine:
    """
    Main facade orchestrating the complete self-learning loop.

    Call record_arrival_feedback() every time a real train arrives at a station.
    The engine automatically:
      - Scores the prediction (REWARD/NEUTRAL/PENALTY)
      - Updates adaptive bias per station/route/hour/season
      - Triggers incremental XGBoost retraining in the background every 100 events
      - Exposes system health metrics and per-station bias corrections
    """

    def __init__(self):
        self._scorer = RewardPenaltyScorer()
        self._store = FeedbackMemoryStore()
        self._bias = OnlineBiasCalibrator()
        self._trainer = IncrementalModelTrainer(self._bias)
        logger.info("[SelfLearningRewardEngine] Initialized. Self-learning pipeline ACTIVE.")

    @staticmethod
    def _detect_season() -> str:
        month = datetime.utcnow().month
        if month in (11, 12, 1, 2):
            return "WINTER"
        elif month in (3, 4, 5, 6):
            return "SUMMER"
        else:
            return "MONSOON"

    @staticmethod
    def _time_to_minutes(t_str: str) -> float:
        try:
            t_str = t_str.strip()
            if "T" in t_str:
                dt = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
                return dt.hour * 60 + dt.minute
            parts = t_str.split(":")
            return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            return 0.0

    def record_arrival_feedback(
        self,
        train_number: str,
        station_code: str,
        scheduled_arr: str,
        predicted_eta: str,
        actual_arrival: str,
        route_id: str = "",
        rake_type: str = "LHB_COACHING",
        station_sequence: int = 1,
        distance_remaining_km: float = 0.0,
        fog_visibility_km: float = 10.0,
        incident_active: bool = False,
        tsr_active: bool = False,
        preceding_delay_min: float = 0.0,
        hour_bucket: Optional[int] = None,
        season: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Core feedback API. Called every time a train arrives at a station.

        Steps:
          1. Compute signed error = actual_arrival - predicted_eta (minutes)
          2. Score: REWARD if |error| <= 5 min, PENALTY if > 15 min, else NEUTRAL
          3. Store in rolling 50k-capacity memory buffer + JSONL disk
          4. Update EMA bias for station/hour/season/route/rake
          5. Notify trainer (triggers async XGBoost retrain every 100 events)
          6. Return full scored report
        """
        now = datetime.utcnow()
        _hour = hour_bucket if hour_bucket is not None else now.hour
        _season = season or self._detect_season()

        pred_min = self._time_to_minutes(predicted_eta)
        act_min  = self._time_to_minutes(actual_arrival)
        error_min = act_min - pred_min

        score, score_label = self._scorer.score(error_min)

        event_id = hashlib.md5(
            f"{train_number}-{station_code}-{actual_arrival}-{now.isoformat()}".encode()
        ).hexdigest()[:12]

        record = {
            "event_id": event_id,
            "train_number": train_number,
            "station_code": station_code,
            "station_sequence": station_sequence,
            "scheduled_arr": scheduled_arr,
            "predicted_eta": predicted_eta,
            "actual_arrival": actual_arrival,
            "error_minutes": round(error_min, 2),
            "score": score,
            "score_label": score_label,
            "hour_bucket": _hour,
            "season": _season,
            "rake_type": rake_type,
            "route_id": route_id,
            "fog_visibility_km": fog_visibility_km,
            "incident_active": incident_active,
            "tsr_active": tsr_active,
            "preceding_delay_min": preceding_delay_min,
            "distance_remaining_km": distance_remaining_km,
            "recorded_at": now.isoformat()
        }

        self._store.add(record)
        self._bias.update(error_min, score_label, station_code, _hour, _season, route_id, rake_type)
        self._trainer.notify_new_feedback()

        emoji = "REWARD" if score_label == ScoreLabel.REWARD else (
            "NEUTRAL" if score_label == ScoreLabel.NEUTRAL else "PENALTY")
        logger.info(
            f"[{train_number}@{station_code}] Error: {error_min:+.1f}min | "
            f"Score: {score:+.3f} ({emoji}) | "
            f"Bias: {self._bias.get_bias(station_code, _hour, _season, route_id, rake_type):+.2f}min"
        )

        return {
            "event_id": event_id,
            "train_number": train_number,
            "station_code": station_code,
            "error_minutes": round(error_min, 2),
            "abs_error_minutes": round(abs(error_min), 2),
            "score": score,
            "score_label": score_label,
            "calibrated_bias_minutes": self._bias.get_bias(station_code, _hour, _season, route_id, rake_type),
            "system_accuracy": {
                "reward_rate_last_1000": self._store.reward_rate(1000),
                "penalty_rate_last_1000": self._store.penalty_rate(1000),
                "total_feedback_events": self._store.total_count(),
            },
            "bias_summary": self._bias.bias_summary(),
            "trainer_status": self._trainer.status(),
            "recorded_at": now.isoformat() + "Z",
        }

    def get_bias_correction(self, station_code: str, hour_bucket: int = 0,
                             season: str = "ALL", route_id: str = "",
                             rake_type: str = "LHB_COACHING") -> float:
        """Returns composite bias correction (minutes) for a given prediction context."""
        return self._bias.get_bias(station_code, hour_bucket, season, route_id, rake_type)

    def predict_ml_residual(self, features: Dict[str, float]) -> float:
        """Returns ML model's predicted delay residual for given features."""
        return self._trainer.predict_residual(features)

    def system_health(self) -> Dict[str, Any]:
        """Returns overall self-learning engine health metrics."""
        return {
            "reward_rate_last_1000": self._store.reward_rate(1000),
            "penalty_rate_last_1000": self._store.penalty_rate(1000),
            "total_feedback_events": self._store.total_count(),
            "bias_summary": self._bias.bias_summary(),
            "trainer_status": self._trainer.status(),
            "thresholds": {
                "reward_threshold_min": REWARD_THRESHOLD_MIN,
                "neutral_threshold_min": NEUTRAL_THRESHOLD_MIN,
                "retrain_trigger_count": RETRAIN_TRIGGER_COUNT,
                "feedback_buffer_capacity": FEEDBACK_BUFFER_CAPACITY,
            },
        }


# ---- Singleton --------------------------------------------------------------

self_learning_engine = SelfLearningRewardEngine()
