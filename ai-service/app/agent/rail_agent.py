import re
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.rag.knowledge_base import knowledge_base
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
from app.ml.train_schedule_db import (
    train_schedule_db,
    resolve_station_code,
    is_valid_station,
    DATASET_STATION_ALIASES,
)


class AgentMessageRequest(BaseModel):
    message: str
    location: Optional[Dict[str, float]] = None
    session_id: Optional[str] = "default"


class ToolExecutionLog(BaseModel):
    tool: str
    input: Dict[str, Any]
    output: str
    status: str = "SUCCESS"


class AgentResponse(BaseModel):
    answer: str
    toolsExecuted: List[ToolExecutionLog]
    confidenceScore: float
    retrievedKnowledgeDocs: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# STRICT RULE: normalize_station() MUST use only dataset-backed aliases.
# It returns the canonical station CODE (e.g. "SDAH", "DKAE") or None.
# NEVER falls back to LLM knowledge or unknown station names.
# ─────────────────────────────────────────────────────────────────────────────
def normalize_station(name: str) -> Optional[str]:
    """
    Resolve a user-provided station name to its dataset code.
    Returns None if the station is not in the configured dataset.
    This is the ONLY station normalizer used in the agent — no external fallback.
    """
    if not name:
        return None
    return resolve_station_code(name)


# ─────────────────────────────────────────────────────────────────────────────
# MULTILINGUAL KEYWORD TABLES
# ─────────────────────────────────────────────────────────────────────────────

FROM_WORDS = [
    "from", "theke", "থেকে", "से", "se bhi"
]
TO_WORDS = [
    "to", "jabo", "jete", "jete chai", "যাব", "যেতে", "যেতে চাই",
    "jana hai", "जाना", "jaana", "->", "⇄"
]
TOMORROW_WORDS = [
    "tomorrow", "agamikal", "agami kal", "kalke", "kal", "kaal",
    "আগামীকাল", "আগামী কাল", "কালকে", "কাল", "कल", "कल को"
]
TODAY_WORDS = [
    "today", "aaj", "aajke", "aj", "আজ", "আজকে", "আজই", "আজকের", "আজকের দিন", "आज", "आज ही"
]
MORNING_WORDS = [
    "morning", "sokale", "sakal", "সকালে", "সকাল", "সকাল বেলা",
    "subah", "सुबह", "bhor"
]
AFTERNOON_WORDS = [
    "afternoon", "bikele", "bikel", "বিকেলে", "বিকেল",
    "dopahar", "दोपहर"
]
EVENING_WORDS = [
    "evening", "sandhye", "সন্ধ্যায়", "সন্ধ্যা", "সন্ধেয়",
    "shaam", "शाम"
]
NIGHT_WORDS = [
    "night", "rate", "raat", "রাতে", "রাত",
    "raat", "रात"
]

BANGLISH_SIGNALS = [
    "theke", "jabo", "jete", "ami", "amar", "apnar", "chai",
    "kothay", "kono", "somoy", "tarikh", "jana", "pore", "ekhon",
    "sokale", "bikele", "raat", "agamikal", "lagbe",
    "train ache", "kobe", "kotha", "dibo", "dite", "sandhye", "tar modhye"
]

HINDI_SIGNALS = [
    "jana hai", "chahiye", "jaana", "kab", "kahan", "kitne baje",
    "subah", "dopahar", "shaam", "aaj", "mujhe", "mujhko",
    "tak", "bhi"
]


# ─────────────────────────────────────────────────────────────────────────────
# RESPONSE TEMPLATES — multilingual, 5 styles
# ─────────────────────────────────────────────────────────────────────────────
RESPONSES = {
    "AWAITING_ROUTE": {
        "en":       "No problem 🚆 I can find suitable local trains for you.\nWhere would you like to travel from and to?",
        "bn":       "অবশ্যই 🚆 কোথা থেকে কোথায় যেতে চান?",
        "hi":       "ज़रूर 🚆 आप कहाँ से कहाँ जाना चाहते हैं?",
        "banglish": "Sure 🚆 Kothay theke kothay jete chao?",
        "mixed":    "অবশ্যই 🚆 কোথা থেকে কোথায় যেতে চান?",
    },
    "AWAITING_DATE": {
        "en":       "Got it. What date would you like to travel?",
        "bn":       "ঠিক আছে। কোন তারিখে যেতে চান?",
        "hi":       "ठीक है। आप किस तारीख को यात्रा करना चाहते हैं?",
        "banglish": "Okay 🚆 Kono tarikhey jete chao?",
        "mixed":    "ঠিক আছে। কোন date-এ যেতে চান?",
    },
    "AWAITING_DEP_TIME": {
        "en":       "What time would you prefer to leave?",
        "bn":       "কখনের দিকে রওনা দিতে চান?",
        "hi":       "आप कितने बजे निकलना चाहते हैं?",
        "banglish": "Kakhon rowana dite chao?",
        "mixed":    "কখন রওনা দিতে চান?",
    },
    "AWAITING_DEADLINE": {
        "en":       "Do you need to reach your destination by a specific time?",
        "bn":       "কোন সময়ের মধ্যে পৌঁছাতে চান?",
        "hi":       "आपको किस समय तक पहुँचना है?",
        "banglish": "Koto tar modhye pouchate hobe?",
        "mixed":    "কত টার মধ্যে পৌঁছাতে চান?",
    },
}

# ── Strict "no data" responses — never fabricate ──────────────────────────────
NO_DATA_RESPONSES = {
    "en":       "No matching local train found for this route/time in my available dataset. I only cover suburban trains in the Kolkata/West Bengal region.",
    "bn":       "এই route/সময়ের জন্য আমার available local train dataset-এ কোনো matching train পাওয়া যায়নি।\nআমি শুধু Kolkata/পশ্চিমবঙ্গ এলাকার suburban local train cover করি।",
    "hi":       "इस route/समय के लिए मेरे available dataset में कोई matching local train नहीं मिली।\nमैं केवल Kolkata/West Bengal के suburban local trains को cover करता हूँ।",
    "banglish": "Ei route/somoyer jonno available local train dataset-e kono matching train paoa jacche na.\nAmi shudhu Kolkata/West Bengal-er suburban local train cover kori.",
    "mixed":    "এই route-এর জন্য আমার dataset-এ কোনো matching local train পাওয়া যায়নি।\nAmi only Kolkata/West Bengal suburban local trains cover kori.",
}

NO_STATION_RESPONSES = {
    "en":       "Sorry, **{station}** is not in my local train dataset. I only cover suburban stations in the Kolkata/West Bengal region.",
    "bn":       "দুঃখিত, **{station}** আমার local train dataset-এ নেই।\nআমি শুধু Kolkata/পশ্চিমবঙ্গ এলাকার suburban stations cover করি।",
    "hi":       "माफ़ करें, **{station}** मेरे local train dataset में नहीं है।\nमैं केवल Kolkata/West Bengal क्षेत्र के suburban stations cover करता हूँ।",
    "banglish": "Sorry, **{station}** amar local train dataset-e nei.\nAmi shudhu Kolkata/West Bengal-er suburban stations cover kori.",
    "mixed":    "দুঃখিত, **{station}** আমার dataset-এ নেই।\nI cover only Kolkata/West Bengal suburban stations.",
}

NO_TRAIN_NUMBER_RESPONSE = {
    "en":       "Train **{train_number}** is not found in my local train dataset. I only have information about suburban trains in the Kolkata/West Bengal region.",
    "bn":       "Train **{train_number}** আমার local train dataset-এ পাওয়া যায়নি।\nআমি শুধু Kolkata/পশ্চিমবঙ্গ এলাকার suburban local train নিয়ে তথ্য দিতে পারি।",
    "hi":       "Train **{train_number}** मेरे local train dataset में नहीं है।",
    "banglish": "Train **{train_number}** amar local dataset-e nei.",
    "mixed":    "Train **{train_number}** আমার dataset-এ নেই।",
}

LIVE_UNAVAILABLE = {
    "en":       "Live train information is currently unavailable.",
    "bn":       "এই মুহূর্তে live train information পাওয়া যাচ্ছে না।",
    "hi":       "अभी live train जानकारी उपलब्ध नहीं है।",
    "banglish": "Ekhon live train information paoa jacche na.",
    "mixed":    "এখন live train information available নেই।",
}

TIME_WINDOW_NO_DATA = {
    "en":       "No trains found departing in your requested time window ({time_from} – {time_to}). Would you like to try a different time?",
    "bn":       "আপনার চাওয়া সময় ({time_from} – {time_to}) তে কোনো train পাওয়া যায়নি। অন্য কোনো সময় try করবেন?",
    "hi":       "आपके requested time ({time_from} – {time_to}) में कोई train नहीं मिली। कोई और समय try करें?",
    "banglish": "{time_from} – {time_to} somoye kono train paoa jacche na. Onno somoy try korben?",
    "mixed":    "আপনার সময়ে ({time_from} – {time_to}) কোনো train পাওয়া যায়নি। অন্য সময় try করবেন?",
}


def _r(key: str, style: str) -> str:
    """Fetch a response string for the given state key and language style."""
    d = RESPONSES.get(key, {})
    return d.get(style, d.get("en", ""))


def _nd(style: str) -> str:
    """No data response in user's language."""
    return NO_DATA_RESPONSES.get(style, NO_DATA_RESPONSES["en"])


def _ns(station: str, style: str) -> str:
    """No station response in user's language."""
    tmpl = NO_STATION_RESPONSES.get(style, NO_STATION_RESPONSES["en"])
    return tmpl.format(station=station)


def _nt(train_number: str, style: str) -> str:
    """No train number response in user's language."""
    tmpl = NO_TRAIN_NUMBER_RESPONSE.get(style, NO_TRAIN_NUMBER_RESPONSE["en"])
    return tmpl.format(train_number=train_number)


def _live_unavail(style: str) -> str:
    return LIVE_UNAVAILABLE.get(style, LIVE_UNAVAILABLE["en"])


class RailIoAgent:
    def __init__(self):
        # Single Source of Truth Session Store
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def _get_session(self, session_id: str) -> Dict[str, Any]:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "intent": None,
                "origin": None,          # canonical dataset code, e.g. "SDAH"
                "origin_display": None,   # human-readable for display
                "destination": None,      # canonical dataset code, e.g. "DKAE"
                "destination_display": None,
                "travel_date": None,
                "departure_time_from": None,   # HH:MM (24-h)
                "departure_time_to": None,     # HH:MM (24-h)
                "arrival_deadline": None,
                "train_number": None,
                "train_name": None,
                "state": "IDLE",
                "last_lang": "en",
                "last_style": "en",
            }
        return self.sessions[session_id]

    # ─────────────────────────────────────────────────────────────────────────
    # LANGUAGE + STYLE DETECTION (per turn)
    # ─────────────────────────────────────────────────────────────────────────
    def _detect_language_and_style(self, text: str) -> tuple:
        """
        Returns (lang, style):
          lang  : 'en' | 'bn' | 'hi' | 'banglish' | 'mixed'
          style : same set — used for picking response templates
        """
        has_bengali_script = bool(re.search(r'[\u0980-\u09FF]', text))
        # Exclude Devanagari Danda (U+0964) which is used in Bengali too
        has_devanagari     = bool(re.search(r'[\u0904-\u0939\u0950-\u0954\u0958-\u095F]', text))
        has_latin          = bool(re.search(r'[a-zA-Z]', text))

        lower = text.lower()

        has_banglish    = any(w in lower for w in BANGLISH_SIGNALS)
        has_hindi_roman = any(w in lower for w in HINDI_SIGNALS)

        if has_bengali_script and has_latin:
            return "mixed", "mixed"
        if has_devanagari:
            return "hi", "hi"
        if has_bengali_script:
            return "bn", "bn"
        if has_banglish:
            return "banglish", "banglish"
        if has_hindi_roman:
            return "hi", "hi"
        return "en", "en"

    # ─────────────────────────────────────────────────────────────────────────
    # TIME STRING → 'HH:MM' 24-hour normalizer
    # ─────────────────────────────────────────────────────────────────────────
    def _parse_time_to_hhmm(self, time_str: str) -> Optional[str]:
        """
        Convert user-provided time string (e.g. '6 PM', '18:30', '6') → 'HH:MM'.
        Returns None if unparseable.
        """
        if not time_str:
            return None
        s = time_str.strip().upper()
        # Clean suffix like "TA", "টার", "টায়", "টা"
        s = re.sub(r'(?:TA|টার|টায়|টা)', '', s).strip()
        m = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?', s)
        if not m:
            return None
        h = int(m.group(1))
        mins = int(m.group(2)) if m.group(2) else 0
        period = m.group(3)
        if period == "PM" and h != 12:
            h += 12
        elif period == "AM" and h == 12:
            h = 0
        return f"{h:02d}:{mins:02d}"

    # ─────────────────────────────────────────────────────────────────────────
    # MULTILINGUAL ENTITY EXTRACTION
    # ─────────────────────────────────────────────────────────────────────────
    def _extract_entities(self, text: str, session: Dict[str, Any]) -> Dict[str, Any]:
        parsed: Dict[str, Any] = {}
        lower = text.lower().strip()
        current_state = session.get("state", "IDLE")

        # ── 1. Train Number ──
        train_num_match = re.search(r'\b(\d{4,5})\b', text)
        if train_num_match:
            parsed["train_number"] = train_num_match.group(1)

        # ── 2. Origin & Destination ──
        connector_from = r'(?:theke|থেকে|से|se\s|from)'
        connector_to   = r'(?:to|jabo|jete\s*(?:chai)?|যাব|যেতে(?:\s*চাই)?|jana\s*hai|जाना|->|⇄|-)'

        # Pattern A: "X theke/থেকে/from Y"
        pat_a_iter = re.finditer(
            r'\b([\w\u0980-\u09FF]+)\s+' + connector_from + r'\s+([\w\u0980-\u09FF]+)',
            text, re.IGNORECASE
        )
        # Pattern B: "from X to Y" or "X to Y"
        pat_b_iter = re.finditer(
            r'(?:from\s+)?([\w\u0980-\u09FF]+)\s+' + connector_to + r'\s+([\w\u0980-\u09FF]+)',
            text, re.IGNORECASE
        )
        # Pattern C: Bengali-script "X থেকে Y"
        pat_c_iter = re.finditer(
            r'([\w\u0980-\u09FF]+)\s+থেকে\s+([\w\u0980-\u09FF]+)',
            text, re.IGNORECASE
        )
        # Pattern D: Hindi Devanagari "X से Y"
        pat_d_iter = re.finditer(
            r'([\w\u0900-\u097F]+)\s+से\s+([\w\u0900-\u097F]+)',
            text, re.IGNORECASE
        )

        skip_words = {
            "want", "need", "find", "train", "search", "know", "number",
            "don't", "dont", "go", "the", "a", "from", "ami", "amar",
            "apnar", "mujhe", "mujhko", "chahiye", "lagbe", "jao",
            "kono", "kothay", "please", "chaliye", "koi",
        }

        for pat_iter in [pat_a_iter, pat_c_iter, pat_d_iter, pat_b_iter]:
            for pat in pat_iter:
                if "origin_raw" not in parsed:
                    g1, g2 = pat.group(1).strip(), pat.group(2).strip()
                    if g1.lower() not in skip_words and g2.lower() not in skip_words:
                        parsed["origin_raw"] = g1
                        parsed["destination_raw"] = g2
                        break
            if "origin_raw" in parsed:
                break

        # Pattern E: bare two-word answer when bot asked for route
        if "origin_raw" not in parsed and current_state == "AWAITING_ROUTE":
            words = [w.strip() for w in re.split(r'[\s,]+', text) if w.strip()]
            filtered = [w for w in words if w.isalpha() and w.lower() not in skip_words]
            if len(filtered) == 2:
                parsed["origin_raw"] = filtered[0]
                parsed["destination_raw"] = filtered[1]

        # Pattern F: Dataset-backed station scanner for natural/freeform sentences
        if "origin_raw" not in parsed:
            tokens = re.split(r'[\s,]+', text)
            detected_stations = []
            for token in tokens:
                clean_t = token.strip()
                if clean_t and clean_t.lower() not in skip_words:
                    code = normalize_station(clean_t)
                    if code:
                        detected_stations.append((clean_t, code))

            if len(detected_stations) >= 2:
                st1_raw, st1_code = detected_stations[0]
                st2_raw, st2_code = detected_stations[1]

                # Check if st1 or st2 is associated with "theke" / "from" / "se"
                st1_is_from = bool(re.search(rf'{re.escape(st1_raw)}\s+(?:theke|থেকে|from|সে|se)', text, re.I))
                st2_is_from = bool(re.search(rf'{re.escape(st2_raw)}\s+(?:theke|থেকে|from|সে|se)', text, re.I))

                if st2_is_from and not st1_is_from:
                    parsed["origin_raw"] = st2_raw
                    parsed["destination_raw"] = st1_raw
                elif st1_is_from and not st2_is_from:
                    parsed["origin_raw"] = st1_raw
                    parsed["destination_raw"] = st2_raw
                else:
                    parsed["origin_raw"] = st1_raw
                    parsed["destination_raw"] = st2_raw

        # ── 3. Travel Date ──
        if any(w in lower for w in TOMORROW_WORDS):
            parsed["travel_date"] = "Tomorrow"
        elif any(w in lower for w in TODAY_WORDS):
            parsed["travel_date"] = "Today"
        elif re.search(r'\bnext\s+monday\b|\bporer\s+sombar\b|\bअगले\s+सोमवार\b', lower):
            parsed["travel_date"] = "Next Monday"
        else:
            # Explicit date formats: "10th september", "10 sep", "10/9", "10-09", "september 10"
            explicit_date = re.search(
                r'\b(\d{1,2})(?:st|nd|rd|th)?\s+'
                r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?'
                r'|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
                r'|january|february|march|april|june|july|august|september|october|november|december)'
                r'(?:\s+\d{4})?\b'
                r'|\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?'
                r'|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
                r'\s+(\d{1,2})(?:st|nd|rd|th)?\b'
                r'|\b(\d{1,2})[/\-](\d{1,2})(?:[/\-]\d{2,4})?\b',
                lower
            )
            if explicit_date:
                parsed["travel_date"] = text.strip().title()
            elif current_state == "AWAITING_DATE" and "travel_date" not in parsed:
                # Accept anything the user typed as a date when bot explicitly asked
                if not any(w in lower for w in ["find", "train", "search", "khujchi", "dhoro", "station"]):
                    parsed["travel_date"] = text.strip().title()

        # ── 4. Departure Time ──
        # Range: "between 6 pm and 8 pm", "6 ta theke 8 tar modhye"
        time_range = re.search(
            r'between\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+and\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)',
            lower
        )
        # "8 AM to 12 PM"
        time_range2 = re.search(
            r'(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))',
            lower
        )

        spec_match = re.search(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|ta|টার|টায়|টা)?\b', lower)

        if time_range:
            t1 = self._parse_time_to_hhmm(time_range.group(1))
            t2 = self._parse_time_to_hhmm(time_range.group(2))
            if t1: parsed["departure_time_from"] = t1
            if t2: parsed["departure_time_to"] = t2
        elif time_range2:
            t1 = self._parse_time_to_hhmm(time_range2.group(1))
            t2 = self._parse_time_to_hhmm(time_range2.group(2))
            if t1: parsed["departure_time_from"] = t1
            if t2: parsed["departure_time_to"] = t2
        elif spec_match and len(spec_match.group(1)) <= 2 and spec_match.group(1) not in ("0", "00"):
            h_val = int(spec_match.group(1))
            m_val = int(spec_match.group(2)) if spec_match.group(2) else 0
            unit_suffix = (spec_match.group(3) or "").lower()

            is_pm = unit_suffix == "pm" or any(w in lower for w in EVENING_WORDS + NIGHT_WORDS + AFTERNOON_WORDS)
            is_am = unit_suffix == "am" or any(w in lower for w in MORNING_WORDS)

            if is_pm and h_val < 12:
                h_val += 12
            elif is_am and h_val == 12:
                h_val = 0

            if 0 <= h_val <= 23:
                from_h = max(0, h_val - 1)
                to_h   = min(23, h_val + 1)
                parsed["departure_time_from"] = f"{from_h:02d}:{m_val:02d}"
                parsed["departure_time_to"]   = f"{to_h:02d}:{m_val:02d}"
        elif any(w in lower for w in MORNING_WORDS):
            parsed["departure_time_from"] = "05:00"
            parsed["departure_time_to"]   = "12:00"
        elif any(w in lower for w in AFTERNOON_WORDS):
            parsed["departure_time_from"] = "12:00"
            parsed["departure_time_to"]   = "17:00"
        elif any(w in lower for w in EVENING_WORDS):
            parsed["departure_time_from"] = "17:00"
            parsed["departure_time_to"]   = "21:00"
        elif any(w in lower for w in NIGHT_WORDS):
            parsed["departure_time_from"] = "21:00"
            parsed["departure_time_to"]   = "23:59"
        elif current_state == "AWAITING_DEP_TIME":
            parsed["departure_time_from"] = "00:00"
            parsed["departure_time_to"]   = "23:59"

        return parsed

    # ─────────────────────────────────────────────────────────────────────────
    # STATION RESOLUTION: extract raw names → validate against dataset
    # ─────────────────────────────────────────────────────────────────────────
    def _resolve_stations(self, parsed: Dict[str, Any], style: str) -> Dict[str, Any]:
        """
        Given parsed entities containing 'origin_raw' / 'destination_raw',
        resolve them to dataset codes. Returns a dict with:
          - 'origin'             → dataset code (e.g. "SDAH") or None
          - 'origin_display'     → human label for display
          - 'destination'        → dataset code or None
          - 'destination_display'
          - 'invalid_station'    → name of invalid station for error message (or None)
        """
        out = {}
        for role in ("origin", "destination"):
            raw_key = f"{role}_raw"
            if raw_key not in parsed:
                continue
            raw = parsed[raw_key]
            code = normalize_station(raw)
            if code:
                out[role] = code
                out[f"{role}_display"] = raw  # keep what user typed for display
            else:
                out[role] = None
                out[f"{role}_display"] = raw
                out["invalid_station"] = raw
        return out

    # ─────────────────────────────────────────────────────────────────────────
    # RESULT FORMATTER
    # ─────────────────────────────────────────────────────────────────────────
    def _format_results_hardcoded(self, results: list, orig_display: str, dest_display: str,
                        deadline_str: str, style: str) -> str:
        if not results:
            return _nd(style)

        # Max 4 matching trains
        results = results[:4]

        def get_dir(t_num_str: str) -> str:
            try:
                num = int(t_num_str)
                return "DOWN" if num % 2 != 0 else "UP"
            except Exception:
                return "LOCAL"

        rec = results[0]
        rec_dir = get_dir(rec['trainNumber'])

        def deadline_line(t: dict, s: str) -> str:
            if not t.get("meetsDeadline") and deadline_str:
                if s == "bn": return "⚠️ Deadline-এর পরে পৌঁছাতে পারে।"
                return "⚠️ May miss deadline."
            return ""

        headers = {
            "en":       (f"🚆 Found {len(results)} matching local train(s) from dataset:\n\n⭐ Recommended", "Other matching trains:"),
            "bn":       (f"🚆 Dataset থেকে {len(results)}টি matching local train পাওয়া গেছে:\n\n⭐ Recommended", "অন্যান্য matching trains:"),
            "hi":       (f"🚆 Dataset से {len(results)} matching local trains मिलीं:\n\n⭐ Recommended", "अन्य उपलब्ध trains:"),
            "banglish": (f"🚆 Dataset theke {len(results)}ta matching local train paoa geche:\n\n⭐ Recommended", "Onno matching trains:"),
            "mixed":    (f"🚆 Dataset থেকে {len(results)}টি matching local train পাওয়া গেছে:\n\n⭐ Recommended", "Other matching trains:"),
        }
        head, others_label = headers.get(style, headers["en"])

        rec_block = (
            f"{head}\n"
            f"**{rec['trainNumber']} — {rec['name']} [{rec_dir}]**\n"
            f"🕐 Departure: {rec['departure']}\n"
            f"🕘 Scheduled Arrival: {rec['scheduledArrival']}\n"
            f"🤖 AI Predicted Delay: +{rec['predictedDelay']} min\n"
            f"📍 Estimated Arrival: {rec['estimatedArrival']}\n"
        )
        dl_str = deadline_line(rec, style)
        if dl_str:
            rec_block += f"{dl_str}\n"
        rec_block += "\n"

        if len(results) > 1:
            rec_block += f"{others_label}\n\n"
            other_blocks = []
            for idx, t in enumerate(results[1:], 2):
                t_dir = get_dir(t['trainNumber'])
                ob = (
                    f"{idx}. **{t['trainNumber']} — {t['name']} [{t_dir}]**\n"
                    f"   🕐 Departure: {t['departure']}\n"
                    f"   🕘 Scheduled Arrival: {t['scheduledArrival']}\n"
                    f"   🤖 AI Predicted Delay: +{t['predictedDelay']} min\n"
                    f"   📍 Estimated Arrival: {t['estimatedArrival']}"
                )
                dl_s = deadline_line(t, style)
                if dl_s:
                    ob += f"\n   {dl_s}"
                other_blocks.append(ob)
            rec_block += "\n\n".join(other_blocks)

        return rec_block

    def _format_results(self, results: list, orig_display: str, dest_display: str,
                        deadline_str: str, style: str) -> str:
        # Always use the direct dataset formatter — NO LLM involved in result formatting.
        # Gemini/OpenAI must NEVER be used here as they hallucinate train numbers/schedules.
        return self._format_results_hardcoded(results, orig_display, dest_display, deadline_str, style)


    # ─────────────────────────────────────────────────────────────────────────
    # MAIN QUERY PROCESSOR
    # ─────────────────────────────────────────────────────────────────────────
    def process_query(self, req: AgentMessageRequest) -> AgentResponse:
        query = re.sub(r'["\'`“”«»]', '', req.message).strip()
        lower_query = query.lower()
        session_id = getattr(req, 'session_id', 'default') or 'default'

        # Step 1: Load session
        session = self._get_session(session_id)
        prev_state_dict = dict(session)

        # Step 2: Per-turn language + style detection
        lang, style = self._detect_language_and_style(query)
        session["last_lang"] = lang
        session["last_style"] = style

        # Step 3: Reset check
        reset_words = [
            "reset", "start over", "clear", "new search", "find another train",
            "নতুন", "আবার", "shuru", "nayi khoj"
        ]
        if any(w in lower_query for w in reset_words):
            self.sessions[session_id] = {
                "intent": None, "origin": None, "origin_display": None,
                "destination": None, "destination_display": None,
                "travel_date": None, "departure_time_from": None,
                "departure_time_to": None, "arrival_deadline": None,
                "train_number": None, "train_name": None,
                "state": "IDLE", "last_lang": lang, "last_style": style,
            }
            session = self.sessions[session_id]

        # Step 4: Extract entities from current message
        parsed = self._extract_entities(query, session)

        # Step 5: Resolve station names → dataset codes
        station_resolved = self._resolve_stations(parsed, style)

        # Step 5a: If user gave a station not in dataset → tell them immediately
        if "invalid_station" in station_resolved:
            bad = station_resolved["invalid_station"]
            print(f"[RailIoAgent] STATION NOT IN DATASET: '{bad}'")
            return AgentResponse(
                answer=_ns(bad, style),
                toolsExecuted=[],
                confidenceScore=1.0,
                retrievedKnowledgeDocs=[]
            )

        # Step 5b: Merge resolved stations into parsed
        for k in ("origin", "origin_display", "destination", "destination_display"):
            if k in station_resolved and station_resolved[k] is not None:
                parsed[k] = station_resolved[k]

        # Remove raw fields (they've been resolved)
        parsed.pop("origin_raw", None)
        parsed.pop("destination_raw", None)

        # Step 6: Merge into session (never overwrite with None)
        for k, v in parsed.items():
            if v is not None:
                session[k] = v

        # Step 7: Intent detection
        find_train_signals = [
            "find a train", "need a train", "find train", "search train",
            "train from", "want to go", "which train", "kono train",
            "train ache", "train khujchi", "train chai", "train lagbe",
            "train dorkaro", "train chahiye", "train milega",
            "jabo", "jete chai", "jana hai", "jaana chahta",
            "যেতে চাই", "যাব", "ট্রেন চাই", "ট্রেন খুঁজি",
            "जाना है", "ट्रेन चाहिए",
        ]
        live_status_signals = [
            "where is", "live status", "current station",
            "current location", "status of", "kothay ache",
            "কোথায় আছে", "কোথায় এখন", "कहाँ है",
        ]

        is_live_status = (
            any(k in lower_query for k in live_status_signals) or
            (session["train_number"] and not session["origin"] and
             ("status" in lower_query or "where" in lower_query or len(lower_query.split()) <= 2))
        )
        is_find_train = (
            any(k in lower_query for k in find_train_signals) or
            bool(session["origin"] and session["destination"]) or
            session["intent"] == "find_train"
        )

        if is_find_train:
            session["intent"] = "find_train"
        elif is_live_status:
            session["intent"] = "live_status"

        # Step 7a: Specific train number lookup → validate against dataset FIRST
        if session.get("train_number") and not is_live_status and not is_find_train:
            t_num = session["train_number"]
            train_data = train_schedule_db.get(t_num)
            if train_data is None:
                print(f"[RailIoAgent] TRAIN NOT IN DATASET: {t_num}")
                return AgentResponse(
                    answer=_nt(t_num, style),
                    toolsExecuted=[],
                    confidenceScore=1.0,
                    retrievedKnowledgeDocs=[]
                )

        # Step 8: Debug log
        print("\n" + "=" * 50)
        print("DEBUG STATE LOG:")
        print(f"SESSION ID : {session_id}")
        print(f"LANG/STYLE : {lang} / {style}")
        print(f"USER MSG   : {query}")
        print(f"PARSED     : {parsed}")
        print(f"SESSION    : {session}")
        print(f"INTENT     : {session['intent']}")
        print("=" * 50 + "\n")

        tools_executed: List[ToolExecutionLog] = []

        # ── LIVE STATUS FLOW ──────────────────────────────────────────────────
        if session["intent"] == "live_status":
            train_num = session.get("train_number")
            if not train_num:
                return AgentResponse(
                    answer={
                        "en": "Please specify a train number for live status.",
                        "bn": "Live status জানতে train number দিন।",
                        "hi": "Live status के लिए train number बताएं।",
                        "banglish": "Live status janate train number din.",
                        "mixed": "Live status-এর জন্য train number দিন।",
                    }.get(style, "Please specify a train number for live status."),
                    toolsExecuted=tools_executed,
                    confidenceScore=1.0,
                    retrievedKnowledgeDocs=[]
                )

            # Validate train exists in dataset
            train_data = train_schedule_db.get(train_num)
            if train_data is None:
                return AgentResponse(
                    answer=_nt(train_num, style),
                    toolsExecuted=tools_executed,
                    confidenceScore=1.0,
                    retrievedKnowledgeDocs=[]
                )

            now = datetime.now()
            ctx = train_schedule_db.build_predictor_context(train_num, now)
            if ctx is None:
                return AgentResponse(
                    answer=_nt(train_num, style),
                    toolsExecuted=[], confidenceScore=1.0, retrievedKnowledgeDocs=[]
                )

            train_name = ctx["trainName"]
            live = ctx.get("liveState", {})

            # Check if live data has meaningful content
            live_speed = live.get("speed", 0)
            live_section = live.get("currentSection", "")
            live_next = live.get("nextStation", "")
            has_live_data = bool(live_section and live_next and live_section != "")

            if not has_live_data:
                return AgentResponse(
                    answer=_live_unavail(style),
                    toolsExecuted=[], confidenceScore=1.0, retrievedKnowledgeDocs=[]
                )

            ml_req = DelayPredictionRequest(
                trainNumber=train_num,
                currentSpeed=ctx["currentSpeed"],
                distanceRemaining=ctx["distanceKm"],
                weatherCondition="Clear",
                junctionCongestionLevel=0.4,
                day=ctx["day"], month=ctx["month"], dayOfWeek=ctx["dayOfWeek"],
                departureHour=ctx["departureHour"], departureMinute=ctx["departureMinute"],
                arrivalHour=ctx["arrivalHour"], arrivalMinute=ctx["arrivalMinute"],
                travelDurationMins=ctx["travelDurationMins"],
                distanceKm=ctx["distanceKm"], direction=ctx["direction"],
                departureDelay=ctx["departureDelay"]
            )
            ml_result = eta_predictor.predict(ml_req)
            delay_min = ml_result.predictedDelayMinutes
            status_icon = "🟢 On Time" if delay_min == 0 else f"🟡 +{delay_min} min delay predicted"

            current_section = live.get("currentSection", ctx.get("source", ""))
            next_station    = live.get("nextStation", ctx.get("destination", ""))

            if style == "bn":
                ans = (
                    f"🚆 **Live Status — {train_name} ({train_num})**\n\n"
                    f"• **বর্তমান অবস্থান**: {current_section}\n"
                    f"• **গতি**: {int(ctx['currentSpeed'])} km/h\n"
                    f"• **পরবর্তী স্টেশন**: {next_station}\n"
                    f"• **AI Delay Forecast**: {status_icon}\n"
                    f"• **Estimated Arrival**: {ml_result.arrivalWindow}\n"
                    f"• **Last Updated**: {now.strftime('%I:%M %p')}"
                )
            elif style == "hi":
                ans = (
                    f"🚆 **Live Status — {train_name} ({train_num})**\n\n"
                    f"• **वर्तमान स्थान**: {current_section}\n"
                    f"• **गति**: {int(ctx['currentSpeed'])} km/h\n"
                    f"• **अगला स्टेशन**: {next_station}\n"
                    f"• **AI Delay Forecast**: {status_icon}\n"
                    f"• **Estimated Arrival**: {ml_result.arrivalWindow}\n"
                    f"• **Last Updated**: {now.strftime('%I:%M %p')}"
                )
            elif style in ("banglish", "mixed"):
                ans = (
                    f"🚆 **Live Status — {train_name} ({train_num})**\n\n"
                    f"• **Current Location**: {current_section}\n"
                    f"• **Speed**: {int(ctx['currentSpeed'])} km/h\n"
                    f"• **Next Station**: {next_station}\n"
                    f"• **AI Delay Forecast**: {status_icon}\n"
                    f"• **Estimated Arrival**: {ml_result.arrivalWindow}\n"
                    f"• **Last Updated**: {now.strftime('%I:%M %p')}"
                )
            else:
                ans = (
                    f"🚆 **Live Status — {train_name} ({train_num})**\n\n"
                    f"• **Current Location**: {current_section}\n"
                    f"• **Speed**: {int(ctx['currentSpeed'])} km/h\n"
                    f"• **Next Station**: {next_station}\n"
                    f"• **Scheduled Departure**: {ctx['departureHour']:02d}:{ctx['departureMinute']:02d}\n"
                    f"• **AI Delay Forecast**: {status_icon}\n"
                    f"• **Estimated Arrival**: {ml_result.arrivalWindow}\n"
                    f"• **Last Updated**: {now.strftime('%I:%M %p')}"
                )
            return AgentResponse(
                answer=ans, toolsExecuted=tools_executed,
                confidenceScore=ml_result.confidenceScore,
                retrievedKnowledgeDocs=[]
            )

        # ── FIND TRAIN FLOW ───────────────────────────────────────────────────
        if session["intent"] == "find_train":

            # Missing route
            if not session["origin"] or not session["destination"]:
                session["state"] = "AWAITING_ROUTE"
                return AgentResponse(
                    answer=_r("AWAITING_ROUTE", style),
                    toolsExecuted=[], confidenceScore=1.0, retrievedKnowledgeDocs=[]
                )

            # Auto-set date to today — never ask the user
            if not session["travel_date"]:
                session["travel_date"] = "Today"

            # Missing departure time — ask ONCE, directly
            if not session["departure_time_from"]:
                session["state"] = "AWAITING_DEP_TIME"
                return AgentResponse(
                    answer=_r("AWAITING_DEP_TIME", style),
                    toolsExecuted=[], confidenceScore=1.0, retrievedKnowledgeDocs=[]
                )

            # Never ask for deadline — skip that step entirely

            # ── All fields collected → Search + ML Prediction ──
            session["state"] = "SEARCH_COMPLETE"
            orig      = session["origin"]       # dataset code, e.g. "SDAH"
            dest      = session["destination"]  # dataset code, e.g. "DKAE"
            orig_disp = session.get("origin_display") or orig
            dest_disp = session.get("destination_display") or dest
            deadline_str = session.get("arrival_deadline") or ""

            dep_from = session.get("departure_time_from")  # HH:MM or None
            dep_to   = session.get("departure_time_to")    # HH:MM or None

            # STRICT: search uses only dataset, with time-window filter
            candidate_trains = train_schedule_db.search_trains_with_segment_info(
                orig, dest,
                dep_time_from_hhmm=dep_from,
                dep_time_to_hhmm=dep_to,
            )
            now = datetime.now()
            results = []

            # Parse deadline
            deadline_h = 22  # default 10 PM
            if deadline_str and deadline_str.strip():
                dl = deadline_str.strip().upper()
                dl_match = re.search(r'(\d{1,2})(?::(\d{2}))?', dl)
                if dl_match:
                    deadline_h = int(dl_match.group(1))
                    # If deadline came from _parse_time_to_hhmm it's already 24h
                    # But check AM/PM suffix in original string
                    if "PM" in dl and deadline_h < 12:
                        deadline_h += 12
                    elif "AM" in dl and deadline_h == 12:
                        deadline_h = 0

            def _fmt_hhmm(hh: int, mm: int) -> str:
                """Format 24-h hour/min into 12-h display string."""
                period = "PM" if hh >= 12 else "AM"
                dh = hh if hh <= 12 else hh - 12
                if dh == 0: dh = 12
                return f"{dh:02d}:{mm:02d} {period}"

            for train_data in candidate_trains:
                t_num  = str(train_data.get("trainNumber", ""))
                t_name = train_data.get("name", f"Train {t_num}")

                seg_dep_str = train_data.get("segment_dep_time", "")
                seg_arr_str = train_data.get("segment_arr_time", "")
                seg_dur     = train_data.get("segment_duration_mins", 0.0)
                seg_dist    = train_data.get("segment_distance_km", 0.0)
                seg_night   = train_data.get("segment_overnight", False)
                orig_codes  = train_data.get("orig_codes", [])
                dest_codes  = train_data.get("dest_codes", [])

                print(f"\n[TRAIN VALIDATION] CHECKING train={t_num} dep={seg_dep_str} arr={seg_arr_str}")

                # Schedule sanity checks
                if not seg_dep_str or not seg_arr_str:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: missing dep/arr")
                    continue
                if seg_dur <= 5:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: dur={seg_dur:.0f}min too short")
                    continue
                if seg_dist <= 0:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: dist={seg_dist}km invalid")
                    continue

                # Build ML context
                ctx = train_schedule_db.build_predictor_context(
                    t_num, now, orig_codes=orig_codes, dest_codes=dest_codes
                )
                if ctx is None:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: not in DB")
                    continue

                # ML feature completeness check
                required_keys = [
                    "day", "month", "dayOfWeek", "departureHour", "departureMinute",
                    "arrivalHour", "arrivalMinute", "travelDurationMins", "distanceKm",
                    "direction", "departureDelay",
                ]
                missing = [k for k in required_keys if ctx.get(k) is None]
                if missing:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: missing ML features: {missing}")
                    continue

                print(f"[TRAIN VALIDATION] PASSED train={t_num}")

                # Call ML model — train_delay_model.pkl is the ONLY delay source
                try:
                    ml_req = DelayPredictionRequest(
                        trainNumber=t_num,
                        currentSpeed=ctx["currentSpeed"],
                        distanceRemaining=ctx["distanceKm"],
                        weatherCondition="Clear",
                        junctionCongestionLevel=0.4,
                        day=ctx["day"], month=ctx["month"], dayOfWeek=ctx["dayOfWeek"],
                        departureHour=ctx["departureHour"], departureMinute=ctx["departureMinute"],
                        arrivalHour=ctx["arrivalHour"], arrivalMinute=ctx["arrivalMinute"],
                        travelDurationMins=ctx["travelDurationMins"],
                        distanceKm=ctx["distanceKm"], direction=ctx["direction"],
                        departureDelay=ctx["departureDelay"]
                    )
                    ml_res = eta_predictor.predict(ml_req)
                    pred_delay = max(0, int(round(ml_res.predictedDelayMinutes)))
                except Exception as ml_err:
                    print(f"[TRAIN VALIDATION] REJECTED train={t_num}: ML error: {ml_err}")
                    continue

                print(f"[ML MODEL] predicted_delay={pred_delay}min for train {t_num}")

                # ETA from DATASET scheduled arrival + ML predicted delay
                arr_h = ctx["arrivalHour"]
                arr_m = ctx["arrivalMinute"]
                dep_h = ctx["departureHour"]
                dep_m = ctx["departureMinute"]

                est_total_m = arr_m + pred_delay
                est_arr_h   = arr_h + (est_total_m // 60)
                est_arr_m   = est_total_m % 60

                dep_formatted        = _fmt_hhmm(dep_h, dep_m)
                arr_formatted        = _fmt_hhmm(arr_h, arr_m)
                est_arrival_formatted = _fmt_hhmm(est_arr_h % 24, est_arr_m)

                print(f"[ETA] scheduled={arr_formatted} +{pred_delay}min → estimated={est_arrival_formatted}")

                # Deadline check
                if seg_night:
                    effective_est_h  = est_arr_h
                    effective_deadline = deadline_h + 24
                else:
                    effective_est_h  = est_arr_h
                    effective_deadline = deadline_h

                meets_deadline = (
                    effective_est_h < effective_deadline or
                    (effective_est_h == effective_deadline and est_arr_m == 0)
                )

                print(f"[DEADLINE] deadline_h={deadline_h:02d}:00 meets={meets_deadline}")

                results.append({
                    "trainNumber": t_num,
                    "name": t_name,
                    "departure": dep_formatted,
                    "scheduledArrival": arr_formatted,
                    "overnight": seg_night,
                    "predictedDelay": pred_delay,
                    "estimatedArrival": est_arrival_formatted,
                    "meetsDeadline": meets_deadline,
                })

            # Rank: deadline match first, then lower delay, then shorter journey
            results.sort(key=lambda x: (not x["meetsDeadline"], x["predictedDelay"]))

            # STRICT: if no results → never fabricate, always say no data
            if not results:
                # If time filter was active, give time-window specific message
                if dep_from or dep_to:
                    tf = dep_from or "00:00"
                    tt = dep_to   or "23:59"
                    tmpl = TIME_WINDOW_NO_DATA.get(style, TIME_WINDOW_NO_DATA["en"])
                    ans = tmpl.format(time_from=tf, time_to=tt)
                else:
                    ans = _nd(style)
                return AgentResponse(
                    answer=ans, toolsExecuted=tools_executed,
                    confidenceScore=1.0, retrievedKnowledgeDocs=[]
                )

            ans = self._format_results(results, orig_disp, dest_disp, deadline_str, style)
            return AgentResponse(
                answer=ans, toolsExecuted=tools_executed,
                confidenceScore=0.96, retrievedKnowledgeDocs=[]
            )

        # ── GENERAL KNOWLEDGE BASE (non-railway-search questions only) ──────
        # Only for policy/ticket/emergency questions — NOT for train search.
        # RULE: If user appears to be asking about a train/route but intent is
        #       not detected, never answer from LLM knowledge.
        railway_fact_signals = [
            "train", "ট্রেন", "rail", "রেল", "express", "rajdhani",
            "vande bharat", "shatabdi", "कोरोमंडल", "coromandel",
        ]
        if any(sig in lower_query for sig in railway_fact_signals):
            # User is asking about railways but no dataset intent matched → no fabrication
            if style == "bn":
                ans = "🚆 আমি শুধু Kolkata/পশ্চিমবঙ্গ এলাকার suburban local train নিয়ে সাহায্য করতে পারি।\nআপনার কি কোনো specific local train route আছে যেটা নিয়ে জানতে চান?"
            elif style == "hi":
                ans = "🚆 मैं केवल Kolkata/West Bengal के suburban local trains के बारे में मदद कर सकता हूँ।\nकोई specific route है जिसके बारे में जानना चाहते हैं?"
            elif style == "banglish":
                ans = "🚆 Ami shudhu Kolkata/West Bengal suburban local train niye help korte pari.\nKono specific route ache jeta niye jante chai?"
            elif style == "mixed":
                ans = "🚆 আমি শুধু Kolkata/West Bengal suburban local train নিয়ে help করতে পারি।\nKono specific local train route-এর কথা বলুন?"
            else:
                ans = "🚆 I can only help with suburban local trains in the Kolkata/West Bengal region.\nDo you have a specific local train route you'd like to check?"
            return AgentResponse(
                answer=ans, toolsExecuted=[],
                confidenceScore=1.0, retrievedKnowledgeDocs=[]
            )

        # General policy/ticket/emergency questions
        docs = knowledge_base.search(query, top_k=2)
        retrieved_titles = [d["title"] for d in docs]
        if docs:
            combined_info = "\n\n".join([f"**{d['title']}**:\n{d['content']}" for d in docs])
            ans = f"🚆 **Railway Information**:\n\n{combined_info}"
        else:
            # Catch-all: guide user toward the chatbot's scope
            if style == "bn":
                ans = "কিছু জিজ্ঞেস করুন 🚆 আমি Kolkata/পশ্চিমবঙ্গ এলাকার suburban local train সম্পর্কে সাহায্য করতে পারি।\nযেমন: 'শিয়ালদা থেকে ডানকুনি কোন ট্রেন আছে?'"
            elif style == "banglish":
                ans = "🚆 Ami Kolkata/West Bengal suburban local train niye help korte pari.\nJemon: 'Sealdah theke Dankuni kono train ache?'"
            else:
                ans = "🚆 I can help you find suburban local trains in the Kolkata/West Bengal region.\nTry: 'Find a train from Sealdah to Dankuni' or 'শিয়ালদা থেকে বান্ডেল কোন ট্রেন আছে?'"

        return AgentResponse(
            answer=ans, toolsExecuted=[],
            confidenceScore=0.90, retrievedKnowledgeDocs=retrieved_titles
        )


rail_agent = RailIoAgent()
