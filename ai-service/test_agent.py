from app.agent.rail_agent import rail_agent, AgentMessageRequest
from dotenv import load_dotenv
load_dotenv()
req = AgentMessageRequest(message="Hi", session_id="917439033504")
res = rail_agent.process_query(req)
print("RESPONSE:", res.answer)
