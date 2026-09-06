import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

if not API_KEY:
    print("Error: GEMINI_API_KEY not found in environment or .env file.")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

data = {
    "contents": [{
        "parts": [{"text": "Hello, test message"}]
    }]
}

response = requests.post(url, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
