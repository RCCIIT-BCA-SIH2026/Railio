import os
import httpx
import logging

logger = logging.getLogger(__name__)

class WhatsAppSender:
    def __init__(self):
        # We can dynamically pull from environment
        self.api_version = "v18.0"

    def _get_credentials(self):
        phone_number_id = os.getenv("WHATSAPP_WORKER_PHONE_NUMBER_ID", os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
        access_token = os.getenv("WHATSAPP_WORKER_ACCESS_TOKEN", os.getenv("WHATSAPP_ACCESS_TOKEN", ""))
        return phone_number_id, access_token

    async def _send_payload(self, payload: dict) -> bool:
        phone_number_id, access_token = self._get_credentials()
        if not phone_number_id or not access_token:
            logger.error("[WHATSAPP SENDER] Missing credentials.")
            return False

        url = f"https://graph.facebook.com/{self.api_version}/{phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(url, json=payload, headers=headers, timeout=10.0)
                if res.status_code not in [200, 201]:
                    logger.error(f"[WHATSAPP SENDER] Error: {res.text}")
                    return False
                return True
            except Exception as e:
                logger.error(f"[WHATSAPP SENDER] Exception: {e}")
                return False

    async def send_text(self, to_number: str, text: str):
        clean_to = "".join(filter(str.isdigit, to_number))
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
        clean_to = "".join(filter(str.isdigit, to_number))
        
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
                "body": {
                    "text": body_text
                },
                "action": {
                    "buttons": interactive_buttons
                }
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
        clean_to = "".join(filter(str.isdigit, to_number))
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {
                    "text": body_text
                },
                "action": {
                    "button": button_text,
                    "sections": sections
                }
            }
        }
        return await self._send_payload(payload)

whatsapp_sender = WhatsAppSender()
