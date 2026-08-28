from typing import List, Dict

class RailwayKnowledgeBase:
    def __init__(self):
        self.documents = [
            {
                "id": "KB-001",
                "title": "Indian Railways Tatkal and Ticket Rules",
                "content": "Tatkal booking opens at 10:00 AM for AC classes and 11:00 AM for Non-AC classes one day in advance. Confirmed Tatkal tickets are non-refundable upon cancellation except in cases of train delayed by more than 3 hours or train cancellation.",
                "tags": ["ticket", "tatkal", "refund", "booking"]
            },
            {
                "id": "KB-002",
                "title": "Luggage Allowance Policy",
                "content": "AC First Class passengers can carry up to 70 kg free luggage. AC 2-Tier permits 50 kg, AC 3-Tier and AC Chair Car permit 40 kg, and Sleeper Class permits 40 kg. Excess luggage must be booked at the luggage office.",
                "tags": ["luggage", "baggage", "weight", "allowance"]
            },
            {
                "id": "KB-003",
                "title": "Medical & Emergency Assistance on Train",
                "content": "Passengers needing emergency medical attention can alert the Train Ticket Examiner (TTE) or tweet/message @RailMinIndia or dial 139. Emergency first aid boxes are available with the Guard/TTE, and station doctors attend at upcoming major stoppages.",
                "tags": ["medical", "emergency", "doctor", "helpline", "139"]
            },
            {
                "id": "KB-004",
                "title": "Vande Bharat Express Guidelines",
                "content": "Vande Bharat rakes operate with automatic plug doors that close before train departure. Catering charges are optional during booking. Onboard Wi-Fi infotainment is available. Maximum operational speed is 130 to 160 km/h depending on track section rating.",
                "tags": ["vande bharat", "speed", "catering", "doors", "wifi"]
            },
            {
                "id": "KB-005",
                "title": "Monsoon & Heavy Rain Operating Procedures",
                "content": "During waterlogging exceeding 100mm above rail level, train speed is capped at 10 km/h or suspended. Overhead electric traction is monitored for wind speeds exceeding 70 km/h. Coastal divisions implement caution orders with safety buffer headway.",
                "tags": ["weather", "rain", "monsoon", "safety", "waterlogging"]
            },
            {
                "id": "KB-006",
                "title": "Connecting Train Transfer Protocol",
                "content": "Minimum suggested connection buffer at major junction stations is 45 minutes for same-station transfers and 120 minutes for city cross-transfers (e.g. Howrah to Sealdah). If the first train is delayed, passengers holding linked PNRs can claim full refund on missed connections at the transfer station TDR counter.",
                "tags": ["connecting", "transfer", "missed train", "connection", "pnr"]
            }
        ]

    def search(self, query: str, top_k: int = 2) -> List[Dict[str, str]]:
        q = query.lower()
        scored_docs = []
        for doc in self.documents:
            score = 0
            for tag in doc["tags"]:
                if tag in q:
                    score += 3
            # Check content matches
            words = q.split()
            for word in words:
                if len(word) > 3 and word in doc["content"].lower():
                    score += 1
            if score > 0:
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        results = [doc for _, doc in scored_docs[:top_k]]
        return results if results else [self.documents[0]]

knowledge_base = RailwayKnowledgeBase()
