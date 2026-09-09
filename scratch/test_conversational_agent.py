"""
Verification Test Suite for RailIo Chatbot Conversational Train Search & ML Delay Model Flow
Verifies all 7 required test cases from the user requirements prompt.
"""

import sys
import os

# Add ai-service to path
_SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRATCH_DIR)
_AI_SERVICE_DIR = os.path.join(_PROJECT_ROOT, "ai-service")
sys.path.insert(0, _AI_SERVICE_DIR)

from app.agent.rail_agent import rail_agent, AgentMessageRequest

def run_tests():
    print("=" * 60)
    print("RUNNING CONVERSATIONAL RAILWAY AGENT TEST SUITE")
    print("=" * 60)

    # TEST 1: User says "Find a train"
    req1 = AgentMessageRequest(message="Find a train", session_id="test_session_1")
    res1 = rail_agent.process_query(req1)
    print("\n[TEST 1] User: Find a train")
    print(f"Assistant Output:\n{res1.answer}")
    assert "কোথা থেকে কোথায় যেতে চান" in res1.answer or "Where would you like to travel" in res1.answer, "TEST 1 FAILED"
    assert "5-digit" not in res1.answer, "TEST 1 FAILED: Forced 5-digit prompt detected!"
    print("✅ TEST 1 PASSED!")

    # TEST 2: User says "Kolkata to Delhi"
    req2 = AgentMessageRequest(message="Kolkata to Delhi", session_id="test_session_1")
    res2 = rail_agent.process_query(req2)
    print("\n[TEST 2] User: Kolkata to Delhi")
    print(f"Assistant Output:\n{res2.answer}")
    assert "তারিখে যেতে চান" in res2.answer or "date would you like to travel" in res2.answer, "TEST 2 FAILED"
    print("✅ TEST 2 PASSED!")

    # TEST 3: User says "Tomorrow"
    req3 = AgentMessageRequest(message="Tomorrow", session_id="test_session_1")
    res3 = rail_agent.process_query(req3)
    print("\n[TEST 3] User: Tomorrow")
    print(f"Assistant Output:\n{res3.answer}")
    assert "রওনা দিতে চান" in res3.answer or "time would you prefer to leave" in res3.answer, "TEST 3 FAILED"
    print("✅ TEST 3 PASSED!")

    # TEST 4: User says "8 AM to 12 PM"
    req4 = AgentMessageRequest(message="8 AM to 12 PM", session_id="test_session_1")
    res4 = rail_agent.process_query(req4)
    print("\n[TEST 4] User: 8 AM to 12 PM")
    print(f"Assistant Output:\n{res4.answer}")
    assert "পৌঁছাতে চান" in res4.answer or "specific time" in res4.answer, "TEST 4 FAILED"
    print("✅ TEST 4 PASSED!")

    # TEST 5: User says "Before 10 PM"
    req5 = AgentMessageRequest(message="Before 10 PM", session_id="test_session_1")
    res5 = rail_agent.process_query(req5)
    print("\n[TEST 5] User: Before 10 PM")
    print(f"Assistant Output:\n{res5.answer}")
    assert "suitable train" in res5.answer or "Recommended" in res5.answer, "TEST 5 FAILED"
    assert "AI Predicted Delay" in res5.answer, "TEST 5 FAILED: Missing ML delay prediction!"
    assert "Estimated Arrival" in res5.answer, "TEST 5 FAILED: Missing estimated arrival!"
    print("✅ TEST 5 PASSED!")

    # TEST 6: User says "I don't know the train number, I want to go from Kolkata to Delhi tomorrow."
    req6 = AgentMessageRequest(message="I don't know the train number, I want to go from Kolkata to Delhi tomorrow.", session_id="test_session_2")
    res6 = rail_agent.process_query(req6)
    print("\n[TEST 6] User: I don't know the train number, I want to go from Kolkata to Delhi tomorrow.")
    print(f"Assistant Output:\n{res6.answer}")
    assert "5-digit" not in res6.answer, "TEST 6 FAILED: Demanded train number!"
    assert "রওনা দিতে চান" in res6.answer or "time would you prefer to leave" in res6.answer, "TEST 6 FAILED: Did not ask for next missing info!"
    print("✅ TEST 6 PASSED!")

    # TEST 7: User says "Where is train 22436?"
    req7 = AgentMessageRequest(message="Where is train 22436?", session_id="test_session_3")
    res7 = rail_agent.process_query(req7)
    print("\n[TEST 7] User: Where is train 22436?")
    print(f"Assistant Output:\n{res7.answer}")
    assert "Live Status" in res7.answer or "22436" in res7.answer, "TEST 7 FAILED"
    assert "AI Delay Forecast" in res7.answer, "TEST 7 FAILED: Missing AI Delay Forecast"
    print("✅ TEST 7 PASSED!")

    print("=" * 60)
    print("🎉 ALL 7 TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
