import time
from typing import Dict, Any, Optional
from dataclasses import dataclass, field

@dataclass
class SessionState:
    whatsapp_number: str
    state: str = "IDLE"
    train_type: Optional[str] = None
    role: Optional[str] = None
    query_type: Optional[str] = None
    train_number: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    last_updated: float = field(default_factory=time.time)

class StateManager:
    def __init__(self, timeout_seconds=1800):
        # In-memory session store (keyed by whatsapp_number)
        self.sessions: Dict[str, SessionState] = {}
        self.timeout_seconds = timeout_seconds

    def get_session(self, whatsapp_number: str) -> SessionState:
        session = self.sessions.get(whatsapp_number)
        now = time.time()
        
        if session:
            # Check timeout
            if now - session.last_updated > self.timeout_seconds:
                # Reset session on timeout
                self.reset_session(whatsapp_number)
                session = self.sessions[whatsapp_number]
            else:
                session.last_updated = now
        else:
            session = SessionState(whatsapp_number=whatsapp_number)
            self.sessions[whatsapp_number] = session
            
        return session

    def update_session(self, whatsapp_number: str, **kwargs):
        session = self.get_session(whatsapp_number)
        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)
        session.last_updated = time.time()
        return session

    def reset_session(self, whatsapp_number: str):
        self.sessions[whatsapp_number] = SessionState(whatsapp_number=whatsapp_number)

state_manager = StateManager()
