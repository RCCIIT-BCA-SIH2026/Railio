import re
from app.whatsapp.state_manager import state_manager
from app.whatsapp.whatsapp_sender import whatsapp_sender
from app.whatsapp.model_adapter import model_adapter

class WhatsAppWorkflowHandler:
    def __init__(self):
        pass

    async def handle_incoming(self, from_number: str, text: str):
        session = state_manager.get_session(from_number)
        text_lower = text.strip().lower()

        # Handle explicit resets/greetings
        if text_lower in ["hi", "hello", "hey", "start", "/start", "menu"]:
            state_manager.reset_session(from_number)
            return await self.send_greeting(from_number)

        # Main State Machine
        if session.state == "IDLE":
            return await self.send_greeting(from_number)
            
        elif session.state == "AWAITING_TRAIN_TYPE":
            if text_lower in ["local train", "local"]:
                state_manager.update_session(from_number, train_type="LOCAL", state="AWAITING_ROLE")
            elif text_lower in ["express train", "express"]:
                state_manager.update_session(from_number, train_type="EXPRESS", state="AWAITING_ROLE")
            else:
                return await whatsapp_sender.send_text(from_number, "Please select a valid train type using the buttons.")
            return await self.ask_role(from_number, session.train_type)
            
        elif session.state == "AWAITING_ROLE":
            # For simplicity, accept the role from the button text directly
            # In production, we should validate against the staff_roles DB
            state_manager.update_session(from_number, role=text.upper(), state="AWAITING_QUERY")
            return await self.ask_query_type(from_number, text.upper())
            
        elif session.state == "AWAITING_QUERY":
            query_map = {
                "arrival time": "QUERY_ARRIVAL",
                "train location": "QUERY_LOCATION",
                "delay status": "QUERY_DELAY",
                "full train status": "QUERY_FULL_STATUS"
            }
            matched_query = query_map.get(text_lower, "QUERY_FULL_STATUS")
            
            # If train number is already in session, fetch data directly
            session = state_manager.update_session(from_number, query_type=matched_query)
            if session.train_number:
                return await self.fetch_and_send_data(from_number, session)
            else:
                state_manager.update_session(from_number, state="AWAITING_TRAIN_NUMBER")
                return await whatsapp_sender.send_text(from_number, "Please enter the Train Number (e.g., 34567 or 12345):")
                
        elif session.state == "AWAITING_TRAIN_NUMBER":
            # Extract numbers from text
            match = re.search(r'\d+', text)
            if match:
                train_num = match.group(0)
                session = state_manager.update_session(from_number, train_number=train_num, state="COMPLETED")
                return await self.fetch_and_send_data(from_number, session)
            else:
                return await whatsapp_sender.send_text(from_number, "I couldn't detect a train number. Please try again:")

        elif session.state == "COMPLETED":
            # Handle post-completion actions
            if text_lower == "refresh":
                return await self.fetch_and_send_data(from_number, session)
            elif text_lower == "change train":
                state_manager.update_session(from_number, state="AWAITING_TRAIN_NUMBER", train_number=None)
                return await whatsapp_sender.send_text(from_number, "Please enter the new Train Number:")
            elif text_lower == "main menu":
                state_manager.reset_session(from_number)
                return await self.send_greeting(from_number)
            else:
                return await whatsapp_sender.send_text(from_number, "Please use the buttons below to proceed.")

    async def send_greeting(self, from_number: str):
        state_manager.update_session(from_number, state="AWAITING_TRAIN_TYPE")
        buttons = [
            {"id": "TRAIN_TYPE_LOCAL", "title": "Local Train"},
            {"id": "TRAIN_TYPE_EXPRESS", "title": "Express Train"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number, 
            "👋 Welcome to RailIo Staff Assistant.\n\nPlease select the train type you are working with:",
            buttons
        )

    async def ask_role(self, from_number: str, train_type: str):
        # We use interactive list here since there are many roles
        sections = [
            {
                "title": "Operations & Station",
                "rows": [
                    {"id": "ROLE_GUARD", "title": "Guard", "description": ""},
                    {"id": "ROLE_TTE", "title": "Ticket Checker (TTE)", "description": ""},
                    {"id": "ROLE_STATION", "title": "Station Staff", "description": ""}
                ]
            },
            {
                "title": "Service Staff",
                "rows": [
                    {"id": "ROLE_SWEEPER", "title": "Sweeper", "description": ""},
                    {"id": "ROLE_LINEN", "title": "Linen Staff", "description": ""},
                    {"id": "ROLE_PANTRY", "title": "Pantry Staff", "description": ""}
                ]
            }
        ]
        return await whatsapp_sender.send_interactive_list(
            from_number,
            "Please select your role:",
            "Select Role",
            sections
        )

    async def ask_query_type(self, from_number: str, role: str):
        buttons = [
            {"id": "QUERY_ARRIVAL", "title": "Arrival Time"},
            {"id": "QUERY_LOCATION", "title": "Train Location"},
            {"id": "QUERY_FULL", "title": "Full Train Status"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number,
            "What do you need help with?",
            buttons
        )

    async def fetch_and_send_data(self, from_number: str, session):
        data = model_adapter.get_train_status(session.train_number, session.role)
        message_text = model_adapter.format_for_whatsapp(data, session.query_type, session.role)
        
        # Send data with followup actions
        await whatsapp_sender.send_text(from_number, message_text)
        
        followup_buttons = [
            {"id": "ACTION_REFRESH", "title": "Refresh"},
            {"id": "ACTION_CHANGE", "title": "Change Train"},
            {"id": "ACTION_MENU", "title": "Main Menu"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number,
            "Options:",
            followup_buttons
        )

workflow_handler = WhatsAppWorkflowHandler()
