"""
TrainScheduleDB — loads suburban_trains.json once and provides lookup helpers.
Used by the delay predictor to fetch real schedule data for any train number.

STRICT DATASET-ONLY MODE:
  All station resolution uses DATASET_STATION_ALIASES which maps human names
  → actual codes present in suburban_trains.json.
  No LLM knowledge or hardcoded fallback trains are used.
"""
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

# Indian Standard Time (IST, UTC+05:30)
IST_TZ = timezone(timedelta(hours=5, minutes=30))

def get_ist_now(ref_time: Any = None) -> datetime:
    """
    Guarantees the returned datetime is strictly in Indian Standard Time (IST, UTC+05:30).
    Properly converts UTC ISO strings (e.g. from JS new Date().toISOString()) to IST.
    """
    if isinstance(ref_time, datetime):
        if ref_time.tzinfo is None:
            return ref_time.replace(tzinfo=IST_TZ)
        return ref_time.astimezone(IST_TZ)

    if isinstance(ref_time, str) and ref_time.strip():
        try:
            clean_ts = ref_time.strip().replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=IST_TZ)
            return dt.astimezone(IST_TZ)
        except Exception as e:
            pass

    # Default to current real-time UTC converted to IST
    return datetime.now(timezone.utc).astimezone(IST_TZ)

# Resolve path: ai-service/app/ml/ → up 3 dirs → project root → data/trains/suburban_trains.json
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))          # ai-service/app/ml/
_AI_SERVICE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))  # ai-service/
_PROJECT_ROOT = os.path.dirname(_AI_SERVICE_DIR)               # RailSathi/
_DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "trains", "suburban_trains.json")


# ─────────────────────────────────────────────────────────────────────────────
# DATASET STATION ALIASES
# Maps every known human-readable name / Bengali / Banglish / alternate spelling
# → canonical station code that actually exists in suburban_trains.json.
#
# ONLY codes present in the dataset are listed here.
# Do NOT add cities outside this dataset (no Delhi, Patna, Mumbai, etc.)
# ─────────────────────────────────────────────────────────────────────────────
DATASET_STATION_ALIASES: Dict[str, str] = {
    # ── Sealdah (SDAH) ──────────────────────────────────────────────────────
    "sealdah":              "SDAH",
    "sealda":               "SDAH",
    "sdah":                 "SDAH",
    "sealdaha":             "SDAH",
    "syaldah":              "SDAH",
    "শিয়ালদা":             "SDAH",
    "শিয়ালদহ":             "SDAH",
    "শিয়ালদা স্টেশন":    "SDAH",

    # ── Bidhan Nagar Road (BNXR) ─────────────────────────────────────────────
    "bidhan nagar road":    "BNXR",
    "bidhannagar road":     "BNXR",
    "bidhan nagar":         "BNXR",
    "bidhannagar":          "BNXR",
    "bnxr":                 "BNXR",
    "বিধাননগর রোড":         "BNXR",
    "বিধাননগর":             "BNXR",

    # ── Dum Dum Junction (DDJ) ──────────────────────────────────────────────
    "dum dum junction":     "DDJ",
    "dum dum jn":           "DDJ",
    "dum dum":              "DDJ",
    "dumdum":               "DDJ",
    "ddj":                  "DDJ",
    "দমদম জংশন":            "DDJ",
    "দমদম":                 "DDJ",

    # ── Baranagar Road (BARN) ───────────────────────────────────────────────
    "baranagar road":       "BARN",
    "baranagar":            "BARN",
    "barn":                 "BARN",
    "বরাহনগর রোড":          "BARN",
    "বরানগর রোড":           "BARN",
    "বরানগর":               "BARN",

    # ── Dakshineswar (DAKE) ─────────────────────────────────────────────────
    "dakshineswar":         "DAKE",
    "dakshineshwar":        "DAKE",
    "dake":                 "DAKE",
    "দক্ষিণেশ্বর":          "DAKE",

    # ── Dankuni (DKAE) ──────────────────────────────────────────────────────
    "dankuni":              "DKAE",
    "dankuni junction":     "DKAE",
    "dankuni jn":           "DKAE",
    "dkae":                 "DKAE",
    "ডানকুনি":              "DKAE",
    "dankuani":             "DKAE",
}

# All valid dataset codes (for fast lookup)
VALID_DATASET_CODES = set(DATASET_STATION_ALIASES.values())


def resolve_station_code(name: str) -> Optional[str]:
    """
    Resolve a human-readable station name (any language/script) to its
    actual dataset station code (e.g. "Sealdah" → "SDAH").

    Returns None if the station is not in the dataset.
    NEVER falls back to LLM knowledge or external station data.
    """
    if not name:
        return None
    key = name.strip().lower()
    # Direct alias lookup
    code = DATASET_STATION_ALIASES.get(key)
    if code:
        return code
    # Already a valid code
    if key.upper() in VALID_DATASET_CODES:
        return key.upper()
    return None


def is_valid_station(name: str) -> bool:
    """Return True if the station name/code maps to a known dataset station."""
    return resolve_station_code(name) is not None


def _hhmm_to_min(t: str) -> int:
    """Convert 'HH:MM' → total minutes from midnight."""
    try:
        h, m = (int(x) for x in t.split(":"))
        return h * 60 + m
    except Exception:
        return 0


def _min_to_hhmm(total_min: int) -> str:
    """Convert total minutes (may be ≥ 1440) → 'HH:MM' (24-h, normalised mod 1440)."""
    normalised = total_min % 1440
    h = normalised // 60
    m = normalised % 60
    return f"{h:02d}:{m:02d}"


class TrainScheduleDB:
    def __init__(self):
        self._trains: Dict[str, Any] = {}
        self._load()

    def _load(self):
        """
        Load suburban_trains.json.
        _all_trains : full list of all records (used for search — preserves all entries
                      even when multiple records share the same trainNumber)
        _trains     : dict keyed by trainNumber for O(1) single-train lookup
                      (last-write-wins when trainNumber duplicates exist)
        """
        try:
            with open(_DATA_PATH, "r", encoding="utf-8") as f:
                trains_list = json.load(f)
            self._all_trains: List[Dict[str, Any]] = trains_list
            self._trains = {str(t["trainNumber"]): t for t in trains_list}
            print(f"[TrainScheduleDB] Loaded {len(self._all_trains)} train records "
                  f"({len(self._trains)} unique train numbers) from suburban_trains.json")
        except Exception as exc:
            print(f"[TrainScheduleDB] Could not load suburban_trains.json: {exc}")
            self._all_trains = []
            self._trains = {}

    def get(self, train_number: str) -> Optional[Dict[str, Any]]:
        """Return the full train record or None if not found."""
        return self._trains.get(str(train_number).strip())

    def _find_stop(self, stops: list, codes: List[str]) -> Optional[Dict[str, Any]]:
        """Return the first stop entry whose code matches any of 'codes'."""
        for s in stops:
            if s.get("code", "").upper() in [c.upper() for c in codes]:
                return s
        return None

    def build_predictor_context(
        self,
        train_number: str,
        now: Optional[datetime] = None,
        orig_codes: Optional[List[str]] = None,
        dest_codes: Optional[List[str]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Given a train number and the current datetime, return a dict of
        feature values ready to pass into DelayPredictionRequest.

        If orig_codes / dest_codes are provided, look up segment times from
        the stops array (supporting intermediate-stop journeys).

        Returns None if a fatal validation failure occurs.
        """
        now = get_ist_now(now)
        train = self.get(train_number)

        if not train:
            return None

        stops = train.get("stops", [])
        live  = train.get("liveState", {})

        # ── Determine departure time (segment origin stop, or train source) ──
        if orig_codes and stops:
            orig_stop = self._find_stop(stops, orig_codes)
        else:
            orig_stop = stops[0] if stops else None

        if orig_codes and stops:
            dest_stop = self._find_stop(stops, dest_codes or [train.get("destination", "").upper()])
        else:
            dest_stop = stops[-1] if stops else None

        # Departure = dep time of origin stop (or train's top-level departureTime)
        if orig_stop:
            dep_str = orig_stop.get("dep") or orig_stop.get("arr") or train.get("departureTime", "10:00")
        else:
            dep_str = train.get("departureTime", "10:00")

        # Arrival = arr time of destination stop (or train's top-level arrivalTime)
        if dest_stop:
            arr_str = dest_stop.get("arr") or dest_stop.get("dep") or train.get("arrivalTime", "18:00")
        else:
            arr_str = train.get("arrivalTime", "18:00")

        dep_total = _hhmm_to_min(dep_str)
        arr_total = _hhmm_to_min(arr_str)

        # Handle midnight crossing: if arrival appears before departure, it's next-day
        if arr_total <= dep_total:
            arr_total += 24 * 60

        travel_dur_mins = float(arr_total - dep_total)

        # ── Distance: prefer stop km data, else totalDistanceKm ──
        if orig_stop and dest_stop:
            orig_km = float(orig_stop.get("km", 0))
            dest_km = float(dest_stop.get("km", train.get("totalDistanceKm", 500)))
            distance_km = abs(dest_km - orig_km)
        else:
            distance_km = float(train.get("totalDistanceKm", 500))

        # Avoid zero distances
        if distance_km <= 0:
            distance_km = float(train.get("totalDistanceKm", 500))

        dep_h, dep_m = int(dep_str.split(":")[0]), int(dep_str.split(":")[1])
        arr_h, arr_m = int(arr_str.split(":")[0]), int(arr_str.split(":")[1])

        departure_delay = float(live.get("delayMinutes", 0))
        avg_speed = float(train.get("avgSpeed", 80))
        current_speed = float(live.get("speed", avg_speed))
        direction = 1  # Up direction heuristic

        return {
            "trainNumber": train_number,
            "trainName": train.get("name", f"Train {train_number}"),
            "day": now.day,
            "month": now.month,
            "dayOfWeek": now.weekday(),
            "departureHour": dep_h,
            "departureMinute": dep_m,
            "arrivalHour": arr_h,
            "arrivalMinute": arr_m,
            # The raw times as strings for display
            "departureTimeStr": dep_str,
            "arrivalTimeStr": arr_str,
            # Whether arrival is next-day
            "overnightArrival": (arr_total - dep_total) > 720,  # > 12 hours → likely crosses midnight
            "travelDurationMins": travel_dur_mins,
            "distanceKm": distance_km,
            "direction": direction,
            "departureDelay": departure_delay,
            "currentSpeed": current_speed,
            "source": train.get("source", ""),
            "destination": train.get("destination", ""),
            "liveState": live,
        }

    def search_trains(self, origin: str, destination: str) -> list:
        """
        Search candidate trains matching the origin and destination.

        Accepts either human-readable station names or raw codes.
        Names are resolved via DATASET_STATION_ALIASES.
        Returns empty list if either station is not in the dataset.

        STRICT: Never returns trains for stations not in suburban_trains.json.
        """
        # Resolve to dataset codes
        orig_code = resolve_station_code(origin)
        dest_code = resolve_station_code(destination)

        if not orig_code or not dest_code:
            missing = []
            if not orig_code:
                missing.append(f"'{origin}'")
            if not dest_code:
                missing.append(f"'{destination}'")
            print(f"[TrainScheduleDB] SEARCH REJECTED: station(s) not in dataset: {', '.join(missing)}")
            return []

        orig_codes = [orig_code]
        dest_codes = [dest_code]

        print(f"[TrainScheduleDB] Searching: {origin}({orig_code}) -> {destination}({dest_code})")

        matches = []
        # Iterate _all_trains (the full list) — not just the deduped dict —
        # so that every schedule record is considered even when multiple records
        # share the same trainNumber.
        for train in self._all_trains:
            stops = [s.get("code", "").upper() for s in train.get("stops", [])]
            if not stops:
                # No stops array — use source/destination only
                src = train.get("source", "").upper()
                dst = train.get("destination", "").upper()
                if any(c == src for c in orig_codes) and any(c == dst for c in dest_codes):
                    matches.append(train)
                continue

            orig_in = any(c in stops for c in orig_codes)
            dest_in = any(c in stops for c in dest_codes)
            if orig_in and dest_in:
                orig_idx = min(i for i, s in enumerate(stops) if s in orig_codes)
                dest_idx = min(i for i, s in enumerate(stops) if s in dest_codes)
                if orig_idx < dest_idx:
                    matches.append(train)

        print(f"[TrainScheduleDB] Found {len(matches)} candidate trains for {orig_code}->{dest_code}")
        return matches

    def search_trains_with_segment_info(
        self,
        origin: str,
        destination: str,
        now: Optional[datetime] = None,
        dep_time_from_hhmm: Optional[str] = None,
        dep_time_to_hhmm: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Like search_trains(), but returns enriched segment dicts containing:
          - All raw train fields
          - 'segment_dep_time': departure time at the origin stop
          - 'segment_arr_time': arrival time at the destination stop
          - 'segment_duration_mins': travel time for this segment
          - 'segment_distance_km': distance for this segment
          - 'orig_codes', 'dest_codes': used for ML feature construction
          - 'segment_overnight': True if this segment crosses midnight

        Optional:
          dep_time_from_hhmm / dep_time_to_hhmm  — if provided, only trains
          departing from the origin stop within [from, to] are returned.
          Format: 'HH:MM' (24-hour). Time window wraps across midnight correctly.
        """
        now = get_ist_now(now)

        # Resolve to dataset codes
        orig_code = resolve_station_code(origin)
        dest_code = resolve_station_code(destination)

        raw_matches = self.search_trains(origin, destination)
        if not raw_matches:
            return []

        orig_codes = [orig_code] if orig_code else [origin.upper()]
        dest_codes = [dest_code] if dest_code else [destination.upper()]

        # Parse time window filter
        filter_from_min: Optional[int] = None
        filter_to_min: Optional[int] = None
        if dep_time_from_hhmm:
            filter_from_min = _hhmm_to_min(dep_time_from_hhmm)
        if dep_time_to_hhmm:
            filter_to_min = _hhmm_to_min(dep_time_to_hhmm)

        enriched = []
        for train in raw_matches:
            stops = train.get("stops", [])

            # Find matching stop objects for origin and destination
            orig_stop = self._find_stop(stops, orig_codes)
            dest_stop = self._find_stop(stops, dest_codes)

            # Fallback to first/last stop if intermediate match not found
            if not orig_stop and stops:
                orig_stop = stops[0]
            if not dest_stop and stops:
                dest_stop = stops[-1]

            # Departure time of origin stop
            if orig_stop:
                seg_dep_str = orig_stop.get("dep") or orig_stop.get("arr") or train.get("departureTime", "10:00")
            else:
                seg_dep_str = train.get("departureTime", "10:00")

            # Arrival time of destination stop
            if dest_stop:
                seg_arr_str = dest_stop.get("arr") or dest_stop.get("dep") or train.get("arrivalTime", "18:00")
            else:
                seg_arr_str = train.get("arrivalTime", "18:00")

            seg_dep_min = _hhmm_to_min(seg_dep_str)
            seg_arr_min = _hhmm_to_min(seg_arr_str)

            # ── Apply departure time window filter ──────────────────────────
            if filter_from_min is not None and filter_to_min is not None:
                if filter_from_min <= filter_to_min:
                    # Normal window (e.g. 08:00 → 12:00)
                    if not (filter_from_min <= seg_dep_min <= filter_to_min):
                        continue
                else:
                    # Window wraps midnight (e.g. 22:00 → 02:00)
                    if not (seg_dep_min >= filter_from_min or seg_dep_min <= filter_to_min):
                        continue
            elif filter_from_min is not None:
                if seg_dep_min < filter_from_min:
                    continue
            elif filter_to_min is not None:
                if seg_dep_min > filter_to_min:
                    continue

            # Midnight crossing: if arrival appears ≤ departure, it's next-day
            overnight = seg_arr_min <= seg_dep_min
            if overnight:
                seg_arr_min += 24 * 60

            seg_duration = float(seg_arr_min - seg_dep_min)

            # Distance
            if orig_stop and dest_stop:
                orig_km = float(orig_stop.get("km", 0))
                dest_km = float(dest_stop.get("km", train.get("totalDistanceKm", 500)))
                seg_distance = abs(dest_km - orig_km)
            else:
                seg_distance = float(train.get("totalDistanceKm", 500))

            if seg_distance <= 0:
                seg_distance = float(train.get("totalDistanceKm", 500))

            enriched.append({
                **train,
                "segment_dep_time": seg_dep_str,
                "segment_arr_time": seg_arr_str,
                "segment_duration_mins": seg_duration,
                "segment_distance_km": seg_distance,
                "segment_overnight": overnight,
                "orig_codes": orig_codes,
                "dest_codes": dest_codes,
            })

        print(f"[TrainScheduleDB] After time-filter: {len(enriched)} trains remain")
        return enriched


# Singleton instance
train_schedule_db = TrainScheduleDB()
