"""
Verification Test Suite v2 for RailIo Chatbot Persistent Session State & Context-Prioritized Parsing.
Tests:
1. Message 1: "Find a train" -> asks for origin/destination.
2. Message 2: "Kolkata to Delhi" -> extracts origin="Kolkata", destination="Delhi" into session state, asks for travel_date (DOES NOT ask for origin/destination again!).
3. Message 3: "Tomorrow" -> extracts travel_date="Tomorrow", asks for departure time.
4. Message 4: "8 AM to 12 PM" -> extracts departure_time_from="08:00 AM", departure_time_to="12:00 PM", asks for arrival deadline.
5. Message 5: "Before 10 PM" -> extracts arrival_deadline="10 PM", performs train search & RF delay predictions.
6. Single message multi-field extraction: "I want to go from Kolkata to Delhi tomorrow morning and reach before 10 PM."
"""

import sys
import os

_SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRATCH_DIR)
_AI_SERVICE_DIR = os.path.join(_PROJECT_ROOT, "ai-service")
sys.path.insert(0, _AI_SERVICE_DIR)

from app.agent.rail_agent import rail_agent, AgentMessageRequest

def run_tests():
    print("=" * 60)
    print("RUNNING CONVERSATIONAL STATE & PERSISTENCE TEST SUITE")
    print("=" * 60)

    session_id = "test_persistence_session"

    # Step 1: Find a train
    res1 = rail_agent.process_query(AgentMessageRequest(message="Find a train", session_id=session_id))
    print("\n--- TURN 1 ---")
    print(f"User: Find a train")
    print(f"Assistant: {res1.answer}")
    assert "কোথা থেকে কোথায় যেতে চান" in res1.answer or "Where would you like to travel" in res1.answer, "TURN 1 FAILED"

    # Step 2: Kolkata to Delhi (THIS WAS THE BUGGY STEP!)
    res2 = rail_agent.process_query(AgentMessageRequest(message="Kolkata to Delhi", session_id=session_id))
    print("\n--- TURN 2 ---")
    print(f"User: Kolkata to Delhi")
    print(f"Assistant: {res2.answer}")
    assert "কোথা থেকে কোথায় যেতে চান" not in res2.answer, "TURN 2 BUG DETECTED: Asked for origin/destination again!"
    assert "তারিখে যেতে চান" in res2.answer or "date would you like to travel" in res2.answer, "TURN 2 FAILED: Did not ask for date!"

    # Step 3: Tomorrow
    res3 = rail_agent.process_query(AgentMessageRequest(message="Tomorrow", session_id=session_id))
    print("\n--- TURN 3 ---")
    print(f"User: Tomorrow")
    print(f"Assistant: {res3.answer}")
    assert "রওনা দিতে চান" in res3.answer or "time would you prefer to leave" in res3.answer, "TURN 3 FAILED: Did not ask for departure time!"

    # Step 4: 8 AM to 12 PM
    res4 = rail_agent.process_query(AgentMessageRequest(message="8 AM to 12 PM", session_id=session_id))
    print("\n--- TURN 4 ---")
    print(f"User: 8 AM to 12 PM")
    print(f"Assistant: {res4.answer}")
    assert "পৌঁছাতে চান" in res4.answer or "specific time" in res4.answer, "TURN 4 FAILED: Did not ask for arrival deadline!"

    # Step 5: Before 10 PM
    res5 = rail_agent.process_query(AgentMessageRequest(message="Before 10 PM", session_id=session_id))
    print("\n--- TURN 5 ---")
    print(f"User: Before 10 PM")
    print(f"Assistant:\n{res5.answer}")
    assert "suitable train" in res5.answer or "Recommended" in res5.answer, "TURN 5 FAILED: Did not output train search recommendations!"
    assert "AI Predicted Delay" in res5.answer, "TURN 5 FAILED: Missing ML delay predictions!"

    # Single-message multi-field extraction test
    multi_session = "test_multi_field_session"
    res_multi = rail_agent.process_query(AgentMessageRequest(
        message="I want to go from Kolkata to Delhi tomorrow morning and reach before 10 PM.",
        session_id=multi_session
    ))
    print("\n--- MULTI-FIELD TEST ---")
    print(f"User: I want to go from Kolkata to Delhi tomorrow morning and reach before 10 PM.")
    print(f"Assistant:\n{res_multi.answer}")
    assert "suitable train" in res_multi.answer or "Recommended" in res_multi.answer, "MULTI-FIELD TEST FAILED!"

    print("\n" + "=" * 60)
    print("🎉 ALL STATE PERSISTENCE & CONTEXT PARSING TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
