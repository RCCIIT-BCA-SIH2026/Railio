"""
test_senior_rag_ml.py — Comprehensive Test Suite for Senior ML + RAG Pipeline
=============================================================================
Verifies:
  1. Multi-dimensional Knowledge Indexing (Schedules, 5-Yr Delays, Crowd, Track, Weather, Policy)
  2. Dense Vector Embeddings & Offline Disk Caching
  3. Hybrid Retrieval (Dense + BM25 + Dynamic ML Execution)
  4. Grounded Multi-lingual RAG Generation (English, Bengali, Hindi, Banglish)
  5. Train 32211 & Train 32216 Deep-Dives
"""

import os
import sys
from datetime import datetime

# Add ai-service to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

if getattr(sys.stdout, 'encoding', None) != 'utf-8':
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')  # type: ignore
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')  # type: ignore
    except Exception:
        pass


from app.rag.embedding_client import embedding_client
from app.rag.train_knowledge_indexer import knowledge_indexer
from app.rag.hybrid_retriever import hybrid_retriever
from app.rag.rag_generator import rag_generator
from app.rag.knowledge_base import knowledge_base
from app.agent.rail_agent import rail_agent, AgentMessageRequest


def run_tests():
    print("=" * 70)
    print("       STARTING SENIOR ML + RAG SYSTEM VERIFICATION SUITE")
    print("=" * 70)

    # ── Test 1: Knowledge Chunks Verification ──
    print("\n[TEST 1] Verifying Knowledge Indexer Chunks...")
    total_chunks = len(knowledge_indexer.chunks)
    print(f"  ✓ Total Knowledge Chunks: {total_chunks}")
    assert total_chunks >= 45, f"Expected at least 45 chunks, got {total_chunks}"

    categories = set(c.category for c in knowledge_indexer.chunks)
    print(f"  ✓ Categories present: {categories}")
    for req_cat in ["SCHEDULE", "HISTORICAL_DELAYS", "CROWD", "TRACK_INFRA", "WEATHER", "POLICY"]:
        assert req_cat in categories, f"Missing required category: {req_cat}"

    # ── Test 2: Dense Embeddings Generation & Cache ──
    print("\n[TEST 2] Verifying Dense Embeddings & Vector Index Cache...")
    knowledge_indexer.build_and_cache_embeddings()
    cached_count = len(embedding_client.cache)
    print(f"  ✓ Cached Vector Embeddings count: {cached_count}")
    assert cached_count >= total_chunks, "Embeddings count should match chunks"

    # ── Test 3: Hybrid Retrieval for Train 32211 & 32216 ──
    print("\n[TEST 3] Testing Hybrid Retrieval & Dynamic ML Injection...")
    test_queries = [
        ("Tell me everything about train 32211", "32211"),
        ("What is the crowd density in train 32216 coach C6?", "32216"),
        ("Why is train 32211 delayed today according to ML model?", "32211"),
        ("What is the 5-year historical delay pattern for train 32211?", "32211"),
        ("What is the luggage allowance and tatkal refund rule?", None),
    ]

    for q, expected_train in test_queries:
        docs = hybrid_retriever.retrieve(q, top_k=4)
        print(f"\n  Query: '{q}'")
        print(f"  Retrieved {len(docs)} documents:")
        for idx, d in enumerate(docs, 1):
            print(f"    {idx}. [{d.chunk.category}] {d.chunk.title} (Score: {d.score:.2f}, Type: {d.match_type})")
        assert len(docs) > 0, f"No documents retrieved for '{q}'"
        if expected_train:
            assert any(expected_train in d.chunk.train_numbers or expected_train in d.chunk.title for d in docs), f"Expected train {expected_train} in retrieved docs"

    # ── Test 4: End-to-End Grounded RAG Generation ──
    print("\n[TEST 4] Testing Multi-lingual Grounded Generation...")
    
    multilingual_tests = [
        ("Tell me the full profile of train 32211: schedule, ML predicted delay, crowd, and route", "en"),
        ("ট্রেন ৩২২১১ (32211) এর শিডিউল, দেরি হওয়ার সম্ভাবনা এবং ট্র্যাকে কী কী স্টপ আছে বিস্তারিত বলুন", "bn"),
        ("ट्रेन 32211 का टाइमटेबल, देरी का अनुमान और सबसे खाली डिब्बा कौन सा है?", "hi"),
        ("32216 train-er coach C6 koto crowded aar least crowded coach konta?", "banglish"),
    ]

    for q, lang_style in multilingual_tests:
        print(f"\n--- Testing Query ({lang_style}): '{q}' ---")
        rag_res = knowledge_base.answer_query(q, language_style=lang_style, top_k=4)
        print(f"Synthesizer Model Used: {rag_res.get('modelUsed')}")
        print(f"Confidence Score: {rag_res.get('confidenceScore')}")
        print(f"Retrieved Sources: {rag_res.get('retrievedKnowledgeDocs')}")
        ans_text = str(rag_res.get('answer') or "")
        print(f"Answer Output:\n{ans_text[:350]}...\n")
        assert len(ans_text) > 50, "Answer too short"
        assert rag_res.get("confidenceScore", 0) >= 0.80, "Confidence score too low"

    # ── Test 5: RailAgent Chat Integration ──
    print("\n[TEST 5] Testing RailAgent Chat Integration with RAG...")
    agent_queries = [
        "What is the status and predicted delay for train 32211?",
        "How crowded is train 32216 and which coach should I board?",
        "Can I carry 60kg luggage in local train?",
    ]

    for aq in agent_queries:
        req = AgentMessageRequest(message=aq, session_id="test_suite_session")
        agent_res = rail_agent.process_query(req)
        print(f"\n  Agent Query: '{aq}'")
        print(f"  Confidence: {agent_res.confidenceScore}")
        print(f"  Tools Executed: {[t.tool for t in agent_res.toolsExecuted]}")
        print(f"  Answer Snippet:\n{agent_res.answer[:250]}...\n")
        assert len(agent_res.answer) > 30, "Agent answer should not be empty"

    print("=" * 70)
    print("      ALL SENIOR ML + RAG VERIFICATION TESTS PASSED SUCCESSFULLY! ✓")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
