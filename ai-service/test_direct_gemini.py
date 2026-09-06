import asyncio
import websockets
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_LIVE_MODEL", "models/gemini-2.5-flash-native-audio-latest")
WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"

async def test():
    url = f"{WS_URL}?key={API_KEY}"
    print(f"Connecting to: {url}")
    print(f"Model: {MODEL}")
    
    try:
        async with websockets.connect(url) as ws:
            setup = {
                "setup": {
                    "model": MODEL,
                    "generation_config": {
                        "response_modalities": ["AUDIO"]
                    }
                }
            }
            print("Sending setup...")
            await ws.send(json.dumps(setup))
            
            response = await ws.recv()
            print(f"Response: {response}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
