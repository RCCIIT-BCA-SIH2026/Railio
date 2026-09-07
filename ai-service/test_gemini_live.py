import os
import asyncio
from google import genai
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY", "")

async def test_live():
    if not API_KEY:
        print("Error: GEMINI_API_KEY not found in environment or .env file.")
        return
    client = genai.Client(api_key=API_KEY)
    model = "gemini-2.0-flash-live-preview"
    
    config = {
        "response_modalities": ["TEXT"],
    }
    
    async with client.aio.live.connect(model=model, config=config) as session:
        print("Connected to Gemini Live!")
        await session.send("Hello, test message")
        async for response in session.receive():
            print(f"Response: {response}")
            break

asyncio.run(test_live())
