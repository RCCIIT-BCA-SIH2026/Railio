import csv
import json
import os

# Stations mapper to codes
STATION_CODES = {
    "Arambagh": "AMBG",
    "Bandel": "BDC",
    "Barddhaman": "BWN",
    "Belmuri": "BMAE",
    "Chandanpur": "CDAE",
    "Goghat": "GOGT",
    "Katwa": "KWAE",
    "Shrirampur": "SRP",
    "Tarakeswar": "TAK",
    "Masagram": "MSAE",
    "Kamarkundu": "KQU",
    "Bangaon": "BNJ",
    "Barrackpore": "BP",
    "Baruipur": "BRP",
    "Budge Budge": "BGB",
    "Canning": "CG",
    "Dankuni": "DKAE",
    "Diamond Harbour": "DH",
    "Gede": "GEDE",
    "Hasnabad": "HNB",
    "Kakdwip": "KWDP",
    "Kalyani Simanta": "KLYS",
    "Krishnanagar": "KNJ",
    "Lakshmikantapur": "LKPR",
    "Majerhat": "MJT",
    "Naihati": "NH",
    "Namkhana": "NMH",
    "Ranaghat": "RHA",
    "Shantipur": "STB",
    "Sonarpur": "SPR",
    "Howrah": "HWH",
    "Sealdah": "SDAH"
}

# Coordinate mapping for stations
STATION_COORDS = {
    "AMBG": (22.8833, 87.7833),
    "BDC": (22.9234, 88.3789),
    "BWN": (23.2384, 87.8601),
    "BMAE": (22.9811, 88.1121),
    "CDAE": (22.9101, 88.2234),
    "GOGT": (22.8602, 87.7011),
    "KWAE": (23.6421, 88.1342),
    "SRP": (22.7534, 88.3421),
    "TAK": (22.8901, 87.9712),
    "MSAE": (23.1201, 87.9902),
    "KQU": (22.8398, 88.2012),
    "BNJ": (23.0392, 88.8234),
    "BP": (22.7601, 88.3782),
    "BRP": (22.3611, 88.4321),
    "BGB": (22.4811, 88.1812),
    "CG": (22.3121, 88.6534),
    "DKAE": (22.6872, 88.2934),
    "DH": (22.1812, 88.2012),
    "GEDE": (23.3892, 88.8789),
    "HNB": (22.5692, 88.9212),
    "KWDP": (21.8792, 88.1892),
    "KLYS": (22.9792, 88.4321),
    "KNJ": (23.4011, 88.5021),
    "LKPR": (22.1201, 88.4321),
    "MJT": (22.5192, 88.3212),
    "NH": (22.9011, 88.4212),
    "NMH": (21.7612, 88.2341),
    "RHA": (23.1812, 88.5634),
    "STB": (23.2501, 88.4321),
    "SPR": (22.4392, 88.4321),
    "HWH": (22.5857, 88.3432),
    "SDAH": (22.5675, 88.3712)
}

def generate_suburban_trains_json():
    csv_path = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_trains_schedule_dataset.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return
        
    trains = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            train_num = r.get("Train Number")
            train_name = r.get("Train Name")
            source = r.get("Source")
            destination = r.get("Destination")
            dep_time = r.get("Departure")
            arr_time = r.get("Arrival")
            journey_time = int(r.get("Journey Time (mins)", 30))
            distance = int(r.get("Distance (km)", 20))
            line = r.get("Line/Route")
            division = r.get("Division")
            direction = r.get("Direction")
            
            src_code = STATION_CODES.get(source, "HWH")
            dst_code = STATION_CODES.get(destination, "SDAH")
            
            avg_speed = int((distance / (journey_time / 60.0))) if journey_time > 0 else 40
            
            # Simple intermediate stops modeling
            stops = []
            stops.append({
                "code": src_code,
                "sequence": 1,
                "arr": dep_time,
                "dep": dep_time,
                "km": 0,
                "platform": 1
            })
            
            # Add intermediate stop based on line
            mid_station = None
            if "Tarakeswar" in line:
                mid_station = "KQU"
            elif "Main Line" in line and division == "Howrah":
                mid_station = "BDC"
            elif "Main Line" in line and division == "Sealdah":
                mid_station = "NH"
            elif "Chord Line" in line:
                mid_station = "DKAE"
            elif "South Line" in line:
                mid_station = "SPR"
            elif "Circular" in line:
                mid_station = "MJT"
                
            seq = 2
            if mid_station and mid_station != src_code and mid_station != dst_code:
                # Approximate mid stop time
                from_hour, from_min = map(int, dep_time.split(':'))
                mid_total = (from_hour * 60 + from_min + (journey_time // 2)) % 1440
                mid_arr = f"{mid_total // 60:02d}:{mid_total % 60:02d}"
                mid_dep = f"{(mid_total + 1) // 60:02d}:{(mid_total + 1) % 60:02d}"
                stops.append({
                    "code": mid_station,
                    "sequence": seq,
                    "arr": mid_arr,
                    "dep": mid_dep,
                    "km": distance // 2,
                    "platform": 2
                })
                seq += 1
                
            stops.append({
                "code": dst_code,
                "sequence": seq,
                "arr": arr_time,
                "dep": arr_time,
                "km": distance,
                "platform": 2
            })
            
            src_coords = STATION_COORDS.get(src_code, (22.5857, 88.3432))
            
            trains.append({
                "trainNumber": train_num,
                "name": train_name,
                "type": "Suburban EMU Local",
                "source": src_code,
                "destination": dst_code,
                "departureTime": dep_time,
                "arrivalTime": arr_time,
                "totalDistanceKm": distance,
                "avgSpeed": avg_speed,
                "coaches": ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12"],
                "liveState": {
                    "lat": src_coords[0],
                    "lng": src_coords[1],
                    "speed": 0,
                    "heading": 90,
                    "currentSection": f"{src_code}-{dst_code}-S1",
                    "lastStation": src_code,
                    "nextStation": dst_code,
                    "delayMinutes": 0,
                    "predictedDelay": 0,
                    "confidence": 0.95,
                    "status": "ON_TIME",
                    "delayReasons": []
                },
                "stops": stops,
                "lineRoute": line,
                "division": division,
                "direction": direction
            })
            
    json_path = r"c:\Users\dassh\Project\railsathi\data\trains\suburban_trains.json"
    with open(json_path, 'w', encoding='utf-8') as f_out:
        json.dump(trains, f_out, indent=2)
        
    print(f"Successfully compiled schedules CSV to JSON {json_path} ({len(trains)} trains)")

if __name__ == "__main__":
    generate_suburban_trains_json()
