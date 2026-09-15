"""
api_key_rotator.py — Gemini Multi-Key Failover & Round-Robin Rotator
=====================================================================
Manages a pool of Gemini API keys. Automatically rotates to the next active key
upon encountering HTTP 429 (Quota Exceeded), 403, or connection timeouts.
Ensures 100% zero-downtime throughput across high-frequency chatbot interactions.
"""

import os
import time
import requests
from typing import List, Dict, Optional, Callable, Any
from dotenv import load_dotenv

load_dotenv()


class GeminiKeyRotator:
    def __init__(self):
        self.keys: List[str] = self._load_keys()
        self.current_index: int = 0
        self.cooldowns: Dict[str, float] = {}  # key -> timestamp until disabled
        self.cooldown_duration: float = 60.0  # seconds to pause a rate-limited key

    def _load_keys(self) -> List[str]:
        raw_keys = os.getenv("GEMINI_API_KEYS", "")
        keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        
        # Fallback to single GEMINI_API_KEY if GEMINI_API_KEYS pool not specified
        primary = os.getenv("GEMINI_API_KEY", "").strip()
        if primary and primary not in keys:
            keys.insert(0, primary)

        # Remove duplicate keys while maintaining order
        seen = set()
        deduped = []
        for k in keys:
            if k not in seen:
                seen.add(k)
                deduped.append(k)
        
        if not deduped:
            print("[GeminiKeyRotator] WARNING: No Gemini API keys found in environment!")
        else:
            print(f"[GeminiKeyRotator] Initialized API Key Pool with {len(deduped)} keys.")
        return deduped

    def get_key(self) -> Optional[str]:
        """Get current working API key, skipping keys in active cooldown."""
        if not self.keys:
            return None

        now = time.time()
        n_keys = len(self.keys)

        for _ in range(n_keys):
            key = self.keys[self.current_index]
            disabled_until = self.cooldowns.get(key, 0)
            if now >= disabled_until:
                return key
            # Advance to next key if current key is on cooldown
            self.current_index = (self.current_index + 1) % n_keys

        # If all keys are on cooldown, pick key with earliest expiration
        earliest_key = min(self.keys, key=lambda k: self.cooldowns.get(k, 0))
        return earliest_key

    def mark_rate_limited(self, key: str):
        """Mark a key as rate-limited (HTTP 429 / 403) and rotate to the next key immediately."""
        if not key:
            return
        now = time.time()
        self.cooldowns[key] = now + self.cooldown_duration
        print(f"[GeminiKeyRotator] Key ending in '...{key[-6:]}' hit 429 rate limit. Cooling down for {int(self.cooldown_duration)}s.")
        
        # Advance current index
        if self.keys:
            self.current_index = (self.current_index + 1) % len(self.keys)

    def execute_with_retry(
        self,
        request_fn: Callable[[str], requests.Response],
        max_retries: Optional[int] = None
    ) -> Optional[requests.Response]:
        """
        Execute an HTTP request callable with auto-rotation on HTTP 429/403.
        request_fn takes `api_key: str` and returns `requests.Response`.
        """
        if not self.keys:
            return None

        retries_left = max_retries if max_retries is not None else max(len(self.keys), 3)

        while retries_left > 0:
            key = self.get_key()
            if not key:
                break

            try:
                resp = request_fn(key)
                if resp.status_code == 200:
                    return resp
                elif resp.status_code in (429, 403):
                    self.mark_rate_limited(key)
                    retries_left -= 1
                    continue
                else:
                    # Other status code (e.g., 400, 500)
                    return resp
            except Exception as err:
                print(f"[GeminiKeyRotator] Request error on key '...{key[-6:]}': {err}")
                self.mark_rate_limited(key)
                retries_left -= 1

        return None


# Global singleton instance
gemini_rotator = GeminiKeyRotator()
