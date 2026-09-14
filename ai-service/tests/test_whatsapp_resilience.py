import pytest
import hmac
import hashlib
import json
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.whatsapp.idempotency_store import idempotency_store
from app.whatsapp.whatsapp_sender import whatsapp_sender, WhatsAppSender

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_idempotency_store():
    idempotency_store._memory_cache.clear()
    try:
        with idempotency_store._get_connection() as conn:
            conn.execute("DELETE FROM processed_messages;")
            conn.commit()
    except Exception:
        pass


def test_webhook_verification_valid_token():
    # GET /whatsapp/webhook with valid token
    response = client.get("/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=railio_whatsapp_verify_token_2026&hub.challenge=CHALLENGE_STRING_123")
    assert response.status_code == 200
    assert response.text == "CHALLENGE_STRING_123"

def test_webhook_verification_invalid_token():
    # GET /whatsapp/webhook with invalid token
    response = client.get("/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN_VALUE&hub.challenge=CHALLENGE_123")
    assert response.status_code == 403
    assert response.text == "Forbidden"

def test_webhook_verification_invalid_mode():
    # GET /whatsapp/webhook with invalid mode
    response = client.get("/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=railio_whatsapp_verify_token_2026&hub.challenge=CHALLENGE_123")
    assert response.status_code == 403

def test_inbound_whatsapp_message_success():
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "id": "1000000000000000",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": "919876543210",
                        "id": "wamid.TEST_BASIC_INBOUND_001",
                        "timestamp": "1725041400",
                        "text": {"body": "Hi"},
                        "type": "text"
                    }]
                },
                "field": "messages"
            }]
        }]
    }
    
    with patch("app.api.endpoints.whatsapp_sender.send_text", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        response = client.post("/whatsapp/webhook", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "received"

def test_duplicate_webhook_deduplication():
    msg_id = "wamid.TEST_DUPLICATE_999"
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "from": "919876543210",
                        "id": msg_id,
                        "timestamp": "1725041400",
                        "text": {"body": "Hi"},
                        "type": "text"
                    }]
                }
            }]
        }]
    }

    # First delivery — should be accepted
    res1 = client.post("/whatsapp/webhook", json=payload)
    assert res1.status_code == 200
    assert res1.json().get("status") == "received"

    # Second delivery — exact same message ID should be deduplicated
    res2 = client.post("/whatsapp/webhook", json=payload)
    assert res2.status_code == 200
    assert res2.json().get("status") == "duplicate_ignored"

def test_meta_status_event_handling():
    payload = {
        "object": "whatsapp_business_account",
        "entry": [{
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "statuses": [{
                        "id": "wamid.STATUS_MSG_001",
                        "status": "delivered",
                        "timestamp": "1725041400",
                        "recipient_id": "919876543210"
                    }]
                }
            }]
        }]
    }

    response = client.post("/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json().get("status") == "received"

    # Query status tracking endpoint
    st_res = client.get("/whatsapp/status/wamid.STATUS_MSG_001")
    assert st_res.status_code == 200
    st_data = st_res.json()
    assert st_data.get("found") is True
    assert st_data.get("current_status") == "delivered"

def test_malformed_webhook_payload_safety():
    # Empty JSON object
    res1 = client.post("/whatsapp/webhook", json={})
    assert res1.status_code == 200

    # Unexpected structure
    res2 = client.post("/whatsapp/webhook", json={"random": "data"})
    assert res2.status_code == 200

def test_signature_verification_rejection():
    with patch("app.api.endpoints.get_whatsapp_config") as mock_cfg:
        mock_cfg.return_value = {
            "phone_number_id": "12345",
            "access_token": "token",
            "verify_token": "railio_whatsapp_verify_token_2026",
            "app_secret": "my_secret_app_key"
        }
        payload_bytes = b'{"object": "whatsapp_business_account"}'
        
        # Missing or invalid signature
        headers = {"X-Hub-Signature-256": "sha256=invalid_hash_signature"}
        response = client.post("/whatsapp/webhook", content=payload_bytes, headers=headers)
        assert response.status_code == 403
        assert response.text == "Invalid Signature"

def test_health_endpoints():
    res1 = client.get("/health")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1.get("status") == "healthy"
    assert "whatsapp_env" in data1

    res2 = client.get("/health/whatsapp")
    assert res2.status_code == 200
    data2 = res2.json()
    assert "whatsapp_configured" in data2

@pytest.mark.asyncio
async def test_outbound_retry_logic():
    sender = WhatsAppSender()
    sender._get_credentials = MagicMock(return_value=("1234567890", "test_token"))

    # Simulate 2 transient network errors then success on attempt 3
    mock_response_fail = MagicMock()
    mock_response_fail.status_code = 503
    mock_response_fail.text = "Service Unavailable"

    mock_response_success = MagicMock()
    mock_response_success.status_code = 200

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_response_fail, mock_response_fail, mock_response_success]
        
        with patch("asyncio.sleep", new_callable=AsyncMock):
            success = await sender.send_text("919876543210", "Test message")
            assert bool(success) is True
            assert mock_post.call_count == 3
