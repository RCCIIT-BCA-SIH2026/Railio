import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from app.whatsapp.state_manager import state_manager
from app.whatsapp.workflow_handler import workflow_handler

@pytest.fixture(autouse=True)
def reset_state():
    state_manager.sessions.clear()

@pytest.mark.asyncio
async def test_whatsapp_greeting_flow():
    from_number = "1234567890"
    
    with patch("app.whatsapp.whatsapp_sender.WhatsAppSender.send_interactive_buttons", new_callable=AsyncMock) as mock_send_buttons:
        # Step 1: User says Hi
        await workflow_handler.handle_incoming(from_number, "Hi")
        
        # Verify State
        session = state_manager.get_session(from_number)
        assert session.state == "AWAITING_TRAIN_TYPE"
        
        # Verify Message sent
        mock_send_buttons.assert_called_once()
        args, kwargs = mock_send_buttons.call_args
        assert args[0] == from_number
        assert "Welcome to RailIo Staff Assistant" in args[1]
        assert len(args[2]) == 2 # Local, Express

@pytest.mark.asyncio
async def test_full_conversation_flow():
    from_number = "9876543210"
    
    with patch("app.whatsapp.whatsapp_sender.WhatsAppSender.send_interactive_buttons", new_callable=AsyncMock) as mock_send_buttons, \
         patch("app.whatsapp.whatsapp_sender.WhatsAppSender.send_interactive_list", new_callable=AsyncMock) as mock_send_list, \
         patch("app.whatsapp.whatsapp_sender.WhatsAppSender.send_text", new_callable=AsyncMock) as mock_send_text, \
         patch("app.whatsapp.model_adapter.ExistingRailIoModelAdapter.get_train_status") as mock_get_status:
         
        mock_get_status.return_value = {
            "train_number": "34567",
            "current_location": "Test Station",
            "next_station": "Next Station",
            "distance_remaining": 10.0,
            "scheduled_arrival": "10:00",
            "expected_delay": 5,
            "status": "ON_TIME",
            "updated_at": "10:05 IST"
        }

        # 1. Greeting
        await workflow_handler.handle_incoming(from_number, "Hi")
        assert state_manager.get_session(from_number).state == "AWAITING_TRAIN_TYPE"
        
        # 2. Select Train Type
        await workflow_handler.handle_incoming(from_number, "local train")
        assert state_manager.get_session(from_number).state == "AWAITING_ROLE"
        assert state_manager.get_session(from_number).train_type == "LOCAL"
        
        # 3. Select Role
        await workflow_handler.handle_incoming(from_number, "ROLE_GUARD")
        assert state_manager.get_session(from_number).state == "AWAITING_QUERY"
        assert state_manager.get_session(from_number).role == "ROLE_GUARD"
        
        # 4. Select Query
        await workflow_handler.handle_incoming(from_number, "arrival time")
        assert state_manager.get_session(from_number).state == "AWAITING_TRAIN_NUMBER"
        
        # 5. Provide Train Number
        await workflow_handler.handle_incoming(from_number, "34567")
        assert state_manager.get_session(from_number).state == "COMPLETED"
        assert state_manager.get_session(from_number).train_number == "34567"
        
        # Verify the model was called
        mock_get_status.assert_called_with("34567", "ROLE_GUARD")
        mock_send_text.assert_called()
        
        # 6. Change Train
        await workflow_handler.handle_incoming(from_number, "change train")
        assert state_manager.get_session(from_number).state == "AWAITING_TRAIN_NUMBER"
        assert state_manager.get_session(from_number).train_number is None
