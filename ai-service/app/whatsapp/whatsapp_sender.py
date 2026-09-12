import os
import asyncio
import random
import logging
import httpx

logger = logging.getLogger(__name__)

def mask_phone(phone: str) -> str:
    clean = "".join(filter(str.isdigit, str(phone or "")))
    if len(clean) >= 10:
        return clean[:3] + "****" + clean[-4:]
    return "****"

class WhatsAppSendResult:
    def __init__(self, success: bool, message_id: str = None, status_code: int = 0, error_code: str = None, error_message: str = None):
        self.success = success
        self.message_id = message_id
        self.status_code = status_code
        self.error_code = error_code
        self.error_message = error_message

    def __bool__(self):
        return self.success

class WhatsAppSender:
    def __init__(self):
        self.api_version = "v18.0"
        # Explicit timeout configuration: 3.0s connect, 7.0s read
        self.timeout = httpx.Timeout(10.0, connect=3.0, read=7.0)

    def _get_credentials(self, target_phone_id: str = None):
        worker_phone_id = os.getenv("WHATSAPP_WORKER_PHONE_NUMBER_ID", "1282348971633521")
        primary_phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1362878316903671")
        
        worker_token = os.getenv("WHATSAPP_WORKER_ACCESS_TOKEN", "")
        primary_token = os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_TOKEN", ""))

        if target_phone_id:
            target_str = str(target_phone_id).strip()
            if target_str == str(worker_phone_id).strip():
                return target_str, worker_token or primary_token
            elif target_str == str(primary_phone_id).strip():
                return target_str, primary_token or worker_token
            else:
                return target_str, primary_token or worker_token

        phone_number_id = worker_phone_id or primary_phone_id
        access_token = worker_token or primary_token
        return phone_number_id, access_token

    async def _send_payload(self, payload: dict, target_phone_id: str = None) -> WhatsAppSendResult:
        phone_number_id, access_token = self._get_credentials(target_phone_id)
        recipient_raw = str(payload.get("to", ""))
        recipient_masked = mask_phone(recipient_raw)

        if not phone_number_id or not access_token:
            logger.error(
                f"[WA-WORKER] META_ERROR status=401 code=CREDENTIALS_MISSING message='WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID missing' recipient={recipient_masked}"
            )
            return WhatsAppSendResult(success=False, status_code=401, error_code="CREDENTIALS_MISSING", error_message="WHATSAPP_ACCESS_TOKEN or PHONE_NUMBER_ID missing")

        url = f"https://graph.facebook.com/{self.api_version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        max_attempts = 4
        base_delays = [0, 1.0, 2.0, 4.0]

        logger.info(f"[WA] OUTBOUND_STARTED recipient={recipient_masked} phone_number_id={phone_number_id} api_version={self.api_version}")
        logger.info(f"[WHATSAPP] outbound_request_started recipient={recipient_masked} phone_number_id={phone_number_id}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(1, max_attempts + 1):
                delay = base_delays[attempt - 1]
                if delay > 0:
                    jitter = delay * random.uniform(-0.2, 0.2)
                    total_sleep = max(0.1, delay + jitter)
                    logger.info(f"[WA] OUTBOUND_RETRY attempt={attempt}/{max_attempts} in {total_sleep:.2f}s recipient={recipient_masked}")
                    await asyncio.sleep(total_sleep)

                start_req = asyncio.get_event_loop().time()
                try:
                    res = await client.post(url, json=payload, headers=headers)
                    duration_ms = (asyncio.get_event_loop().time() - start_req) * 1000
                    status = res.status_code

                    logger.info(f"[WHATSAPP] meta_response_received status={status} duration_ms={duration_ms:.1f} recipient={recipient_masked}")

                    if status in (200, 201):
                        msg_id = None
                        try:
                            res_json = res.json()
                            messages = res_json.get("messages", [])
                            if messages and isinstance(messages, list):
                                msg_id = messages[0].get("id")
                        except Exception:
                            pass
                        logger.info(f"[WA] OUTBOUND_COMPLETED success=True message_id={msg_id} recipient={recipient_masked}")
                        return WhatsAppSendResult(success=True, message_id=msg_id, status_code=status)

                    err_code = "UNKNOWN"
                    err_type = "UNKNOWN"
                    err_msg = res.text[:200]
                    fbtrace_id = ""

                    try:
                        err_json = res.json().get("error", {})
                        err_code = str(err_json.get("code", err_code))
                        err_type = str(err_json.get("type", err_type))
                        err_msg = str(err_json.get("message", err_msg))
                        fbtrace_id = str(err_json.get("fbtrace_id", ""))
                    except Exception:
                        pass

                    if 400 <= status < 500 and status != 429:
                        logger.error(
                            f"[WA-WORKER] META_ERROR status={status} code={err_code} error_type={err_type} message='{err_msg}' fbtrace_id={fbtrace_id} recipient={recipient_masked}"
                        )
                        return WhatsAppSendResult(success=False, status_code=status, error_code=err_code, error_message=err_msg)

                    logger.warning(
                        f"[WA] ERROR component=outbound_sender status={status} error_code={err_code} message='{err_msg}' attempt={attempt}/{max_attempts}"
                    )

                except (httpx.TimeoutException, httpx.NetworkError, httpx.RequestError) as net_err:
                    duration_ms = (asyncio.get_event_loop().time() - start_req) * 1000
                    logger.warning(f"[WA] ERROR component=outbound_network status=timeout_or_network duration_ms={duration_ms:.1f} attempt={attempt}/{max_attempts}: {net_err}")
                except Exception as exc:
                    logger.error(f"[WA] ERROR component=outbound_sender status=exception attempt={attempt}/{max_attempts}: {exc}")

        logger.error(f"[WA-WORKER] META_ERROR status=500 code=MAX_ATTEMPTS_EXCEEDED message='Max retries exceeded' recipient={recipient_masked}")
        return WhatsAppSendResult(success=False, status_code=500, error_code="MAX_ATTEMPTS_EXCEEDED", error_message="Max retries exceeded")

    async def send_text(self, to_number: str, text: str, phone_number_id: str = None):
        clean_to = "".join(filter(str.isdigit, str(to_number)))
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        return await self._send_payload(payload, target_phone_id=phone_number_id)

    async def send_interactive_buttons(self, to_number: str, body_text: str, buttons: list, phone_number_id: str = None):
        """
        buttons format: [{"id": "id1", "title": "Title 1"}] (max 3)
        """
        clean_to = "".join(filter(str.isdigit, str(to_number)))
        interactive_buttons = []
        for btn in buttons[:3]:
            interactive_buttons.append({
                "type": "reply",
                "reply": {
                    "id": btn["id"],
                    "title": btn["title"]
                }
            })

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {"buttons": interactive_buttons}
            }
        }
        return await self._send_payload(payload, target_phone_id=phone_number_id)

    async def send_interactive_list(self, to_number: str, body_text: str, button_text: str, sections: list, phone_number_id: str = None):
        """
        sections format: [
            {
                "title": "Section Title",
                "rows": [
                    {"id": "id1", "title": "Row 1", "description": "Desc"}
                ]
            }
        ]
        """
        clean_to = "".join(filter(str.isdigit, str(to_number)))
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {"text": body_text},
                "action": {
                    "button": button_text,
                    "sections": sections
                }
            }
        }
        return await self._send_payload(payload, target_phone_id=phone_number_id)

whatsapp_sender = WhatsAppSender()
