
import os
import json
import asyncio
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets


router = APIRouter()

# ─── Model & Endpoint Config ─────────────────────────────────────────────────

GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL",
    "models/gemini-2.5-flash-preview-native-audio-dialog",
)

GEMINI_WS_URL = (
    "wss://generativelanguage.googleapis.com/"
    "ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)

# ─── System Instruction ───────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = (
    "You are RailIo Live, a real-time visual navigation assistant. "
    "You are looking at the user's live camera view and listening to the user speak. "
    "Your job is to understand the physical environment from the camera frames "
    "and help the user navigate safely. "
    "\n\n"
    "Rules:\n"
    "- Do NOT invent objects, exits, doors, corridors or obstacles that are not "
    "visually supported by the camera frames you receive.\n"
    "- Answer naturally in the language the user is speaking. "
    "If the user speaks in Bengali, respond in Bengali. "
    "If in Hindi, respond in Hindi. If in English, respond in English. "
    "Do not force any single language.\n"
    "- For navigation questions, give short, precise instructions (1-2 sentences).\n"
    "- Prioritize immediate obstacles and safe movement paths.\n"
    "- If visual evidence is insufficient or the camera is unclear, "
    "say you cannot confidently determine the path.\n"
    "- Use the give_navigation_cue function ONLY when there is clear visual evidence "
    "of a navigable direction: e.g. a visible open doorway, a clear corridor, "
    "an exit sign, or an obstacle blocking a specific side.\n"
    "- Do NOT ask the user to 'open' a door if the door is already open. Instead, guide them to walk through the open doorway.\n"
    "- Never claim to see something you cannot see in the camera frames.\n"
    "- Keep responses concise — users are moving and need quick guidance.\n"
    "- Be calm, clear, and supportive."
)

# ─── Function Declaration ─────────────────────────────────────────────────────

NAVIGATION_TOOLS = [
    {
        "functionDeclarations": [
            {
                "name": "give_navigation_cue",
                "description": (
                    "Provide a directional navigation instruction based on the live camera view. "
                    "Only call this function when there is concrete visual evidence of a clear path "
                    "or an obstacle. Do not call it based on assumption."
                ),
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "direction": {
                            "type": "STRING",
                            "enum": ["left", "right", "forward", "back", "stop"],
                            "description": "The direction the user should move.",
                        },
                        "confidence": {
                            "type": "STRING",
                            "enum": ["low", "medium", "high"],
                            "description": "How confident you are based on visual evidence.",
                        },
                        "reason": {
                            "type": "STRING",
                            "description": (
                                "Brief visual reason, e.g. 'clear doorway visible on right', "
                                "'obstacle blocking path ahead', 'exit sign on left'."
                            ),
                        },
                        "distance_estimate": {
                            "type": "STRING",
                            "description": "Visual estimate of distance to the object/turn (e.g. '3m', '5m', 'immediate', 'unknown').",
                        },
                    },
                    "required": ["direction", "confidence"],
                },
            }
        ]
    }
]


@router.websocket("/live-nav")
async def live_nav_websocket(websocket: WebSocket, lang: str = "English"):
    await websocket.accept()
    print(f"[LiveNav] Client connected (Language: {lang})")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[LiveNav] ERROR: GEMINI_API_KEY is not set")
        await websocket.close(
            code=1011,
            reason="Backend configuration error: GEMINI_API_KEY not set",
        )
        return

    url = f"{GEMINI_WS_URL}?key={api_key}"

    # Build dynamic language instruction
    dynamic_instruction = (
        f"{SYSTEM_INSTRUCTION}\n"
        f"- You MUST speak and output text entirely in {lang}.\n"
        f"- When the user specifies a destination but it is not currently visible in the camera, you must immediately acknowledge their goal in {lang} and tell the user to 'Please slowly move the camera around the area' so you can locate it.\n"
        f"- Provide precise turn-by-turn navigation acting like a GPS system (e.g. 'go left', 'turn right', 'stop') as soon as you have visual confirmation of the path."
    )

    try:
        async with websockets.connect(
            url,
            max_size=None,
            ping_interval=20,
            ping_timeout=20,
            open_timeout=15,
        ) as gemini_ws:

            print("[LiveNav] Connected to Gemini Live API")

            # ── 1. SEND SETUP ──────────────────────────────────────────────────

            setup_message = {
                "setup": {
                    "model": GEMINI_LIVE_MODEL,
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": "Aoede"
                                }
                            }
                        }
                    },
                    "systemInstruction": {
                        "parts": [{"text": dynamic_instruction}]
                    },
                    "tools": NAVIGATION_TOOLS,
                }
            }

            print("[LiveNav] Sending setup to Gemini")
            await gemini_ws.send(json.dumps(setup_message))

            # ── 2. WAIT FOR SETUP COMPLETE ────────────────────────────────────

            try:
                raw = await asyncio.wait_for(gemini_ws.recv(), timeout=15.0)
                setup_resp = json.loads(raw)
                if "setupComplete" in setup_resp:
                    print("[LiveNav] Gemini setup complete — streaming ready")
                    # Notify the Android client
                    await websocket.send_json({"type": "setup_complete"})
                else:
                    print("[LiveNav] Unexpected setup response:", str(setup_resp)[:200])
            except asyncio.TimeoutError:
                print("[LiveNav] Timeout waiting for Gemini setupComplete")
            except Exception as e:
                print("[LiveNav] Setup response error:", e)

            # ── 3. CLIENT → GEMINI ────────────────────────────────────────────

            async def receive_from_client():
                try:
                    while True:
                        data = await websocket.receive_text()
                        payload = json.loads(data)

                        # ── AUDIO → realtimeInput.audio ─────────────────────
                        if payload.get("audio"):
                            msg = {
                                "realtimeInput": {
                                    "audio": {
                                        "data": payload["audio"],
                                        "mimeType": "audio/pcm;rate=16000",
                                    }
                                }
                            }
                            await gemini_ws.send(json.dumps(msg))
                            # Do NOT log base64 audio payload
                            # print("[LiveNav] Sending audio chunk")  # too noisy

                        # ── IMAGE → realtimeInput.video ─────────────────────
                        elif payload.get("image"):
                            msg = {
                                "realtimeInput": {
                                    "video": {
                                        "data": payload["image"],
                                        "mimeType": "image/jpeg",
                                    }
                                }
                            }
                            await gemini_ws.send(json.dumps(msg))
                            print("[LiveNav] Sending video frame to Gemini")

                        # ── TEXT → realtimeInput.text ───────────────────────
                        elif payload.get("text"):
                            msg = {
                                "realtimeInput": {
                                    "text": payload["text"]
                                }
                            }
                            await gemini_ws.send(json.dumps(msg))
                            print("[LiveNav] Sending text to Gemini:", payload["text"])

                        else:
                            print("[LiveNav] No valid payload in client message")

                except WebSocketDisconnect:
                    print("[LiveNav] Client disconnected")

                except websockets.exceptions.ConnectionClosed as e:
                    print("[LiveNav] Gemini connection closed while sending:", e)

                except json.JSONDecodeError as e:
                    print("[LiveNav] Invalid JSON from client:", e)

                except Exception as e:
                    print("[LiveNav] Error receiving from client:", e)
                    traceback.print_exc()

            # ── 4. GEMINI → CLIENT ────────────────────────────────────────────

            async def receive_from_gemini():
                try:
                    while True:
                        response_str = await gemini_ws.recv()

                        try:
                            response = json.loads(response_str)
                        except json.JSONDecodeError:
                            print("[LiveNav] Gemini response is not valid JSON")
                            continue

                        # ── setupComplete (may appear again mid-stream) ──────
                        if "setupComplete" in response:
                            print("[LiveNav] Gemini setup complete (late)")
                            continue

                        # ── goAway ──────────────────────────────────────────
                        if "goAway" in response:
                            print("[LiveNav] Gemini goAway received — connection will close")
                            await websocket.send_json({"type": "go_away"})
                            continue

                        # ── toolCallCancellation ────────────────────────────
                        if "toolCallCancellation" in response:
                            print("[LiveNav] Gemini tool call cancelled")
                            continue

                        # ── serverContent ───────────────────────────────────
                        server_content = response.get("serverContent")
                        if not server_content:
                            continue

                        # interrupted
                        if server_content.get("interrupted"):
                            print("[LiveNav] Gemini response interrupted")
                            await websocket.send_json({"type": "interrupted"})

                        # turnComplete
                        if server_content.get("turnComplete"):
                            print("[LiveNav] Gemini turn complete")
                            await websocket.send_json({"type": "turn_complete"})

                        # modelTurn
                        model_turn = server_content.get("modelTurn")
                        if not model_turn:
                            continue

                        parts = model_turn.get("parts", [])

                        for part in parts:

                            # ── Function call (navigation cue) ──────────────
                            if "functionCall" in part:
                                fc = part["functionCall"]
                                fn_name = fc.get("name", "")
                                fn_args = fc.get("args", {})
                                call_id = fc.get("id", "")

                                print("[LiveNav] Function call:", fn_name, fn_args)

                                if fn_name == "give_navigation_cue":
                                    direction = fn_args.get("direction")
                                    confidence = fn_args.get("confidence")
                                    reason = fn_args.get("reason")

                                    # Send nav cue to Android
                                    await websocket.send_json({
                                        "type": "nav_cue",
                                        "direction": direction,
                                        "confidence": confidence,
                                        "reason": reason,
                                    })
                                    print(
                                        f"[LiveNav] Navigation cue sent: {direction} "
                                        f"({confidence}) — {reason}"
                                    )

                                    # Send tool response back to Gemini to continue session
                                    tool_response = {
                                        "toolResponse": {
                                            "functionResponses": [
                                                {
                                                    "id": call_id,
                                                    "name": "give_navigation_cue",
                                                    "response": {"result": "success"},
                                                }
                                            ]
                                        }
                                    }
                                    await gemini_ws.send(json.dumps(tool_response))
                                    print("[LiveNav] Tool response sent to Gemini")

                            # ── Audio response (inlineData) ─────────────────
                            if "inlineData" in part:
                                inline = part["inlineData"]
                                mime = inline.get("mimeType", "")
                                audio_data = inline.get("data")

                                if audio_data and mime.startswith("audio/"):
                                    print(
                                        f"[LiveNav] Gemini audio received "
                                        f"({mime}, {len(audio_data)} chars base64)"
                                    )
                                    await websocket.send_json({
                                        "type": "audio",
                                        "audio": audio_data,
                                        "mimeType": mime,
                                    })

                            # ── Text response ───────────────────────────────
                            if "text" in part:
                                text = part.get("text", "")
                                if text:
                                    print("[LiveNav] Gemini text:", text)
                                    await websocket.send_json({
                                        "type": "text",
                                        "text": text,
                                    })

                except websockets.exceptions.ConnectionClosed as e:
                    print("[LiveNav] Gemini connection closed:", e)

                except WebSocketDisconnect:
                    print("[LiveNav] Client disconnected during Gemini receive")

                except Exception as e:
                    print("[LiveNav] Error receiving from Gemini:", e)
                    traceback.print_exc()

            # ── 5. RUN BOTH DIRECTIONS CONCURRENTLY ───────────────────────────

            client_task = asyncio.create_task(receive_from_client())
            gemini_task = asyncio.create_task(receive_from_gemini())

            done, pending = await asyncio.wait(
                [client_task, gemini_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            print("[LiveNav] One streaming task finished — cleaning up")

            for task in pending:
                task.cancel()

            await asyncio.gather(*pending, return_exceptions=True)

            for task in done:
                try:
                    task.result()
                except Exception as e:
                    print("[LiveNav] Streaming task error:", e)

    except websockets.exceptions.ConnectionClosed as e:
        print("[LiveNav] Gemini WebSocket connection closed:", e)
        try:
            await websocket.close(code=1011, reason="Gemini connection closed")
        except Exception:
            pass

    except Exception as e:
        print("[LiveNav] Fatal WebSocket error:", e)
        traceback.print_exc()
        try:
            await websocket.close(code=1011, reason="Internal error")
        except Exception:
            pass
