"""
test_multi_key_rotation.py — Unit Tests for Gemini Multi-Key Failover & Pinecone Cloud RAG
========================================================================================
Tests key pool initialization, rotation on HTTP 429/403 rate limit triggers,
and Pinecone cloud vector integration.
"""

import unittest
import os
from unittest.mock import MagicMock

from app.rag.api_key_rotator import GeminiKeyRotator
from app.rag.pinecone_client import PineconeClient
from app.rag.embedding_client import embedding_client
from app.rag.rag_generator import rag_generator


class TestMultiKeyRotation(unittest.TestCase):

    def test_gemini_rotator_pool_initialization(self):
        rotator = GeminiKeyRotator()
        self.assertGreaterEqual(len(rotator.keys), 7, "Should load at least 7 Gemini API keys from environment")
        print(f"[OK] GeminiKeyRotator loaded {len(rotator.keys)} keys successfully.")

    def test_gemini_rotator_failover_rotation(self):
        rotator = GeminiKeyRotator()
        initial_key = rotator.get_key()
        self.assertIsNotNone(initial_key)

        # Simulate 429 rate limit trigger on initial key
        rotator.mark_rate_limited(initial_key)
        rotated_key = rotator.get_key()

        self.assertNotEqual(initial_key, rotated_key, "Rotator should switch to a different key upon 429 rate limit trigger")
        print(f"[OK] GeminiKeyRotator successfully rotated from key ending in ...{initial_key[-6:]} to ...{rotated_key[-6:]}")

    def test_pinecone_client_key_pool(self):
        client = PineconeClient()
        self.assertGreaterEqual(len(client.keys), 2, "Pinecone client should load 2 API keys from environment")
        print(f"[OK] PineconeClient initialized with {len(client.keys)} API keys.")

    def test_end_to_end_rag_with_rotator(self):
        res = rag_generator.generate_response(
            query="What is the luggage allowance policy for local trains?",
            retrieved_docs=[],
            language_style="en"
        )
        self.assertIn("answer", res)
        self.assertIn("modelUsed", res)
        print("[OK] RAG Generator executed with multi-key pool support.")


if __name__ == "__main__":
    unittest.main()
