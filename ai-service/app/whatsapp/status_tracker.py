import os
import sqlite3
import time
import logging
from threading import Lock
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

def mask_phone_number(phone: str) -> str:
    clean = "".join(filter(str.isdigit, phone or ""))
    if len(clean) >= 10:
        return clean[:3] + "****" + clean[-4:]
    return "****"

class WhatsAppStatusTracker:
    """
    Tracks and records the status lifecycle (sent -> delivered -> read / failed)
    for outbound WhatsApp Cloud API messages.
    """
    def __init__(self, db_dir: Optional[str] = None):
        if db_dir is None:
            db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        os.makedirs(db_dir, exist_ok=True)
        
        self.db_path = os.path.join(db_dir, "whatsapp_status.db")
        self._lock = Lock()
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_db(self):
        try:
            with self._lock:
                with self._get_connection() as conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS message_status_events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            wamid TEXT,
                            status TEXT,
                            recipient TEXT,
                            event_timestamp TEXT,
                            error_code TEXT,
                            error_title TEXT,
                            error_message TEXT,
                            created_at REAL
                        );
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_wamid 
                        ON message_status_events(wamid);
                    """)
                    conn.commit()
        except Exception as e:
            logger.error(f"[STATUS_TRACKER DB] Initialization error: {e}")

    def record_status(
        self,
        wamid: str,
        status: str,
        recipient: str = "",
        timestamp: str = "",
        errors: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        if not wamid:
            return {}

        now = time.time()
        masked_recip = mask_phone_number(recipient)
        err_code, err_title, err_msg = "", "", ""

        if errors and isinstance(errors, list) and len(errors) > 0:
            err = errors[0]
            err_code = str(err.get("code", ""))
            err_title = str(err.get("title", ""))
            err_msg = str(err.get("message", ""))

        event_data = {
            "wamid": wamid,
            "status": status,
            "recipient": masked_recip,
            "timestamp": timestamp or str(int(now)),
            "error_code": err_code,
            "error_title": err_title,
            "error_message": err_msg,
            "recorded_at": now
        }

        try:
            with self._lock:
                # Update memory cache
                if wamid not in self._memory_cache:
                    self._memory_cache[wamid] = {
                        "wamid": wamid,
                        "recipient": masked_recip,
                        "current_status": status,
                        "history": [],
                        "errors": []
                    }
                
                cache_entry = self._memory_cache[wamid]
                cache_entry["current_status"] = status
                cache_entry["history"].append({"status": status, "timestamp": timestamp or str(int(now))})
                if err_code or err_msg:
                    cache_entry["errors"].append({
                        "code": err_code,
                        "title": err_title,
                        "message": err_msg,
                        "timestamp": timestamp or str(int(now))
                    })

                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        INSERT INTO message_status_events 
                        (wamid, status, recipient, event_timestamp, error_code, error_title, error_message, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (wamid, status, masked_recip, timestamp or str(int(now)), err_code, err_title, err_msg, now)
                    )
                    conn.commit()
        except Exception as e:
            logger.error(f"[STATUS_TRACKER DB] Record status error: {e}")

        return event_data

    def get_status(self, wamid: str) -> Optional[Dict[str, Any]]:
        if not wamid:
            return None

        with self._lock:
            if wamid in self._memory_cache:
                return self._memory_cache[wamid]

        try:
            with self._lock:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT status, recipient, event_timestamp, error_code, error_title, error_message FROM message_status_events WHERE wamid = ? ORDER BY id ASC",
                        (wamid,)
                    )
                    rows = cursor.fetchall()
                    if not rows:
                        return None

                    history = []
                    errors = []
                    last_status = rows[-1][0]
                    recipient = rows[0][1]

                    for r in rows:
                        st, recip, ts, e_code, e_title, e_msg = r
                        history.append({"status": st, "timestamp": ts})
                        if e_code or e_msg:
                            errors.append({"code": e_code, "title": e_title, "message": e_msg, "timestamp": ts})

                    result = {
                        "wamid": wamid,
                        "recipient": recipient,
                        "current_status": last_status,
                        "history": history,
                        "errors": errors
                    }
                    self._memory_cache[wamid] = result
                    return result
        except Exception as e:
            logger.error(f"[STATUS_TRACKER DB] Get status error: {e}")
            return None

    def get_recent_statuses(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with self._lock:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        SELECT wamid, status, recipient, event_timestamp, error_code, error_title, error_message, created_at 
                        FROM message_status_events 
                        ORDER BY id DESC LIMIT ?
                        """,
                        (limit,)
                    )
                    rows = cursor.fetchall()
                    return [
                        {
                            "wamid": r[0],
                            "status": r[1],
                            "recipient": r[2],
                            "timestamp": r[3],
                            "error_code": r[4],
                            "error_title": r[5],
                            "error_message": r[6],
                            "recorded_at": r[7]
                        }
                        for r in rows
                    ]
        except Exception as e:
            logger.error(f"[STATUS_TRACKER DB] Get recent statuses error: {e}")
            return []

whatsapp_status_tracker = WhatsAppStatusTracker()
