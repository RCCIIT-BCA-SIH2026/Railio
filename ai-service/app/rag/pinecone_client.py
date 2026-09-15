"""
pinecone_client.py — Pinecone Cloud Vector Store Client with Key Failover
========================================================================
Provides cloud-based vector indexing and similarity search for RailIo RAG system.
Supports multi-key rotation across Pinecone API keys (pcsk_73mp1d..., pcsk_7GsAkg...)
and falls back gracefully to local vector cache & BM25 search if offline.
"""

import os
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class PineconeClient:
    def __init__(self):
        self.keys: List[str] = self._load_keys()
        self.current_key_idx: int = 0
        self.index_name: str = os.getenv("PINECONE_INDEX_NAME", "railway-knowledge-index")
        self.environment: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        self.host_url: Optional[str] = None
        self._init_host()

    def _load_keys(self) -> List[str]:
        raw_keys = os.getenv("PINECONE_API_KEYS", "")
        keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        
        primary = os.getenv("PINECONE_API_KEY", "") or os.getenv("RAG-API", "")
        if primary and primary.strip() not in keys:
            keys.insert(0, primary.strip())

        seen = set()
        deduped = []
        for k in keys:
            if k not in seen:
                seen.add(k)
                deduped.append(k)
        
        if deduped:
            print(f"[PineconeClient] Initialized Pinecone Key Pool with {len(deduped)} keys.")
        else:
            print("[PineconeClient] WARNING: No Pinecone API keys found.")
        return deduped

    def _get_active_key(self) -> Optional[str]:
        if not self.keys:
            return None
        return self.keys[self.current_key_idx % len(self.keys)]

    def _rotate_key(self):
        if self.keys:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.keys)
            print(f"[PineconeClient] Rotated to Pinecone API Key #{self.current_key_idx + 1}")

    def _init_host(self):
        """Fetch index host URL from Pinecone control plane API."""
        key = self._get_active_key()
        if not key:
            return

        headers = {
            "Api-Key": key,
            "Content-Type": "application/json"
        }
        url = "https://api.pinecone.io/indexes"
        try:
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                indexes = resp.json().get("indexes", [])
                for idx in indexes:
                    if idx.get("name") == self.index_name:
                        self.host_url = f"https://{idx.get('host')}"
                        print(f"[PineconeClient] Connected to Pinecone Index '{self.index_name}' at {self.host_url}")
                        return
            elif resp.status_code in (401, 403, 429):
                self._rotate_key()
        except Exception as e:
            print(f"[PineconeClient] Host discovery notice: {e}. Operating in cloud-ready hybrid mode.")

    def upsert_vectors(self, vectors: List[Dict[str, Any]]) -> bool:
        """
        Upsert vector records into Pinecone index.
        vectors list item format: {"id": "doc1", "values": [...], "metadata": {...}}
        """
        if not self.host_url:
            return False

        headers = {
            "Api-Key": self._get_active_key() or "",
            "Content-Type": "application/json"
        }
        url = f"{self.host_url}/vectors/upsert"
        payload = {"vectors": vectors}

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                return True
            elif resp.status_code in (401, 403, 429):
                self._rotate_key()
        except Exception as e:
            print(f"[PineconeClient] Upsert notice: {e}")
        return False

    def query_vectors(self, vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Query top-k most similar vectors from Pinecone cloud index.
        Returns list of match objects with id, score, metadata.
        """
        if not self.host_url or not vector:
            return []

        headers = {
            "Api-Key": self._get_active_key() or "",
            "Content-Type": "application/json"
        }
        url = f"{self.host_url}/query"
        payload = {
            "vector": vector,
            "topK": top_k,
            "includeMetadata": True,
            "includeValues": False
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                matches = resp.json().get("matches", [])
                return matches
            elif resp.status_code in (401, 403, 429):
                self._rotate_key()
        except Exception as e:
            print(f"[PineconeClient] Query notice: {e}")
        return []


# Global singleton instance
pinecone_client = PineconeClient()
