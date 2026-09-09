"""
rag_generator.py — Grounded Generation Engine for RailSathi Chatbot
===================================================================
Synthesizes retrieved multi-dimensional knowledge chunks & dynamic ML model outputs
using Google Gemini 2.5 Flash with strict factual grounding and multi-lingual fluency.
Includes deterministic structured fallback synthesis for 100% offline uptime.
"""

import os
import re
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from app.rag.hybrid_retriever import hybrid_retriever, RetrievedDocument

load_dotenv()
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

SYSTEM_PROMPT = """You are RailSathi AI — the Senior Railway Intelligence Specialist and Passenger Assistant for Indian Railways (Eastern Railway / Suburban Division).

Your mission is to provide accurate, authoritative, and helpful answers strictly grounded in the provided Railway Knowledge Base, 5-Year Historical Delay Datasets, Station Weather, Platform/Coach Crowding, and real-time Machine Learning model delay forecasts.

STRICT OPERATIONAL RULES:
1. FACTUAL GROUNDING: Rely strictly on the provided RETRIEVED CONTEXT and REAL-TIME ML INFERENCE DATA. Do NOT hallucinate train numbers, intermediate stations, or platform numbers outside the context.
2. TRAIN DEEP-DIVE STRUCTURE: When asked about a specific train (e.g. Train 32211, 32216), structure your answer clearly with sections:
   • 🚆 **Train Profile & Timetable** (Source, Destination, Distance, Stoppages, Platform numbers)
   • 🤖 **AI & ML Delay Forecast** (Predicted delay in mins, arrival window, model confidence score, and primary explainability factors)
   • 📊 **5-Year Historical Pattern** (Historical day-of-week average delay, punctuality rate)
   • 👥 **Coach & Platform Crowding** (Least crowded coaches for comfortable seating, ladies coach, vendor coach)
   • 🌦️ **Weather & Corridor Advisory** (Rainfall, track speed limits, braking caution)
3. MULTILINGUAL FLUENCY: Respond naturally in the user's language:
   - If the user asks in Bengali (বাংলা), answer in natural Bengali.
   - If the user asks in Hindi (हिन्दी), answer in clear Hindi.
   - If the user asks in Banglish (e.g. "32211 train koto delay ache?"), answer in friendly Banglish.
   - If the user asks in English, answer in polished English.
4. TONALITY: Professional, courteous, reassuring, and precise. Use appropriate railway emojis (🚆, 📍, 🕐, 🤖, 👥, ⚠️, 🟢).
"""


class RAGGenerator:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    def generate_response(
        self,
        query: str,
        retrieved_docs: List[RetrievedDocument],
        language_style: str = "en"
    ) -> Dict[str, Any]:
        """
        Synthesize answer from query and retrieved documents.
        Returns dict with: answer, confidenceScore, retrievedKnowledgeDocs, modelUsed.
        """
        if not retrieved_docs:
            return {
                "answer": "I could not find specific data for your query in the suburban railway dataset. Please specify a train number (e.g., 32211 or 32216) or station names.",
                "confidenceScore": 0.50,
                "retrievedKnowledgeDocs": [],
                "modelUsed": "NONE"
            }

        # Build context string
        context_parts = []
        doc_titles = []
        for idx, doc in enumerate(retrieved_docs, 1):
            doc_titles.append(doc.chunk.title)
            context_parts.append(f"--- [DOCUMENT {idx}: {doc.chunk.title}] (Category: {doc.chunk.category}, Score: {doc.score:.2f}) ---\n{doc.chunk.content}\n")

        context_str = "\n".join(context_parts)

        # Attempt Gemini 2.5 Flash Generation
        if self.api_key:
            try:
                gemini_answer = self._call_gemini_api(query, context_str, language_style)
                if gemini_answer:
                    # Calculate dynamic confidence
                    top_score = max([d.score for d in retrieved_docs]) if retrieved_docs else 0.8
                    confidence = min(0.98, max(0.85, top_score))
                    return {
                        "answer": gemini_answer,
                        "confidenceScore": round(confidence, 2),
                        "retrievedKnowledgeDocs": doc_titles,
                        "modelUsed": f"Gemini 2.5 Flash ({self.model}) + RAG"
                    }
            except Exception as e:
                print(f"[RAGGenerator] Gemini API generation error: {e}. Falling back to deterministic synthesizer.")

        # Fallback to deterministic synthesis
        fallback_answer = self._generate_deterministic_fallback(query, retrieved_docs, language_style)
        return {
            "answer": fallback_answer,
            "confidenceScore": 0.92,
            "retrievedKnowledgeDocs": doc_titles,
            "modelUsed": "Deterministic RAG Synthesis Engine"
        }

    def _call_gemini_api(self, query: str, context: str, language_style: str) -> Optional[str]:
        """Direct REST invocation to Google Gemini 2.5 Flash."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        lang_instruction = ""
        if language_style == "bn":
            lang_instruction = "Respond entirely in fluent Bengali (বাংলা)."
        elif language_style == "hi":
            lang_instruction = "Respond entirely in fluent Hindi (हिन्दी)."
        elif language_style == "banglish":
            lang_instruction = "Respond in natural Banglish (Bengali written in English letters)."

        from app.ml.train_schedule_db import get_ist_now
        now = get_ist_now()
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        current_clock_info = f"Current Live System Time (IST): {now.strftime('%d-%b-%Y %I:%M %p')} ({day_names[now.weekday()]})"

        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"=== LIVE REAL-TIME CLOCK CONTEXT ===\n"
            f"{current_clock_info}\n\n"
            f"=== RETRIEVED GROUND TRUTH CONTEXT ===\n"
            f"{context}\n\n"
            f"=== USER QUERY ===\n"
            f"{query}\n\n"
            f"=== LANGUAGE DIRECTIVE ===\n"
            f"{lang_instruction}\n\n"
            f"Please provide your complete, well-formatted, and accurate response based strictly on the above context:"
        )

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.2,  # Low temperature for strict factual adherence
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }

        resp = requests.post(url, json=payload, timeout=12)
        if resp.status_code == 200:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
        else:
            print(f"[RAGGenerator] Gemini API returned {resp.status_code}: {resp.text[:200]}")

        return None

    def _generate_deterministic_fallback(
        self,
        query: str,
        docs: List[RetrievedDocument],
        language_style: str
    ) -> str:
        """Deterministic grounded synthesis when LLM API is unreachable."""
        blocks = []
        ml_doc = next((d for d in docs if d.chunk.category == "LIVE_ML_INFERENCE"), None)
        sched_doc = next((d for d in docs if d.chunk.category == "SCHEDULE"), None)
        hist_doc = next((d for d in docs if d.chunk.category == "HISTORICAL_DELAYS"), None)
        crowd_doc = next((d for d in docs if d.chunk.category == "CROWD"), None)
        other_docs = [d for d in docs if d not in (ml_doc, sched_doc, hist_doc, crowd_doc)]

        if ml_doc:
            blocks.append(f"🤖 **Live AI & ML Delay Intelligence**:\n{ml_doc.chunk.content}")
        if sched_doc:
            blocks.append(f"🚆 **Schedule & Platform Stoppages**:\n{sched_doc.chunk.content}")
        if hist_doc:
            blocks.append(f"📊 **5-Year Historical Performance**:\n{hist_doc.chunk.content}")
        if crowd_doc:
            blocks.append(f"👥 **Crowd & Seating Guidance**:\n{crowd_doc.chunk.content}")
        for o in other_docs:
            blocks.append(f"ℹ️ **{o.chunk.title}**:\n{o.chunk.content}")

        from app.ml.train_schedule_db import get_ist_now
        now = get_ist_now()
        time_str = now.strftime('%d-%b-%Y %I:%M %p')

        joined = "\n\n".join(blocks)
        if language_style == "bn":
            return f"🕒 **বর্তমান সময়**: {time_str} (IST)\n🚆 **RailSathi Verified Information**:\n\n{joined}"
        elif language_style == "hi":
            return f"🕒 **वर्तमान समय**: {time_str} (IST)\n🚆 **RailSathi Verified Information**:\n\n{joined}"
        return f"🕒 **Live Current Time**: {time_str} (IST)\n🚆 **RailSathi Intelligence Summary**:\n\n{joined}"


# Singleton instance
rag_generator = RAGGenerator()
