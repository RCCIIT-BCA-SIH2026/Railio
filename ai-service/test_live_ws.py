import asyncio
import websockets
import json

async def test_live_nav_ws():
    uri = "ws://localhost:8000/ws/live-nav"
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for setup message or sending dummy data...")
            
            # Send a dummy message just to see if connection holds and we get responses
            dummy_msg = {"text": "hello"}
            await websocket.send(json.dumps(dummy_msg))
            print("Sent dummy message.")
            
            while True:
                response = await websocket.recv()
                print(f"Received from server: {response}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_live_nav_ws())
