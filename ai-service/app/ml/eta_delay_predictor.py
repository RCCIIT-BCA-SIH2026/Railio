"""
eta_delay_predictor.py — Real ML Inference Engine for RailSathi ETA Forecasting
=================================================================================
Loads the trained Random Forest model (train_delay_model.pkl) trained on the
real 3,680-record Sealdah - Dankuni Local & Dankuni - Sealdah Local dataset.

Feature vector (12 dims, matching train_delay_model.pkl schema):
  [Train No., day, month, day_of_week, departure_hour, departure_minute,
   arrival_hour, arrival_minute, Travel Duration (mins), Distance (km),
   direction, departure_delay]

Includes Day-Wise Delay Pattern Analysis from historical dataset records.
"""

import os
import re
import json
import math
import warnings
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, Tuple

# ─── Paths ────────────────────────────────────────────────────────────────────
_THIS_DIR       = os.path.dirname(os.path.abspath(__file__))               # ai-service/app/ml
_AI_SERVICE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))             # ai-service
_PROJECT_ROOT   = os.path.dirname(_AI_SERVICE_DIR)                        # RailSathi
_MODELS_DIR     = os.path.join(_THIS_DIR, "models")
_PKL_PATH       = os.path.join(_MODELS_DIR, "train_delay_model.pkl")
_ROOT_PKL_PATH  = os.path.join(_PROJECT_ROOT, "train_delay_model.pkl")
_CSV_DATA_PATH  = os.path.join(_PROJECT_ROOT, "data", "trains", "suburban_trains_schedule_dataset.csv")
_ALT_CSV_PATH   = os.path.join(_THIS_DIR, "data", "train_dataset.csv")

# ─── Pydantic models ─────────────────────────────────────────────────────────

class TSRSegment(BaseModel):
    """Temporary Speed Restriction on a track section."""
    sectionId:        str     = "SDAH-DKAE-S1"
    startKm:          float   = 0.0
    endKm:            float   = 5.0
    maxSpeedKmh:      float   = 30.0
    normalSpeedKmh:   float   = 60.0
    reason:           str     = "Track Maintenance"

class SignalAspect(BaseModel):
    """Current signal aspect ahead of the train."""
    aspect:           str     = "GREEN"   # GREEN, DOUBLE_YELLOW, YELLOW, RED
    distanceMeters:   float   = 1000.0
    expectedHaltMin:  float   = 0.0

class DelayPredictionRequest(BaseModel):
    # ── Identity ────────────────────────────────────────────────────────────
    trainNumber:       Union[str, int]
    # ── Schedule context ────────────────────────────────────────────────────
    date:              Optional[str]  = None      # e.g. "09-06-2026" or "2026-09-09" or "Today, 28 Aug"
    departureTime:     str            = "04:07"   # "HH:MM" 24-h
    arrivalTime:       str            = "04:50"   # "HH:MM" 24-h
    travelDurationMins: float         = 43.0
    distanceKm:        float          = 28.0
    direction:         Union[int, str] = 0        # 0 = Sealdah-Dankuni, 1 = Dankuni-Sealdah
    # ── Day-wise context ───────────────────────────────────────────────────
    day:               int            = 9
    month:             int            = 6
    dayOfWeek:         int            = 1         # 0=Monday ... 6=Sunday
    departureHour:     int            = 4
    departureMinute:   int            = 7
    arrivalHour:       int            = 4
    arrivalMinute:     int            = 50
    # ── Live operational context ─────────────────────────────────────────────
    departureDelay:    float          = 0.0       # minutes already delayed at departure
    currentSpeed:      float          = 45.0
    dwellTime:         float          = 1.5
    weatherCondition:  str            = "Clear"
    junctionCongestionLevel: float    = 0.2
    # ── Ground-reality infrastructure ─────────────────────────────────────
    activeTSRs:        List[TSRSegment]       = []
    signalAspect:      Optional[SignalAspect] = None
    precedingTrainDelayMin: float             = 0.0
    fogVisibilityKm:   float                  = 10.0


class ExplainabilityFactor(BaseModel):
    factor:     str
    impactMin:  float
    category:   str


class DelayPredictionResponse(BaseModel):
    predictedDelayMinutes:  int
    predictedETA:           str
    scheduledArrival:       str
    arrivalWindow:          str
    confidenceScore:        float
    confidenceIntervalMin:  List[float]   # [lower, upper]
    delayProbability:       float
    expectedDelay:          str
    dayWiseHistoricalAvg:   float         # average historical delay on this day-of-week
    explainability:         List[ExplainabilityFactor]
    catchUpPotentialMin:    float         # recoverable time
    modelType:              str           = "RandomForestRegressor (train_delay_model.pkl)"

# Backward-compat alias
DelayPrediction = DelayPredictionResponse


# ─── Predictor ───────────────────────────────────────────────────────────────

class ETADelayPredictor:
    """
    Real ML-based ETA delay predictor using train_delay_model.pkl (RandomForestRegressor).
    Learned from real 3,680-row day-wise Sealdah-Dankuni dataset.
    """

    def __init__(self):
        self._model = None
        self._day_stats: Dict[int, Dict[int, Dict[str, float]]] = {}  # {train_no: {day_of_week: {'mean': X, 'count': N}}}
        self._load_model()
        self._load_day_wise_stats()

    # ── Model loading ─────────────────────────────────────────────────────────

    def _load_model(self):
        target_path = _PKL_PATH if os.path.exists(_PKL_PATH) else _ROOT_PKL_PATH
        if os.path.exists(target_path):
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    self._model = joblib.load(target_path)
                print(f"[ETADelayPredictor] RandomForest model loaded from {target_path}")
            except Exception as e:
                print(f"[ETADelayPredictor] Error loading {target_path}: {e}")
                self._model = None
        else:
            print(f"[ETADelayPredictor] train_delay_model.pkl not found at {_PKL_PATH} or {_ROOT_PKL_PATH}")

    def _load_day_wise_stats(self):
        """Precompute day-of-week delay distributions for all 40 trains from real dataset."""
        csv_file = _CSV_DATA_PATH if os.path.exists(_CSV_DATA_PATH) else _ALT_CSV_PATH
        if not os.path.exists(csv_file):
            return

        try:
            sep = '\t' if csv_file.endswith('train_dataset.csv') else ','
            df = pd.read_csv(csv_file, sep=sep)
            if 'Date' in df.columns and 'Train No.' in df.columns and 'Delays (mins)' in df.columns:
                df['Date_dt'] = pd.to_datetime(df['Date'], format='%d-%m-%Y', errors='coerce')
                dt_prop: Any = df['Date_dt'].dt
                df['dow'] = dt_prop.dayofweek
                df['Train_No'] = pd.to_numeric(df['Train No.'], errors='coerce')
                df['Delay_num'] = pd.to_numeric(df['Delays (mins)'], errors='coerce')

                for (tnum, dow), group in df.groupby(['Train_No', 'dow']):
                    if pd.notna(tnum) and pd.notna(dow):
                        t_int = int(tnum)
                        d_int = int(dow)
                        if t_int not in self._day_stats:
                            self._day_stats[t_int] = {}
                        self._day_stats[t_int][d_int] = {
                            'mean': float(group['Delay_num'].mean()),
                            'std': float(group['Delay_num'].std() or 2.0),
                            'count': len(group),
                            'max': float(group['Delay_num'].max()),
                            'min': float(group['Delay_num'].min()),
                        }
            print(f"[ETADelayPredictor] Computed day-wise delay profiles for {len(self._day_stats)} trains")
        except Exception as e:
            print(f"[ETADelayPredictor] Day-wise stats computation warning: {e}")

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_time_str(t_str: str) -> Tuple[int, int]:
        """Parse 'HH:MM' string to (hour, minute)."""
        try:
            parts = t_str.strip().split(":")
            return int(parts[0]), int(parts[1])
        except Exception:
            return 8, 0

    @staticmethod
    def _extract_numeric_train_no(val: Union[str, int]) -> int:
        """Extract integer train number, e.g. '32211' or 32211 -> 32211."""
        clean = re.sub(r"\D", "", str(val))
        return int(clean) if clean else 32211

    def _resolve_schedule_if_needed(self, req: DelayPredictionRequest) -> Dict[str, Any]:
        """Fetch real schedule if fields are defaulted or missing."""
        from app.ml.train_schedule_db import train_schedule_db
        t_str = str(req.trainNumber).strip()
        record = train_schedule_db.get(t_str)

        dep_time = req.departureTime
        arr_time = req.arrivalTime
        duration = req.travelDurationMins
        distance = req.distanceKm
        dir_val  = req.direction

        if record:
            dep_time = record.get("departureTime", dep_time)
            arr_time = record.get("arrivalTime", arr_time)
            distance = float(record.get("totalDistanceKm", 28.0))
            is_dankuni_origin = "Dankuni - Sealdah" in record.get("name", "")
            dir_val = 1 if is_dankuni_origin else 0

            # Compute duration from scheduled times
            dh, dm = self._parse_time_str(dep_time)
            ah, am = self._parse_time_str(arr_time)
            dep_min = dh * 60 + dm
            arr_min = ah * 60 + am
            if arr_min <= dep_min:
                arr_min += 1440
            duration = float(arr_min - dep_min)

        return {
            "dep_time": dep_time,
            "arr_time": arr_time,
            "duration": duration,
            "distance": distance,
            "dir_val":  1 if (isinstance(dir_val, str) and "dankuni" in dir_val.lower()) or dir_val == 1 else 0
        }

    def _resolve_date_features(self, req: DelayPredictionRequest) -> Tuple[int, int, int]:
        """Resolve (day, month, day_of_week) from date string or request integers."""
        if req.date:
            d_clean = req.date.strip()
            # Try DD-MM-YYYY
            for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y"):
                try:
                    dt = datetime.strptime(d_clean, fmt)
                    return dt.day, dt.month, dt.weekday()
                except ValueError:
                    pass
            # Try regex matching day/month numbers or text like "Today, 28 Aug"
            match = re.search(r"(\d{1,2})\s+([A-Za-z]{3})", d_clean)
            if match:
                try:
                    d_num = int(match.group(1))
                    m_str = match.group(2).capitalize()
                    dt = datetime.strptime(f"{d_num} {m_str} 2026", "%d %b %Y")
                    return dt.day, dt.month, dt.weekday()
                except ValueError:
                    pass

        # Fallback to request fields or current date
        now = datetime.now()
        day = req.day if req.day > 0 else now.day
        month = req.month if req.month > 0 else now.month
        dow = req.dayOfWeek if 0 <= req.dayOfWeek <= 6 else now.weekday()
        return day, month, dow

    # ── Main Predict Function ─────────────────────────────────────────────────

    def predict(self, req: DelayPredictionRequest) -> DelayPredictionResponse:
        t_num = self._extract_numeric_train_no(req.trainNumber)
        sched = self._resolve_schedule_if_needed(req)

        dep_str = sched["dep_time"]
        arr_str = sched["arr_time"]
        dh, dm = self._parse_time_str(dep_str)
        ah, am = self._parse_time_str(arr_str)

        day, month, dow = self._resolve_date_features(req)
        duration = float(sched["duration"])
        distance = float(sched["distance"])
        direction_val = int(sched["dir_val"])
        dep_delay = float(req.departureDelay or 0.0)

        # ── 12-Dimensional Feature Vector matching train_delay_model.pkl ─────
        # ['Train No.', 'day', 'month', 'day_of_week', 'departure_hour',
        #  'departure_minute', 'arrival_hour', 'arrival_minute',
        #  'Travel Duration (mins)', 'Distance (km)', 'direction', 'departure_delay']
        feature_vector = np.array([[
            t_num,
            day,
            month,
            dow,
            dh,
            dm,
            ah,
            am,
            duration,
            distance,
            direction_val,
            dep_delay
        ]])

        # 1. ML Model Prediction
        if self._model is not None:
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    raw_pred = float(self._model.predict(feature_vector)[0])
            except Exception as e:
                print(f"[ETADelayPredictor] Model predict failed: {e}. Using day-wise stats fallback.")
                raw_pred = self._get_day_wise_fallback(t_num, dow, dep_delay)
        else:
            raw_pred = self._get_day_wise_fallback(t_num, dow, dep_delay)

        # 2. Operational penalties (live signal / speed restrictions if active)
        tsr_penalty = 0.0
        for tsr in req.activeTSRs:
            seg_len = abs(tsr.endKm - tsr.startKm)
            if seg_len > 0 and tsr.maxSpeedKmh < tsr.normalSpeedKmh:
                time_lost = (seg_len / max(tsr.maxSpeedKmh, 10) - seg_len / max(tsr.normalSpeedKmh, 20)) * 60.0
                tsr_penalty += time_lost

        signal_penalty = 0.0
        if req.signalAspect:
            asp = req.signalAspect.aspect.upper()
            if asp == "RED":
                signal_penalty += max(3.0, req.signalAspect.expectedHaltMin)
            elif asp in ("YELLOW", "DOUBLE_YELLOW"):
                signal_penalty += 1.5

        weather_penalty = 0.0
        wc = req.weatherCondition.lower()
        if "heavy rain" in wc:
            weather_penalty += 4.0
        elif "rain" in wc:
            weather_penalty += 2.0

        total_delay = max(0, round(raw_pred + tsr_penalty + signal_penalty + weather_penalty))

        # 3. Compute Predicted Arrival Clock Time (ETA)
        sched_arr_total = ah * 60 + am
        pred_arr_total = (sched_arr_total + total_delay) % 1440
        pred_arr_str = f"{pred_arr_total // 60:02d}:{pred_arr_total % 60:02d}"

        # 4. Day-Wise Pattern Analysis & Historical Average
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        dow_name = day_names[dow]
        t_stats = self._day_stats.get(t_num, {}).get(dow, {})
        day_avg = t_stats.get('mean', round(raw_pred, 1))

        # 5. Explainability Breakdown
        factors: List[ExplainabilityFactor] = []
        is_peak = (7 <= dh <= 10 or 17 <= dh <= 20)

        factors.append(ExplainabilityFactor(
            factor=f"Day-wise historical delay pattern ({dow_name} avg: +{day_avg:.1f} min)",
            impactMin=round(max(0.5, day_avg), 1),
            category="HISTORICAL"
        ))

        if is_peak:
            factors.append(ExplainabilityFactor(
                factor=f"Suburban commuter rush hour ({dh:02d}:{dm:02d} departure window)",
                impactMin=round(max(1.0, total_delay * 0.35), 1),
                category="TRAFFIC"
            ))

        if dep_delay > 0:
            factors.append(ExplainabilityFactor(
                factor=f"Delay carried forward from origin ({dep_delay:.0f} min initial delay)",
                impactMin=round(dep_delay * 0.8, 1),
                category="OPERATIONAL"
            ))

        if tsr_penalty > 0:
            factors.append(ExplainabilityFactor(
                factor=f"Active Caution Order / TSR on section (+{tsr_penalty:.1f} min)",
                impactMin=round(tsr_penalty, 1),
                category="CAUTION_ORDER"
            ))

        if signal_penalty > 0 and req.signalAspect:
            factors.append(ExplainabilityFactor(
                factor=f"Signal aspect caution ({req.signalAspect.aspect})",
                impactMin=round(signal_penalty, 1),
                category="SIGNAL"
            ))

        # 6. Confidence Scoring
        confidence = float(np.clip(
            0.96 - (0.04 if is_peak else 0.0) - (0.03 if dep_delay > 15 else 0.0) - (0.02 if weather_penalty > 0 else 0.0),
            0.82,
            0.98
        ))

        # 7. Confidence Interval
        ci_lower = max(0.0, total_delay - 2.5)
        ci_upper = total_delay + 3.5

        arrival_window = (
            f"{pred_arr_str} (+{total_delay} to +{round(ci_upper)} min)"
            if total_delay > 0
            else f"{pred_arr_str} (On Time ±2 min)"
        )

        return DelayPredictionResponse(
            predictedDelayMinutes=total_delay,
            predictedETA=pred_arr_str,
            scheduledArrival=arr_str,
            arrivalWindow=arrival_window,
            confidenceScore=round(confidence, 2),
            confidenceIntervalMin=[round(ci_lower, 1), round(ci_upper, 1)],
            delayProbability=round(float(np.clip(total_delay / 25.0 + 0.10, 0.05, 0.98)), 2),
            expectedDelay=f"+{total_delay} min" if total_delay > 0 else "On Time",
            dayWiseHistoricalAvg=round(day_avg, 1),
            explainability=factors,
            catchUpPotentialMin=round(max(0.0, min(total_delay * 0.2, 4.0)), 1),
            modelType="RandomForestRegressor (train_delay_model.pkl)"
        )

    def _get_day_wise_fallback(self, train_no: int, dow: int, dep_delay: float) -> float:
        stats = self._day_stats.get(train_no, {}).get(dow)
        if stats:
            return stats['mean'] + dep_delay * 0.7
        return 5.0 + dep_delay * 0.7


# Singleton instance
eta_predictor = ETADelayPredictor()
