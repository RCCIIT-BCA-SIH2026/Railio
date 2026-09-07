import os
import asyncio
import websockets
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

async def test():
    if not API_KEY:
        print("Error: GEMINI_API_KEY not found in environment or .env file.")
        return
    url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}"
    
    async with websockets.connect(url) as ws:
        setup = {
            "setup": {
                "model": MODEL,
                "generation_config": {
                    "response_modalities": ["TEXT"]
                }
            }
        }
        await ws.send(json.dumps(setup))
        print("Setup sent!")
        
        response = await ws.recv()
        print(f"Response: {response}")

asyncio.run(test())
