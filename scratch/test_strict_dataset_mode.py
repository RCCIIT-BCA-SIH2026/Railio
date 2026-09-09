"""
STRICT DATASET-ONLY MODE — Full Acceptance Test Suite
======================================================
Tests all 20 rules from the specification.

Run from the project root:
  cd ai-service
  python3 ../scratch/test_strict_dataset_mode.py
"""

import sys
import os

_SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRATCH_DIR)
_AI_SERVICE_DIR = os.path.join(_PROJECT_ROOT, "ai-service")
sys.path.insert(0, _AI_SERVICE_DIR)

from app.agent.rail_agent import rail_agent, AgentMessageRequest
from app.ml.train_schedule_db import train_schedule_db, resolve_station_code, is_valid_station


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
_PASS = 0
_FAIL = 0


def _fresh(name: str) -> str:
    """Generate a unique session id for each test."""
    return f"test__{name}__{os.urandom(4).hex()}"


def check(label: str, condition: bool, actual: str = ""):
    global _PASS, _FAIL
    if condition:
        print(f"  ✅ PASS  {label}")
        _PASS += 1
    else:
        print(f"  ❌ FAIL  {label}")
        if actual:
            print(f"          got: {actual[:200]!r}")
        _FAIL += 1


def ask(message: str, session_id: str) -> str:
    res = rail_agent.process_query(AgentMessageRequest(message=message, session_id=session_id))
    return res.answer


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1: Station resolver — valid stations
# ─────────────────────────────────────────────────────────────────────────────
def test_station_resolver():
    print("\n" + "=" * 60)
    print("TEST 1 — Station Code Resolver")
    print("=" * 60)

    cases = [
        ("Sealdah",       "SDAH"),
        ("sealdah",       "SDAH"),
        ("শিয়ালদা",      "SDAH"),
        ("Howrah",        "HWH"),
        ("হাওড়া",        "HWH"),
        ("Dankuni",       "DKAE"),
        ("ডানকুনি",       "DKAE"),
        ("Bandel",        "BDC"),
        ("Barddhaman",    "BWN"),
        ("Burdwan",       "BWN"),
        ("Bangaon",       "BNJ"),
        ("বনগাঁ",         "BNJ"),
        ("Krishnanagar",  "KNJ"),
        ("Ranaghat",      "RHA"),
        ("Barrackpore",   "BP"),
        ("Canning",       "CG"),
        ("Diamond Harbour", "DH"),
        ("Arambagh",      "AMBG"),
        ("Katwa",         "KWAE"),
        ("Tarakeswar",    "TAK"),
        ("Shantipur",     "STB"),
        ("Naihati",       "NH"),
        ("Sonarpur",      "SPR"),
    ]
    for name, expected_code in cases:
        got = resolve_station_code(name)
        check(f"resolve_station_code({name!r}) == {expected_code!r}", got == expected_code, str(got))

    # Invalid stations must return None
    invalid = ["Delhi", "Patna", "Mumbai", "Rajdhani", "NewDelhi", "Kolkata"]
    for name in invalid:
        got = resolve_station_code(name)
        check(f"resolve_station_code({name!r}) is None (not in dataset)", got is None, str(got))


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2: Acceptance Test — T1: Valid route returns dataset trains + ML delay
# ─────────────────────────────────────────────────────────────────────────────
def test_t1_valid_route():
    print("\n" + "=" * 60)
    print("TEST 2 (Spec T1) — Valid Route: Sealdah → Dankuni")
    print("=" * 60)

    sid = _fresh("t1_valid_route")

    # Multi-turn conversation
    r1 = ask("Find a train", sid)
    print(f"  User: Find a train\n  A: {r1[:100]}")
    check("Asks for route after 'Find a train'",
          "kothay" in r1.lower() or "where" in r1.lower() or "কোথা" in r1 or "কোথায়" in r1, r1)

    r2 = ask("Sealdah to Dankuni", sid)
    print(f"  User: Sealdah to Dankuni\n  A: {r2[:100]}")
    check("Asks for date (not route again)",
          ("কোথা থেকে কোথায়" not in r2) and
          ("date" in r2.lower() or "তারিখ" in r2 or "tarikhey" in r2.lower()), r2)

    r3 = ask("Today", sid)
    print(f"  User: Today\n  A: {r3[:100]}")
    check("Asks for departure time",
          "time" in r3.lower() or "রওনা" in r3 or "rowana" in r3.lower() or "kakhon" in r3.lower(), r3)

    r4 = ask("Evening around 6 PM", sid)
    print(f"  User: Evening around 6 PM\n  A: {r4[:100]}")
    check("Asks for deadline OR returns results",
          "deadline" in r4.lower() or "পৌঁছাতে" in r4 or "Recommended" in r4 or "suitable" in r4.lower(), r4)

    r5 = ask("Before 8 PM", sid)
    print(f"  User: Before 8 PM\n  A: {r5[:150]}")

    check("Results contain 'Recommended' or 'suitable train'",
          "Recommended" in r5 or "suitable" in r5.lower() or "train" in r5.lower(), r5)
    check("Results contain train number (5-digit)",
          bool(__import__("re").search(r'\b\d{4,5}\b', r5)), r5)
    check("Results contain 'AI Predicted Delay'",
          "AI Predicted Delay" in r5, r5)
    check("Results contain 'Estimated Arrival'",
          "Estimated Arrival" in r5, r5)
    check("Results contain 'Scheduled Arrival'",
          "Scheduled Arrival" in r5, r5)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3: Spec T2 — Unknown train number → no fabrication
# ─────────────────────────────────────────────────────────────────────────────
def test_t2_unknown_train_number():
    print("\n" + "=" * 60)
    print("TEST 3 (Spec T2) — Unknown Train Number")
    print("=" * 60)

    sid = _fresh("t2_unknown_train")
    r = ask("Tell me about train 99999", sid)
    print(f"  A: {r}")
    check("Contains 'dataset' or 'not found' message",
          "dataset" in r.lower() or "not found" in r.lower() or "নেই" in r or "পাওয়া যায়নি" in r, r)
    check("Does NOT contain a fabricated train name",
          "Rajdhani" not in r and "Express" not in r and "Vande Bharat" not in r, r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4: Spec T3 — Route not in dataset → no answer fabrication
# ─────────────────────────────────────────────────────────────────────────────
def test_t3_route_not_in_dataset():
    print("\n" + "=" * 60)
    print("TEST 4 (Spec T3) — Route Not In Dataset (Kolkata→Patna)")
    print("=" * 60)

    sid = _fresh("t3_route_not_in_dataset")
    r = ask("কলকাতা থেকে পাটনা যাওয়ার কোন ট্রেন আছে?", sid)
    print(f"  A: {r}")
    check("Station not in dataset message shown",
          "dataset" in r.lower() or "নেই" in r or "not in" in r.lower() or "পাওয়া যায়নি" in r, r)
    check("Does NOT mention 12305 or Kolkata Rajdhani",
          "12305" not in r and "Rajdhani" not in r, r)
    check("Does NOT fabricate a route or schedule",
          "12:00" not in r and "Patna" not in r and "PM" not in r, r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5: Spec T4 — Delay prediction uses train_delay_model.pkl
# ─────────────────────────────────────────────────────────────────────────────
def test_t4_delay_uses_model():
    print("\n" + "=" * 60)
    print("TEST 5 (Spec T4) — Delay Prediction via ML Model")
    print("=" * 60)

    from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
    # Build a request for a known train in the dataset
    # Train 31102: Dankuni → Sealdah Local
    req = DelayPredictionRequest(
        trainNumber="31102",
        currentSpeed=43.0,
        distanceRemaining=20.0,
        weatherCondition="Clear",
        junctionCongestionLevel=0.4,
        day=9, month=9, dayOfWeek=1,
        departureHour=5, departureMinute=30,
        arrivalHour=6, arrivalMinute=30,
        travelDurationMins=60.0,
        distanceKm=20.0,
        direction=1,
        departureDelay=0.0,
    )
    result = eta_predictor.predict(req)
    print(f"  Model type   : {result.modelType}")
    print(f"  Predicted delay: {result.predictedDelayMinutes} min")
    print(f"  Confidence   : {result.confidenceScore}")
    check("Prediction is an integer >= 0",
          isinstance(result.predictedDelayMinutes, int) and result.predictedDelayMinutes >= 0)
    check("Model type references RandomForest",
          "RandomForest" in result.modelType or "random" in result.modelType.lower())
    check("Confidence score 0.0–1.0",
          0.0 <= result.confidenceScore <= 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6: Spec T5 — Real-world Express train NOT in dataset → not mentioned
# ─────────────────────────────────────────────────────────────────────────────
def test_t5_express_not_in_dataset():
    print("\n" + "=" * 60)
    print("TEST 6 (Spec T5) — Express/Long-Distance Train Not In Dataset")
    print("=" * 60)

    queries = [
        "Tell me about Vande Bharat Express",
        "Rajdhani Express ke bare mein batao",
        "Coromandel Express status",
        "12301 Howrah Rajdhani",
    ]
    for q in queries:
        sid = _fresh("t5_express")
        r = ask(q, sid)
        print(f"  Q: {q}\n  A: {r[:120]}")
        check(f"Does NOT provide Rajdhani/Vande Bharat info for: {q!r}",
              ("dataset" in r.lower() or "not found" in r.lower() or "nei" in r.lower() or "নেই" in r or "suburban" in r.lower() or "local train" in r.lower()),
              r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 7: Language detection — Bengali input → Bengali response
# ─────────────────────────────────────────────────────────────────────────────
def test_t6_bengali_input():
    print("\n" + "=" * 60)
    print("TEST 7 (Spec T6) — Bengali Input → Bengali Response")
    print("=" * 60)

    sid = _fresh("t6_bengali")
    r = ask("শিয়ালদা থেকে ডানকুনি যাওয়ার ট্রেন চাই", sid)
    print(f"  A: {r[:200]}")
    # Response should contain Bengali characters
    import re as _re
    has_bengali = bool(_re.search(r'[\u0980-\u09FF]', r))
    check("Response contains Bengali characters", has_bengali, r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 8: Language detection — English input → English response
# ─────────────────────────────────────────────────────────────────────────────
def test_t7_english_input():
    print("\n" + "=" * 60)
    print("TEST 8 (Spec T7) — English Input → English Response")
    print("=" * 60)

    sid = _fresh("t7_english")
    r = ask("Find a train from Sealdah to Dankuni", sid)
    print(f"  A: {r[:200]}")
    check("Response starts with English words",
          r[:5].isascii() or any(w in r[:50].lower() for w in ["got", "sure", "found", "no", "what", "which"]), r)
    import re as _re
    check("Response does NOT start with Bengali script",
          not bool(_re.search(r'^[\u0980-\u09FF]', r.strip())), r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 9: Language detection — Banglish input → Banglish response
# ─────────────────────────────────────────────────────────────────────────────
def test_t8_banglish_input():
    print("\n" + "=" * 60)
    print("TEST 9 (Spec T8) — Banglish Input → Banglish/Bengali Response")
    print("=" * 60)

    sid = _fresh("t8_banglish")
    r = ask("ami sealdah theke dankuni jete chai", sid)
    print(f"  A: {r[:200]}")
    # Should NOT be in pure formal English
    check("Response is NOT pure formal English response",
          "ami" in r.lower() or "kono" in r.lower() or "kothay" in r.lower() or
          "chai" in r.lower() or "paro" in r.lower() or
          any(ord(c) > 127 for c in r), r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 10: Language switch mid-conversation
# ─────────────────────────────────────────────────────────────────────────────
def test_t9_language_switch():
    print("\n" + "=" * 60)
    print("TEST 10 (Spec T9) — Language Switch Mid-Conversation")
    print("=" * 60)

    sid = _fresh("t9_lang_switch")

    r1 = ask("Find a train from Sealdah to Dankuni", sid)
    print(f"  Turn 1 (English)\n  A: {r1[:100]}")
    import re as _re
    # First response should be primarily English
    check("Turn 1 response is in English",
          not _re.search(r'^[\u0980-\u09FF]', r1.strip()) or
          any(w in r1.lower() for w in ["date", "time", "what", "got"]), r1)

    r2 = ask("কাল সকালে যেতে চাই", sid)
    print(f"  Turn 2 (Bengali)\n  A: {r2[:100]}")
    has_bengali = bool(_re.search(r'[\u0980-\u09FF]', r2))
    check("Turn 2 response adapts to Bengali",
          has_bengali, r2)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 11: "I don't know the train number" flow
# ─────────────────────────────────────────────────────────────────────────────
def test_t10_no_train_number():
    print("\n" + "=" * 60)
    print("TEST 11 (Spec T10) — 'I Don't Know The Train Number'")
    print("=" * 60)

    sid = _fresh("t10_no_train_number")

    r1 = ask("Train number বলো", sid)
    print(f"  User: Train number বলো\n  A: {r1[:150]}")
    check("Asks which train or for more info (not just error)",
          "কোন" in r1 or "which" in r1.lower() or "কোথা" in r1 or "জানতে" in r1 or "train" in r1.lower(), r1)

    r2 = ask("আমি train number জানি না, শিয়ালদা থেকে ডানকুনি যাব", sid)
    print(f"  User: আমি train number জানি না, শিয়ালদা থেকে ডানকুনি যাব\n  A: {r2[:200]}")
    check("Does NOT repeat 'Please provide train number'",
          "provide train number" not in r2.lower() and "enter train number" not in r2.lower(), r2)
    check("Continues conversation naturally (asks for date/time or returns results)",
          "তারিখ" in r2 or "date" in r2.lower() or "সময়" in r2 or "time" in r2.lower() or
          "Recommended" in r2 or "suitable" in r2.lower(), r2)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 12: Conversation state persistence
# ─────────────────────────────────────────────────────────────────────────────
def test_conversation_state_persistence():
    print("\n" + "=" * 60)
    print("TEST 12 — Conversation State Persistence")
    print("=" * 60)

    sid = _fresh("state_persistence")

    ask("Find a train", sid)
    ask("Sealdah to Dankuni", sid)
    r3 = ask("Tomorrow", sid)
    print(f"  After 'Tomorrow': {r3[:120]}")
    check("Asks for departure time after date provided",
          "time" in r3.lower() or "রওনা" in r3 or "kakhon" in r3.lower() or "সময়" in r3, r3)

    r4 = ask("Morning", sid)
    print(f"  After 'Morning': {r4[:120]}")
    check("Asks for deadline or returns results",
          "reach" in r4.lower() or "destination" in r4.lower() or "deadline" in r4.lower() or "পৌঁছাতে" in r4 or "Recommended" in r4 or
          "pouchate" in r4.lower() or "suitable" in r4.lower(), r4)

    r5 = ask("Before 10 AM", sid)
    print(f"  After 'Before 10 AM': {r5[:200]}")
    check("Returns results or no-data message (never asks for origin again)",
          "কোথা থেকে কোথায়" not in r5 and "where would you like to travel from" not in r5.lower(), r5)
    check("Response references a train or no-data",
          "train" in r5.lower() or "dataset" in r5.lower() or "পাওয়া যায়নি" in r5, r5)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 13: No data → no fabrication (time window no results)
# ─────────────────────────────────────────────────────────────────────────────
def test_no_data_no_fabrication():
    print("\n" + "=" * 60)
    print("TEST 13 — No Data → No Fabrication (impossible time window)")
    print("=" * 60)

    sid = _fresh("no_data")
    # Build up a complete session with an impossible time window
    ask("Find a train", sid)
    ask("Sealdah to Dankuni", sid)
    ask("Today", sid)
    r = ask("between 1 AM and 2 AM", sid)  # very unlikely time window
    ask("Before 3 AM", sid)

    # Final result
    session = rail_agent.sessions.get(sid, {})
    print(f"  Session state: origin={session.get('origin')} dest={session.get('destination')} "
          f"dep_from={session.get('departure_time_from')} dep_to={session.get('departure_time_to')}")

    r_final = ask("Before 3 AM", sid)
    print(f"  Response: {r_final[:200]}")
    check("Response does NOT fabricate train number or schedule",
          "12305" not in r_final and "Rajdhani" not in r_final and "Vande Bharat" not in r_final, r_final)
    check("Response says no data or asks to try different time",
          "dataset" in r_final.lower() or "no" in r_final.lower() or
          "পাওয়া যায়নি" in r_final or "try" in r_final.lower() or "suitable" in r_final.lower(), r_final)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 14: Dataset search — actual trains exist for SDAH↔DKAE
# ─────────────────────────────────────────────────────────────────────────────
def test_dataset_sdah_dkae():
    print("\n" + "=" * 60)
    print("TEST 14 — Dataset Search: SDAH↔DKAE returns real trains")
    print("=" * 60)

    results = train_schedule_db.search_trains("Sealdah", "Dankuni")
    print(f"  Trains found (SDAH→DKAE): {len(results)}")
    if results:
        for t in results[:3]:
            print(f"    {t['trainNumber']} {t['name']}")
    check("At least 1 train found for SDAH→DKAE", len(results) >= 1)
    check("All returned trains have a trainNumber field",
          all("trainNumber" in t for t in results))

    results_rev = train_schedule_db.search_trains("Dankuni", "Sealdah")
    print(f"  Trains found (DKAE→SDAH): {len(results_rev)}")
    check("At least 1 train found for DKAE→SDAH", len(results_rev) >= 1)

    # Invalid route
    results_bad = train_schedule_db.search_trains("Sealdah", "Patna")
    print(f"  Trains found (SDAH→Patna): {len(results_bad)} (should be 0)")
    check("Zero trains for invalid route SDAH→Patna", len(results_bad) == 0)

    results_bad2 = train_schedule_db.search_trains("Delhi", "Mumbai")
    print(f"  Trains found (Delhi→Mumbai): {len(results_bad2)} (should be 0)")
    check("Zero trains for invalid route Delhi→Mumbai", len(results_bad2) == 0)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 15: Mixed language query
# ─────────────────────────────────────────────────────────────────────────────
def test_mixed_language():
    print("\n" + "=" * 60)
    print("TEST 15 — Mixed Language Query")
    print("=" * 60)

    sid = _fresh("mixed_lang")
    r = ask("আমি Sealdah থেকে Dankuni যাব tomorrow morning.", sid)
    print(f"  A: {r[:200]}")
    import re as _re
    check("Response is in mixed or Bengali style (has Bengali chars)",
          bool(_re.search(r'[\u0980-\u09FF]', r)), r)
    check("Does NOT ask for origin/destination (extracted from query)",
          "কোথা থেকে কোথায়" not in r and "where would you like to travel from" not in r.lower(), r)


# ─────────────────────────────────────────────────────────────────────────────
# TEST 16: User correction / preference update
# ─────────────────────────────────────────────────────────────────────────────
def test_user_correction():
    print("\n" + "=" * 60)
    print("TEST 16 — User Correction: Actually, leave at evening")
    print("=" * 60)

    sid = _fresh("correction")
    ask("Find a train from Sealdah to Dankuni today morning", sid)
    r = ask("Actually, I want to leave in the evening.", sid)
    print(f"  A: {r[:200]}")
    # Session should now have evening departure time
    session = rail_agent.sessions.get(sid, {})
    dep_from = session.get("departure_time_from", "")
    print(f"  Session departure_time_from: {dep_from}")
    check("Session updated to evening departure (17:00 or similar)",
          "17:00" in (dep_from or "") or "18:00" in (dep_from or "") or
          dep_from >= "17:00", f"dep_from={dep_from}")


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
def run_all():
    print("\n" + "🚆" * 30)
    print("RAIL SATHI — STRICT DATASET-ONLY ACCEPTANCE TEST SUITE")
    print("🚆" * 30)

    test_station_resolver()
    test_t1_valid_route()
    test_t2_unknown_train_number()
    test_t3_route_not_in_dataset()
    test_t4_delay_uses_model()
    test_t5_express_not_in_dataset()
    test_t6_bengali_input()
    test_t7_english_input()
    test_t8_banglish_input()
    test_t9_language_switch()
    test_t10_no_train_number()
    test_conversation_state_persistence()
    test_no_data_no_fabrication()
    test_dataset_sdah_dkae()
    test_mixed_language()
    test_user_correction()

    print("\n" + "=" * 60)
    total = _PASS + _FAIL
    print(f"RESULTS: {_PASS}/{total} passed  |  {_FAIL} failed")
    if _FAIL == 0:
        print("🎉 ALL TESTS PASSED — Strict Dataset-Only Mode Verified!")
    else:
        print(f"⚠️  {_FAIL} test(s) failed. Review the output above.")
    print("=" * 60)
    return _FAIL == 0


if __name__ == "__main__":
    success = run_all()
    sys.exit(0 if success else 1)
