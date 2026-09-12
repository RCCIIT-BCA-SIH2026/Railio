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

class WhatsAppSender:
    def __init__(self):
        self.api_version = "v18.0"
        # Explicit timeout configuration: 3.0s connect, 7.0s read
        self.timeout = httpx.Timeout(10.0, connect=3.0, read=7.0)

    def _get_credentials(self):
        phone_number_id = os.getenv("WHATSAPP_WORKER_PHONE_NUMBER_ID", os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
        access_token = os.getenv(
            "WHATSAPP_WORKER_ACCESS_TOKEN", 
            os.getenv("WHATSAPP_ACCESS_TOKEN", os.getenv("META_WHATSAPP_TOKEN", ""))
        )
        return phone_number_id, access_token

    async def _send_payload(self, payload: dict) -> bool:
        phone_number_id, access_token = self._get_credentials()
        recipient_masked = mask_phone(payload.get("to", ""))

        if not phone_number_id or not access_token:
            logger.error(
                f"[WHATSAPP SENDER] Missing credentials! "
                f"PhoneID set={bool(phone_number_id)}, AccessToken set={bool(access_token)}"
            )
            return False

        url = f"https://graph.facebook.com/{self.api_version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        # Exponential backoff parameters: attempt 1 (0s), attempt 2 (~1s), attempt 3 (~2s), attempt 4 (~4s)
        max_attempts = 4
        base_delays = [0, 1.0, 2.0, 4.0]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(1, max_attempts + 1):
                delay = base_delays[attempt - 1]
                if delay > 0:
                    # Add jitter (+/- 20%)
                    jitter = delay * random.uniform(-0.2, 0.2)
                    total_sleep = max(0.1, delay + jitter)
                    logger.info(f"[WHATSAPP SENDER] Retrying send to {recipient_masked} (attempt {attempt}/{max_attempts}) in {total_sleep:.2f}s...")
                    await asyncio.sleep(total_sleep)
                else:
                    logger.info(f"[WHATSAPP SENDER] Dispatching message to {recipient_masked} (attempt {attempt}/{max_attempts})...")

                try:
                    res = await client.post(url, json=payload, headers=headers)
                    status = res.status_code

                    if status in (200, 201):
                        logger.info(f"[WHATSAPP SENDER] Outbound send SUCCESS status={status} recipient={recipient_masked}")
                        return True

                    # Non-retryable client errors (e.g. 400 bad request, 401 unauth, 403 forbidden, 404)
                    if 400 <= status < 500 and status != 429:
                        try:
                            err_body = res.json()
                        except Exception:
                            err_body = res.text[:200]
                        logger.error(f"[WHATSAPP SENDER] Permanent failure status={status} for {recipient_masked}: {err_body}")
                        return False

                    # Retryable server errors (500, 502, 503, 504, 429 rate limit)
                    try:
                        err_body = res.json()
                    except Exception:
                        err_body = res.text[:200]
                    logger.warning(f"[WHATSAPP SENDER] Transient failure status={status} attempt={attempt}/{max_attempts}: {err_body}")

                except (httpx.TimeoutException, httpx.NetworkError, httpx.RequestError) as net_err:
                    logger.warning(f"[WHATSAPP SENDER] Network/Timeout exception attempt={attempt}/{max_attempts}: {net_err}")
                except Exception as exc:
                    logger.error(f"[WHATSAPP SENDER] Unexpected exception attempt={attempt}/{max_attempts}: {exc}")

        logger.error(f"[WHATSAPP SENDER] Outbound message failed after {max_attempts} attempts for {recipient_masked}")
        return False

    async def send_text(self, to_number: str, text: str):
        clean_to = "".join(filter(str.isdigit, str(to_number)))
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        return await self._send_payload(payload)

    async def send_interactive_buttons(self, to_number: str, body_text: str, buttons: list):
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
        return await self._send_payload(payload)

    async def send_interactive_list(self, to_number: str, body_text: str, button_text: str, sections: list):
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
        return await self._send_payload(payload)

whatsapp_sender = WhatsAppSender()
