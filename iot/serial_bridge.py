#!/usr/bin/env python3
"""
RailSathi - USB Serial to Web Dashboard Forwarder
Reads JSON telemetry from ESP32 via USB Cable and posts to RailSathi Backend.
"""

import sys
import json
import time
import requests

try:
    import serial  # type: ignore
    import serial.tools.list_ports  # type: ignore
except ImportError:
    print("Installing pyserial...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyserial"])
    import serial  # type: ignore
    import serial.tools.list_ports  # type: ignore

SERVER_URL = "http://localhost:5000/api/track/sensor"
BAUD_RATE = 115200

def find_esp32_port():
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "CP210" in port.description or "CH340" in port.description or "USB" in port.description or "Serial" in port.description:
            return port.device
    if len(ports) > 0:
        return ports[0].device
    return "COM7"

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else find_esp32_port()
    print("=" * 65)
    print(f"🚆 RailSathi - USB Serial Telemetry Forwarder")
    print(f"🔌 Reading ESP32 on: {port} @ {BAUD_RATE} baud")
    print(f"📡 Forwarding to:    {SERVER_URL}")
    print("=" * 65)

    try:
        ser = serial.Serial(port, BAUD_RATE, timeout=2)
        time.sleep(2) # Wait for serial to settle
        print(f"✅ Connected to {port}! Streaming data to Admin Web...\n")
    except Exception as e:
        print(f"❌ Could not open {port}: {e}")
        print("💡 Check your COM port in Device Manager or specify it: python iot/serial_bridge.py COM7")
        return

    while True:
        try:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue

            # Check if line is a valid JSON payload
            if line.startswith("{") and line.endswith("}"):
                data = json.loads(line)
                rms = data.get("vibrationRms", 0)
                is_anomaly = data.get("anomaly", False)
                status = "🔴 [ANOMALY]" if is_anomaly else "🟢 [NORMAL] "

                # Forward to backend
                try:
                    res = requests.post(SERVER_URL, json=data, timeout=1.0)
                    print(f"[{time.strftime('%H:%M:%S')}] {status} RMS: {rms}g (X:{data.get('accelX')} Y:{data.get('accelY')} Z:{data.get('accelZ')}) -> Admin Web OK")
                except Exception:
                    print(f"[{time.strftime('%H:%M:%S')}] {status} RMS: {rms}g (Backend offline)")
            else:
                print(f"[ESP32 Log] {line}")

        except KeyboardInterrupt:
            print("\nStopping forwarder...")
            break
        except Exception as e:
            time.sleep(0.1)

    ser.close()

if __name__ == "__main__":
    main()
