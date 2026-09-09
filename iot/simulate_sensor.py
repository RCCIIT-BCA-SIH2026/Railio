#!/usr/bin/env python3
"""
RailIo - ESP32 MPU6050 Track Vibration Telemetry Simulator
Simulates live sensor stream into Node.js / FastAPI backend.
"""

import time
import math
import random
import requests
import sys

SERVER_URL = "http://localhost:5000/api/track/sensor"
SECTION_ID = "SDAH-BNXR-SUB1"
TRAIN_NUMBER = "32211"

def generate_telemetry(tick, force_anomaly=False):
    if force_anomaly or (tick % 7 == 0 and tick > 0):
        # Anomaly condition: Spike in RMS
        ax = round(math.sin(tick) * 0.8 + random.uniform(1.8, 2.5), 3)
        ay = round(math.cos(tick) * 0.7 + random.uniform(1.2, 2.0), 3)
        az = round(1.0 + random.uniform(1.5, 2.2), 3)
    else:
        # Normal running
        ax = round(math.sin(tick) * 0.2 + random.uniform(-0.1, 0.1), 3)
        ay = round(math.cos(tick) * 0.15 + random.uniform(-0.1, 0.1), 3)
        az = round(0.98 + random.uniform(-0.08, 0.08), 3)

    rms = round(math.sqrt(ax**2 + ay**2 + az**2), 2)
    is_anomaly = rms >= 2.4

    payload = {
        "sectionId": SECTION_ID,
        "trainNumber": TRAIN_NUMBER,
        "accel": {"x": ax, "y": ay, "z": az},
        "gyro": {
            "x": round(random.uniform(-1.5, 1.5), 2),
            "y": round(random.uniform(-1.2, 1.2), 2),
            "z": round(random.uniform(-0.8, 0.8), 2)
        },
        "vibrationRms": rms,
        "accelX": ax,
        "accelY": ay,
        "accelZ": az
    }
    return payload, is_anomaly

def run_simulation(duration_seconds=30, interval_seconds=2.0):
    print("=" * 65)
    print(f"🚆 RailIo - ESP32 Track Vibration Simulator Started")
    print(f"📡 Target: {SERVER_URL} | Section: {SECTION_ID}")
    print("=" * 65)

    start_time = time.time()
    tick = 0

    while (time.time() - start_time) < duration_seconds:
        payload, is_anomaly = generate_telemetry(tick)
        status_icon = "🔴 [ANOMALY]" if is_anomaly else "🟢 [NORMAL] "

        try:
            res = requests.post(SERVER_URL, json=payload, timeout=2.0)
            print(f"[{time.strftime('%H:%M:%S')}] {status_icon} RMS: {payload['vibrationRms']}g | HTTP {res.status_code}")
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] {status_icon} RMS: {payload['vibrationRms']}g | (Offline Buffer - Server unreachable)")

        tick += 1
        time.sleep(interval_seconds)

    print("\n✅ Simulation completed.")

if __name__ == "__main__":
    dur = 30
    if len(sys.argv) > 1:
        dur = int(sys.argv[1])
    run_simulation(duration_seconds=dur)
