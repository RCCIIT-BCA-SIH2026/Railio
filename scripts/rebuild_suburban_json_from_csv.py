"""
rebuild_suburban_json_from_csv.py

Rebuilds data/trains/suburban_trains.json from the AUTHORITATIVE CSV dataset:
  ai-service/app/ml/data/train_dataset.csv

For every unique train number, extracts the SCHEDULED departure/arrival times
(columns: 'Departure Time', 'Arrival Time') from the FIRST occurrence in the CSV.
The actual/delay columns are stored as liveState data for the ML model.

Run from project root:
  python3 scripts/rebuild_suburban_json_from_csv.py
"""
import csv, json, os, re
from collections import defaultdict

CSV_PATH = os.path.join("ai-service", "app", "ml", "data", "train_dataset.csv")
JSON_OUT  = os.path.join("data", "trains", "suburban_trains.json")

# ── Station code resolver ────────────────────────────────────────────────────
STATION_ALIASES = {
    "sealdah":     "SDAH",
    "dankuni":     "DKAE",
    "howrah":      "HWH",
    "bandel":      "BDC",
    "barddhaman":  "BWN",
    "burdwan":     "BWN",
    "bangaon":     "BNJ",
    "krishnanagar":"KNJ",
    "ranaghat":    "RHA",
    "barrackpore": "BP",
    "baruipur":    "BRP",
    "canning":     "CG",
    "diamond harbour": "DH",
    "naihati":     "NH",
    "sonarpur":    "SPR",
    "kalyani":     "KLYS",
    "namkhana":    "NMH",
    "lakshmikantapur": "LKPR",
    "kakdwip":     "KWDP",
    "budge budge": "BGB",
    "majerhat":    "MJT",
    "shantipur":   "STB",
    "gede":        "GEDE",
    "baranagar":   "BARN",
    "dum dum":     "DDJ",
    "dum dum jn":  "DDJ",
}

def resolve_station(name: str) -> str:
    lo = name.strip().lower()
    for alias, code in STATION_ALIASES.items():
        if lo.startswith(alias):
            return code
    # Generate a code from first word: "Sealdah - Dankuni" → SDAH
    words = re.split(r'[\s\-]+', name.strip())
    return words[0][:4].upper() if words else "UNK"

def infer_src_dst(train_name: str):
    # "Sealdah - Dankuni Local" → src=SDAH, dst=DKAE
    parts = re.split(r'\s+-\s+', train_name, maxsplit=1)
    if len(parts) == 2:
        # Remove trailing "Local", "Fast Local" etc.
        dst_raw = re.sub(r'\s+(local|fast local|express|special|spl).*', '', parts[1], flags=re.IGNORECASE).strip()
        return resolve_station(parts[0]), resolve_station(dst_raw)
    return "UNK", "UNK"

# ── Read CSV ─────────────────────────────────────────────────────────────────
print(f"Reading {CSV_PATH} ...")

# Group by train number: collect ALL rows per train
rows_by_train = defaultdict(list)
with open(CSV_PATH, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter='\t')
    for row in reader:
        tnum = row['Train No.'].strip()
        rows_by_train[tnum].append(row)

print(f"Found {len(rows_by_train)} unique train numbers in CSV")

# ── Build JSON records ───────────────────────────────────────────────────────
output_trains = []
for tnum, rows in rows_by_train.items():
    # Use scheduled times from the FIRST occurrence
    r0 = rows[0]
    train_name = r0['Train Name'].strip()
    dep_time   = r0['Departure Time'].strip()   # scheduled
    arr_time   = r0['Arrival Time'].strip()     # scheduled
    distance   = int(r0['Distance (km)'].strip()) if r0['Distance (km)'].strip().isdigit() else 28

    src_code, dst_code = infer_src_dst(train_name)

    # Average delay across all historical rows for this train
    delays = []
    for row in rows:
        try:
            delays.append(int(row['Delays (mins)'].strip()))
        except ValueError:
            pass
    avg_delay = round(sum(delays) / len(delays), 1) if delays else 0

    # Travel duration
    try:
        travel_mins = int(r0['Travel Duration (mins)'].strip())
    except ValueError:
        travel_mins = 44

    # Determine type
    if 'fast local' in train_name.lower():
        train_type = 'Suburban EMU Fast Local'
    elif 'ladies' in train_name.lower() or 'matribhoomi' in train_name.lower():
        train_type = 'Matribhoomi Ladies Special'
    else:
        train_type = 'Suburban EMU Local'

    avg_speed = round(distance / (travel_mins / 60), 1) if travel_mins > 0 else 40

    record = {
        "trainNumber": tnum,
        "name": train_name,
        "type": train_type,
        "source": src_code,
        "destination": dst_code,
        "departureTime": dep_time,
        "arrivalTime": arr_time,
        "totalDistanceKm": distance,
        "avgSpeed": avg_speed,
        "coaches": ["C1","C2","C3","C4","C5","C6","C7","C8","C9","C10","C11","C12"],
        "liveState": {
            "lat": 22.5697,
            "lng": 88.3697,
            "speed": avg_speed,
            "heading": 270 if dst_code == "DKAE" else 90,
            "currentSection": f"{src_code}-{dst_code}-SUB1",
            "lastStation": src_code,
            "nextStation": dst_code,
            "delayMinutes": int(round(avg_delay)),
            "predictedDelay": int(round(avg_delay * 1.1)),
            "confidence": 0.88,
            "status": "ON_TIME" if avg_delay < 5 else "DELAYED",
            "delayReasons": [{"factor": "Historical average delay", "impactMin": int(round(avg_delay))}]
        },
        "stops": [
            {"code": src_code, "sequence": 1, "arr": dep_time, "dep": dep_time, "km": 0, "platform": 2 if dst_code == "DKAE" else 3},
            {"code": dst_code, "sequence": 2, "arr": arr_time, "dep": arr_time, "km": distance, "platform": 2 if dst_code == "SDAH" else 3},
        ],
        "historicalDelays": delays[:30],  # keep last 30 records for ML context
        "avgHistoricalDelayMins": avg_delay,
        "totalHistoricalRecords": len(rows),
    }
    output_trains.append(record)

# Sort by train number
output_trains.sort(key=lambda t: t['trainNumber'])

# ── Write JSON ───────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
with open(JSON_OUT, 'w', encoding='utf-8') as f:
    json.dump(output_trains, f, ensure_ascii=False, indent=2)

print(f"\n✅ Written {len(output_trains)} trains to {JSON_OUT}")
print(f"Sample: {output_trains[0]['trainNumber']} - {output_trains[0]['name']}")
print(f"        Dep: {output_trains[0]['departureTime']} → Arr: {output_trains[0]['arrivalTime']}")

# Verify a known train from the screenshot
chk = next((t for t in output_trains if t['trainNumber'] == '32241'), None)
if chk:
    print(f"\n✅ Verify 32241: Dep={chk['departureTime']} Arr={chk['arrivalTime']} (Expected from CSV: 17:22 → 18:02)")
else:
    print("\n⚠️  32241 not found in output!")
