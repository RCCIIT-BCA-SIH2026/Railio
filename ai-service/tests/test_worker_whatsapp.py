import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_worker_whatsapp_send_success():
    payload = {
        "to": "917439033504",
        "message": "Hello, your train 32216 is arriving on Platform 2.",
        "phone_number_id": "1282348971633521"
    }

    with patch("app.api.endpoints.whatsapp_sender.send_text", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True
        response = client.post("/admin/whatsapp/send", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert data.get("status") == "sent"
        assert data.get("recipient") == "917439033504"
        assert data.get("sender_type") == "worker"

        # Verify shared whatsapp_sender was invoked with exact parameters
        mock_send.assert_called_once_with(
            "917439033504",
            "Hello, your train 32216 is arriving on Platform 2.",
            phone_number_id="1282348971633521"
        )

def test_worker_whatsapp_send_missing_fields():
    # Missing message
    response = client.post("/admin/whatsapp/send", json={"to": "917439033504"})
    assert response.status_code == 400

    # Missing recipient
    response2 = client.post("/admin/whatsapp/send", json={"message": "Hello"})
    assert response2.status_code == 400

def test_worker_whatsapp_send_failure_propagation():
    payload = {
        "wa_id": "917439033504",
        "message": "Test message failure"
    }

    with patch("app.api.endpoints.whatsapp_sender.send_text", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = False
        response = client.post("/admin/whatsapp/send", json=payload)
        
        assert response.status_code == 500
        data = response.json()
        assert data.get("success") is False
        assert data.get("status") == "failed"
