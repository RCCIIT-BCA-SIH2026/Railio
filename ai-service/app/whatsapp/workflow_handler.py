import re
import logging
from typing import Optional
from app.whatsapp.state_manager import state_manager
from app.whatsapp.whatsapp_sender import whatsapp_sender
from app.whatsapp.model_adapter import model_adapter

logger = logging.getLogger(__name__)

class WhatsAppWorkflowHandler:
    def __init__(self):
        pass

    async def handle_incoming(self, from_number: str, text: str, phone_number_id: Optional[str] = None):
        session = state_manager.get_session(from_number)
        text_raw = (text or "").strip()
        text_lower = text_raw.lower()
        text_upper = text_raw.upper()

        logger.info(f"[WORKFLOW] Handling incoming from={from_number} text='{text_raw}' state={session.state}")

        # Handle explicit resets/greetings
        if text_lower in ["hi", "hello", "hey", "start", "/start", "menu", "help", "staff", "action_menu"]:
            state_manager.reset_session(from_number)
            return await self.send_greeting(from_number, phone_number_id=phone_number_id)

        # Main State Machine
        if session.state == "IDLE":
            return await self.send_greeting(from_number, phone_number_id=phone_number_id)

        # 1. Train Type Selection (Buttons or Text)
        elif session.state == "AWAITING_TRAIN_TYPE" or text_upper.startswith("TRAIN_TYPE_"):
            if text_lower in ["local train", "local"] or text_upper == "TRAIN_TYPE_LOCAL":
                state_manager.update_session(from_number, train_type="LOCAL", state="AWAITING_ROLE")
            elif text_lower in ["express train", "express"] or text_upper == "TRAIN_TYPE_EXPRESS":
                state_manager.update_session(from_number, train_type="EXPRESS", state="AWAITING_ROLE")
            else:
                return await whatsapp_sender.send_text(
                    from_number, 
                    "Please select a valid train type using the buttons.", 
                    phone_number_id=phone_number_id
                )
            return await self.ask_role(from_number, state_manager.get_session(from_number).train_type, phone_number_id=phone_number_id)

        # 2. Role Selection (List Item or Text)
        elif session.state == "AWAITING_ROLE" or text_upper.startswith("ROLE_"):
            role_val = text_upper.strip()
            state_manager.update_session(from_number, role=role_val, state="AWAITING_QUERY")
            return await self.ask_query_type(from_number, role_val, phone_number_id=phone_number_id)

        # 3. Query Type Selection
        elif session.state == "AWAITING_QUERY" or text_upper.startswith("QUERY_"):
            query_map = {
                "arrival time": "QUERY_ARRIVAL",
                "train location": "QUERY_LOCATION",
                "delay status": "QUERY_DELAY",
                "full train status": "QUERY_FULL_STATUS",
                "query_arrival": "QUERY_ARRIVAL",
                "query_location": "QUERY_LOCATION",
                "query_full": "QUERY_FULL_STATUS"
            }
            matched_query = query_map.get(text_lower, "QUERY_FULL_STATUS")
            session = state_manager.update_session(from_number, query_type=matched_query)
            
            if session.train_number:
                return await self.fetch_and_send_data(from_number, session, phone_number_id=phone_number_id)
            else:
                state_manager.update_session(from_number, state="AWAITING_TRAIN_NUMBER")
                return await whatsapp_sender.send_text(
                    from_number, 
                    "Please enter the Train Number (e.g., 34567 or 12345):", 
                    phone_number_id=phone_number_id
                )

        # 4. Train Number Input
        elif session.state == "AWAITING_TRAIN_NUMBER" or re.search(r'\b\d{5}\b', text_raw):
            match = re.search(r'\d+', text_raw)
            if match:
                train_num = match.group(0)
                session = state_manager.update_session(from_number, train_number=train_num, state="COMPLETED")
                return await self.fetch_and_send_data(from_number, session, phone_number_id=phone_number_id)
            else:
                return await whatsapp_sender.send_text(
                    from_number, 
                    "I couldn't detect a train number. Please try again:", 
                    phone_number_id=phone_number_id
                )

        # 5. Post-completion Actions
        elif session.state == "COMPLETED" or text_upper.startswith("ACTION_"):
            if text_lower in ["refresh", "action_refresh"]:
                return await self.fetch_and_send_data(from_number, session, phone_number_id=phone_number_id)
            elif text_lower in ["change train", "action_change"]:
                state_manager.update_session(from_number, state="AWAITING_TRAIN_NUMBER", train_number=None)
                return await whatsapp_sender.send_text(
                    from_number, 
                    "Please enter the new Train Number:", 
                    phone_number_id=phone_number_id
                )
            elif text_lower in ["main menu", "action_menu"]:
                state_manager.reset_session(from_number)
                return await self.send_greeting(from_number, phone_number_id=phone_number_id)
            else:
                return await whatsapp_sender.send_text(
                    from_number, 
                    "Please use the buttons below to proceed.", 
                    phone_number_id=phone_number_id
                )

        # Default IDLE fallback -> Send Greeting
        state_manager.reset_session(from_number)
        return await self.send_greeting(from_number, phone_number_id=phone_number_id)

    async def send_greeting(self, from_number: str, phone_number_id: Optional[str] = None):
        state_manager.update_session(from_number, state="AWAITING_TRAIN_TYPE")
        buttons = [
            {"id": "TRAIN_TYPE_LOCAL", "title": "Local Train"},
            {"id": "TRAIN_TYPE_EXPRESS", "title": "Express Train"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number, 
            "👋 Welcome to RailIo Staff Assistant.\n\nPlease select the train type you are working with:",
            buttons,
            phone_number_id=phone_number_id
        )

    async def ask_role(self, from_number: str, train_type: Optional[str] = None, phone_number_id: Optional[str] = None):
        # Meta API restricts interactive lists to a maximum of 10 rows total
        sections = [
            {
                "title": "Operations & Security",
                "rows": [
                    {"id": "ROLE_GUARD", "title": "Train Guard"},
                    {"id": "ROLE_LOCO_PILOT", "title": "Loco Pilot"},
                    {"id": "ROLE_STATION_MASTER", "title": "Station Master"},
                    {"id": "ROLE_RPF", "title": "RPF / Security"}
                ]
            },
            {
                "title": "Passenger Services",
                "rows": [
                    {"id": "ROLE_TTE", "title": "Ticket Checker (TTE)"},
                    {"id": "ROLE_COACH_ATTENDANT", "title": "Coach Attendant"},
                    {"id": "ROLE_PANTRY", "title": "Catering / Pantry"}
                ]
            },
            {
                "title": "Maintenance & Cleaning",
                "rows": [
                    {"id": "ROLE_SWEEPER", "title": "Sweeper / Cleaners"},
                    {"id": "ROLE_OBHS", "title": "Housekeeping (OBHS)"},
                    {"id": "ROLE_AC_MECHANIC", "title": "Electrical / AC Tech"}
                ]
            }
        ]
        return await whatsapp_sender.send_interactive_list(
            from_number,
            "Please select your role from the list below:",
            "Select Role",
            sections,
            phone_number_id=phone_number_id
        )

    async def ask_query_type(self, from_number: str, role: str, phone_number_id: Optional[str] = None):
        buttons = [
            {"id": "QUERY_ARRIVAL", "title": "Arrival Time"},
            {"id": "QUERY_LOCATION", "title": "Train Location"},
            {"id": "QUERY_FULL", "title": "Full Train Status"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number,
            "What do you need help with?",
            buttons,
            phone_number_id=phone_number_id
        )

    async def fetch_and_send_data(self, from_number: str, session, phone_number_id: Optional[str] = None):
        data = model_adapter.get_train_status(session.train_number, session.role)
        message_text = model_adapter.format_for_whatsapp(data, session.query_type, session.role)
        
        # Send data status report
        await whatsapp_sender.send_text(from_number, message_text, phone_number_id=phone_number_id)
        
        followup_buttons = [
            {"id": "ACTION_REFRESH", "title": "Refresh"},
            {"id": "ACTION_CHANGE", "title": "Change Train"},
            {"id": "ACTION_MENU", "title": "Main Menu"}
        ]
        return await whatsapp_sender.send_interactive_buttons(
            from_number,
            "Options:",
            followup_buttons,
            phone_number_id=phone_number_id
        )

workflow_handler = WhatsAppWorkflowHandler()
