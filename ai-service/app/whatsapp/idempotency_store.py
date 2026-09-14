import os
import sqlite3
import time
import logging
from threading import Lock
from typing import Set

logger = logging.getLogger(__name__)

class IdempotencyStore:
    """
    Production-grade, race-condition safe message deduplication store.
    Combines fast in-memory set cache with SQLite disk persistence.
    Prevents duplicate Meta webhook deliveries from triggering duplicate AI calls or bot replies.
    """
    def __init__(self, db_dir: str = None):
        if db_dir is None:
            db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        os.makedirs(db_dir, exist_ok=True)
        
        self.db_path = os.path.join(db_dir, "whatsapp_idempotency.db")
        self._lock = Lock()
        self._memory_cache: Set[str] = set()
        self._cache_max_size = 5000
        
        self._init_db()
        self._load_cache()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_db(self):
        try:
            with self._lock:
                with self._get_connection() as conn:
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS processed_messages (
                            message_id TEXT PRIMARY KEY,
                            from_number TEXT,
                            created_at REAL
                        );
                    """)
                    conn.execute("""
                        CREATE INDEX IF NOT EXISTS idx_created_at 
                        ON processed_messages(created_at);
                    """)
                    conn.commit()
        except Exception as e:
            logger.error(f"[IDEMPOTENCY DB] Initialization error: {e}")

    def _load_cache(self):
        try:
            with self._lock:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    # Load last 1000 message IDs into in-memory cache
                    cursor.execute(
                        "SELECT message_id FROM processed_messages ORDER BY created_at DESC LIMIT 1000"
                    )
                    rows = cursor.fetchall()
                    self._memory_cache = {r[0] for r in rows if r[0]}
            logger.info(f"[IDEMPOTENCY] Loaded {len(self._memory_cache)} message IDs into warm cache.")
        except Exception as e:
            logger.error(f"[IDEMPOTENCY DB] Cache load error: {e}")

    def is_duplicate(self, message_id: str) -> bool:
        if not message_id:
            return False

        with self._lock:
            if message_id in self._memory_cache:
                return True

        try:
            with self._lock:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1 FROM processed_messages WHERE message_id = ?", (message_id,))
                    row = cursor.fetchone()
                    if row:
                        self._memory_cache.add(message_id)
                        return True
        except Exception as e:
            logger.error(f"[IDEMPOTENCY DB] Duplicate check error: {e}")

        return False

    def mark_processed(self, message_id: str, from_number: str = None) -> bool:
        """
        Atomically attempts to record message_id.
        Returns True if newly inserted (not a duplicate).
        Returns False if message_id was already present (duplicate).
        """
        if not message_id:
            return True  # If no ID provided, allow processing defensively

        now = time.time()
        with self._lock:
            if message_id in self._memory_cache:
                return False

            try:
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT OR IGNORE INTO processed_messages (message_id, from_number, created_at) VALUES (?, ?, ?)",
                        (message_id, from_number or "", now)
                    )
                    conn.commit()
                    if cursor.rowcount > 0:
                        self._memory_cache.add(message_id)
                        # Trim cache if too large
                        if len(self._memory_cache) > self._cache_max_size:
                            self._memory_cache.clear()
                        return True
                    else:
                        self._memory_cache.add(message_id)
                        return False
            except Exception as e:
                logger.error(f"[IDEMPOTENCY DB] Mark processed error: {e}")
                # Fallback: add to memory cache and return True to proceed safely
                self._memory_cache.add(message_id)
                return True

    def cleanup_old(self, max_age_seconds: int = 86400):
        """Purges records older than max_age_seconds (default 24h)."""
        cutoff = time.time() - max_age_seconds
        try:
            with self._lock:
                with self._get_connection() as conn:
                    conn.execute("DELETE FROM processed_messages WHERE created_at < ?", (cutoff,))
                    conn.commit()
            logger.info(f"[IDEMPOTENCY DB] Cleaned up records older than {max_age_seconds}s.")
        except Exception as e:
            logger.error(f"[IDEMPOTENCY DB] Cleanup error: {e}")

idempotency_store = IdempotencyStore()
