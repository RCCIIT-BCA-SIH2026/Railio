import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agent.rail_agent import rail_agent, AgentMessageRequest
from app.rag.knowledge_base import knowledge_base
from app.ml.self_learning_reward_engine import self_learning_engine

class TestAgenticRAG(unittest.TestCase):
    def test_train_search_agent(self):
        req = AgentMessageRequest(message="Sealdah to Dankuni upcoming local train", session_id="test_s1")
        res = rail_agent.process_query(req)
        self.assertIsNotNone(res.answer)
        self.assertTrue(len(res.answer) > 0)
        self.assertIsNotNone(res.cardData)
        self.assertEqual(res.cardData.get("type"), "TRAIN_SEARCH_RESULTS")
        print("✓ Agent Train Search test passed!")

    def test_ml_health_agent(self):
        req = AgentMessageRequest(message="What is the ML model accuracy and learning health?", session_id="test_s2")
        res = rail_agent.process_query(req)
        self.assertIn("Self-Learning ML Health", res.answer)
        self.assertTrue(len(res.toolsExecuted) > 0)
        self.assertEqual(res.toolsExecuted[0].tool, "SELF_LEARNING_ML_HEALTH")
        print("✓ Agent ML Health test passed!")

    def test_catch_probability_agent(self):
        req = AgentMessageRequest(message="Can I catch train 32216 if road travel distance is 6 km with heavy traffic?", session_id="test_s3")
        res = rail_agent.process_query(req)
        self.assertIn("Can I Catch My Train?", res.answer)
        self.assertTrue(len(res.toolsExecuted) > 0)
        self.assertEqual(res.toolsExecuted[0].tool, "CATCH_PROBABILITY_ENGINE")
        self.assertEqual(res.cardData.get("type"), "CATCH_PROBABILITY")
        print("✓ Agent Catch Probability test passed!")

    def test_rag_query(self):
        res = knowledge_base.answer_query("What is the luggage allowance policy for suburban local trains?", language_style="en")
        self.assertIsNotNone(res.get("answer"))
        self.assertTrue(len(res.get("retrievedKnowledgeDocs", [])) > 0)
        print("✓ Grounded RAG Query test passed!")

    def test_self_learning_bias_recording(self):
        fb = self_learning_engine.record_arrival_feedback(
            train_number="32211",
            station_code="DKAE",
            scheduled_arr="08:00",
            predicted_eta="08:05",
            actual_arrival="08:04",
            hour_bucket=8
        )
        self.assertIn("event_id", fb)
        self.assertEqual(fb.get("score_label"), "REWARD")
        print("✓ Self-Learning Reward Loop test passed!")

if __name__ == "__main__":
    unittest.main()
