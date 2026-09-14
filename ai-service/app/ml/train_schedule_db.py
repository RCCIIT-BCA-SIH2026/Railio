"""
TrainScheduleDB — loads nationwide_fleet.json / suburban_trains.json and provides lookup helpers.
Used by the delay predictor and RAG engine to fetch real schedule data for all 18 Indian Railways zones.
"""
import json
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

# Indian Standard Time (IST, UTC+05:30)
IST_TZ = timezone(timedelta(hours=5, minutes=30))

def get_ist_now(ref_time: Any = None) -> datetime:
    """Guarantees the returned datetime is strictly in Indian Standard Time (IST, UTC+05:30)."""
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
        except Exception:
            pass

    return datetime.now(timezone.utc).astimezone(IST_TZ)

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))          # ai-service/app/ml/
_AI_SERVICE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))  # ai-service/
_PROJECT_ROOT = os.path.dirname(_AI_SERVICE_DIR)               # RailSathi/
_NATIONWIDE_DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "trains", "nationwide_fleet.json")
_SUBURBAN_DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "trains", "suburban_trains.json")
_STATIONS_DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "stations", "all_india_stations.json")


DATASET_STATION_ALIASES: Dict[str, str] = {
    # ── Eastern Hubs ────────────────────────────────────────────────────────
    "sealdah": "SDAH", "sealda": "SDAH", "sdah": "SDAH", "শিয়ালদা": "SDAH",
    "howrah": "HWH", "howrah junction": "HWH", "howrah jn": "HWH", "hwh": "HWH", "হাওড়া": "HWH",
    "bidhan nagar road": "BNXR", "bidhannagar": "BNXR", "bnxr": "BNXR",
    "dum dum junction": "DDJ", "dum dum": "DDJ", "dumdum": "DDJ", "ddj": "DDJ",
    "baranagar road": "BARN", "baranagar": "BARN", "barn": "BARN",
    "dakshineswar": "DAKE", "dake": "DAKE", "দক্ষিণেশ্বর": "DAKE",
    "dankuni": "DKAE", "dankuni junction": "DKAE", "dkae": "DKAE", "ডানকুনি": "DKAE",
    "barddhaman": "BWN", "bardhaman": "BWN", "burdwan": "BWN", "bwn": "BWN",
    "asansol": "ASN", "asn": "ASN", "kolkata terminal": "KOAA", "koaa": "KOAA",

    # ── Northern Hubs ───────────────────────────────────────────────────────
    "new delhi": "NDLS", "delhi": "NDLS", "ndls": "NDLS", "नई दिल्ली": "NDLS",
    "old delhi": "DLI", "dli": "DLI", "nizamuddin": "NZM", "hazrat nizamuddin": "NZM", "nzm": "NZM",
    "anand vihar": "ANVT", "anvt": "ANVT", "ambala": "UMB", "umb": "UMB",
    "amritsar": "ASR", "asr": "ASR", "lucknow": "LKO", "lko": "LKO",
    "kanpur": "CNB", "kanpur central": "CNB", "cnb": "CNB", "prayagraj": "PRYJ", "pryj": "PRYJ",
    "varanasi": "BSB", "bsb": "BSB", "agra": "AGC", "agc": "AGC", "jhansi": "VGLJ", "vglj": "VGLJ",

    # ── Western Hubs ────────────────────────────────────────────────────────
    "mumbai central": "MMCT", "mumbai": "MMCT", "mmct": "MMCT", "bandra terminus": "BDTS", "bdts": "BDTS",
    "surat": "ST", "st": "ST", "vadodara": "BRC", "brc": "BRC",
    "ahmedabad": "ADI", "adi": "ADI", "ratlam": "RTM", "rtm": "RTM", "rajkot": "RJT", "rjt": "RJT",

    # ── Central Hubs ────────────────────────────────────────────────────────
    "mumbai csmt": "CSMT", "csmt": "CSMT", "vt": "CSMT", "kalyan": "KYN", "kyn": "KYN",
    "pune": "PUNE", "pune junction": "PUNE", "bhusawal": "BSL", "bsl": "BSL",
    "nagpur": "NGP", "ngp": "NGP", "solapur": "SUR", "sur": "SUR",

    # ── Southern Hubs ───────────────────────────────────────────────────────
    "chennai central": "MAS", "chennai": "MAS", "mas": "MAS", "chennai egmore": "MS", "ms": "MS",
    "bengaluru": "SBC", "bangalore": "SBC", "sbc": "SBC", "yesvantpur": "YPR", "ypr": "YPR",
    "mysuru": "MYS", "mysore": "MYS", "mys": "MYS", "hubballi": "UBL", "hubli": "UBL", "ubl": "UBL",
    "secunderabad": "SC", "sc": "SC", "hyderabad": "HYB", "hyb": "HYB", "vijayawada": "BZA", "bza": "BZA",
    "coimbatore": "CBE", "cbe": "CBE", "madurai": "MDU", "mdu": "MDU", "kochi": "ERS", "ernakulam": "ERS", "ers": "ERS",
    "thiruvananthapuram": "TVC", "trivandrum": "TVC", "tvc": "TVC",

    # ── East Central & North Eastern Hubs ────────────────────────────────────
    "patna": "PNBE", "patna junction": "PNBE", "pnbe": "PNBE",
    "deen dayal upadhyaya": "DDU", "ddu": "DDU", "mughalsarai": "DDU",
    "dhanbad": "DHN", "dhn": "DHN", "gaya": "GAYA", "gaya": "GAYA",
    "gorakhpur": "GKP", "gkp": "GKP", "guwahati": "GHY", "ghy": "GHY", "new jalpaiguri": "NJP", "njp": "NJP",
    "bhubaneswar": "BBS", "bbs": "BBS", "puri": "PURI", "visakhapatnam": "VSKP", "vskp": "VSKP",
    "bilaspur": "BSP", "bsp": "BSP", "raipur": "R", "kharagpur": "KGP", "kgp": "KGP", "tatanagar": "TATA", "tata": "TATA",
    "bhopal": "BPL", "bpl": "BPL", "jabalpur": "JBP", "jbp": "JBP", "kota": "KOTA", "jaipur": "JP", "jp": "JP",
    "madgaon": "MAO", "goa": "MAO", "mao": "MAO", "ratnagiri": "RN", "rn": "RN"
}

VALID_DATASET_CODES = set(DATASET_STATION_ALIASES.values())

def _load_all_india_stations():
    if os.path.exists(_STATIONS_DATA_PATH):
        try:
            with open(_STATIONS_DATA_PATH, "r", encoding="utf-8") as f:
                stns = json.load(f)
                for s in stns:
                    code = s["code"].upper()
                    name = s["name"].lower()
                    city = s["city"].lower()
                    if name not in DATASET_STATION_ALIASES:
                        DATASET_STATION_ALIASES[name] = code
                    if city not in DATASET_STATION_ALIASES:
                        DATASET_STATION_ALIASES[city] = code
                    DATASET_STATION_ALIASES[code.lower()] = code
                    VALID_DATASET_CODES.add(code)
        except Exception as e:
            print(f"[TrainScheduleDB] Warning loading stations: {e}")

_load_all_india_stations()

def resolve_station_code(name: str) -> Optional[str]:
    """Resolve a human-readable station name (any language/script) to its dataset station code."""
    if not name:
        return None
    key = name.strip().lower()
    code = DATASET_STATION_ALIASES.get(key)
    if code:
        return code
    if key.upper() in VALID_DATASET_CODES:
        return key.upper()
    return None

def is_valid_station(name: str) -> bool:
    return resolve_station_code(name) is not None

def _hhmm_to_min(t: str) -> int:
    try:
        h, m = (int(x) for x in t.split(":"))
        return h * 60 + m
    except Exception:
        return 0

def _min_to_hhmm(total_min: int) -> str:
    normalised = total_min % 1440
    h = normalised // 60
    m = normalised % 60
    return f"{h:02d}:{m:02d}"

class TrainScheduleDB:
    def __init__(self):
        self._trains: Dict[str, Any] = {}
        self._all_trains: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        # Prefer nationwide fleet (5,500+ trains across 18 zones), fallback to suburban_trains
        target_path = _NATIONWIDE_DATA_PATH if os.path.exists(_NATIONWIDE_DATA_PATH) else _SUBURBAN_DATA_PATH
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                trains_list = json.load(f)
            self._all_trains = trains_list
            self._trains = {str(t["trainNumber"]): t for t in trains_list}
            print(f"[TrainScheduleDB] Loaded {len(self._all_trains)} train records "
                  f"({len(self._trains)} unique train numbers) from {os.path.basename(target_path)}")
        except Exception as exc:
            print(f"[TrainScheduleDB] Could not load train dataset: {exc}")
            self._all_trains = []
            self._trains = {}

    def get(self, train_number: str) -> Optional[Dict[str, Any]]:
        return self._trains.get(train_number.strip())

    def _find_stop(self, stops: list, codes: List[str]) -> Optional[Dict[str, Any]]:
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
        now = get_ist_now(now)
        train = self.get(train_number)

        if not train:
            return None

        stops = train.get("stops", [])
        live = train.get("liveState", {})

        if orig_codes and stops:
            orig_stop = self._find_stop(stops, orig_codes)
        else:
            orig_stop = stops[0] if stops else None

        if orig_codes and stops:
            dest_stop = self._find_stop(stops, dest_codes or [train.get("destination", "").upper()])
        else:
            dest_stop = stops[-1] if stops else None

        if orig_stop:
            dep_str = orig_stop.get("dep") or orig_stop.get("arr") or train.get("departureTime", "10:00")
        else:
            dep_str = train.get("departureTime", "10:00")

        if dest_stop:
            arr_str = dest_stop.get("arr") or dest_stop.get("dep") or train.get("arrivalTime", "18:00")
        else:
            arr_str = train.get("arrivalTime", "18:00")

        dep_total = _hhmm_to_min(dep_str)
        arr_total = _hhmm_to_min(arr_str)

        if arr_total <= dep_total:
            arr_total += 24 * 60

        travel_dur_mins = float(arr_total - dep_total)

        if orig_stop and dest_stop:
            orig_km = float(orig_stop.get("km", 0))
            dest_km = float(dest_stop.get("km", train.get("totalDistanceKm", 500)))
            distance_km = abs(dest_km - orig_km)
        else:
            distance_km = float(train.get("totalDistanceKm", 500.0))

        direction = 1 if train.get("source", "").upper() != "NDLS" and train.get("source", "").upper() != "SDAH" else 0
        dep_delay = float(live.get("delayMinutes", 0.0))
        curr_speed = float(live.get("speed", train.get("avgSpeed", 60)))

        return {
            "trainNumber": train_number,
            "zone": train.get("zone", "NR"),
            "departureTime": dep_str,
            "arrivalTime": arr_str,
            "travelDurationMins": travel_dur_mins,
            "distanceKm": distance_km if distance_km > 0 else 500.0,
            "direction": direction,
            "day": now.day,
            "month": now.month,
            "dayOfWeek": now.weekday(),
            "departureDelay": dep_delay,
            "currentSpeed": curr_speed,
            "dwellTime": 2.0,
            "weatherCondition": "Clear",
            "junctionCongestionLevel": 0.25,
            "activeTSRs": [],
            "signalAspect": None,
            "precedingTrainDelayMin": 0.0,
            "fogVisibilityKm": 10.0
        }

    def search_by_route(self, from_code: str, to_code: str, zone: Optional[str] = None) -> List[Dict[str, Any]]:
        fc = from_code.upper().strip()
        tc = to_code.upper().strip()
        results = []
        for t in self._all_trains:
            if zone and zone.upper() != "ALL" and t.get("zone", "").upper() != zone.upper():
                continue
            stops = t.get("stops", [])
            f_idx = -1
            t_idx = -1
            for idx, s in enumerate(stops):
                sc = s.get("code", "").upper()
                if sc == fc and f_idx == -1:
                    f_idx = idx
                if sc == tc and t_idx == -1:
                    t_idx = idx
            if f_idx != -1 and t_idx != -1 and f_idx < t_idx:
                results.append(t)
        return results

train_schedule_db = TrainScheduleDB()
