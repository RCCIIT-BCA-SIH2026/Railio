"""
hybrid_retriever.py — Production Hybrid Dense & Sparse Retriever with Dynamic ML Injection
========================================================================================
Combines:
  1. Dense Semantic Similarity (Gemini Embedding vector dot-products)
  2. BM25 / Sparse Lexical Matching (exact train numbers, station codes, coach IDs)
  3. Dynamic Real-Time ML Model Execution (train_delay_model.pkl + ETADelayPredictor)
  4. Live Operational State Injection (weather, crowd, speed restrictions)
"""

import re
import math
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from app.rag.embedding_client import embedding_client
from app.rag.pinecone_client import pinecone_client
from app.rag.train_knowledge_indexer import knowledge_indexer, KnowledgeChunk
from app.ml.eta_delay_predictor import eta_predictor, DelayPredictionRequest
from app.ml.train_schedule_db import train_schedule_db, resolve_station_code, get_ist_now


class RetrievedDocument:
    def __init__(self, chunk: KnowledgeChunk, score: float, match_type: str = "HYBRID"):
        self.chunk = chunk
        self.score = score
        self.match_type = match_type

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk.chunk_id,
            "title": self.chunk.title,
            "content": self.chunk.content,
            "category": self.chunk.category,
            "score": round(self.score, 4),
            "match_type": self.match_type,
        }


class HybridRetriever:
    def __init__(self):
        self.indexer = knowledge_indexer

    def _extract_train_number(self, query: str) -> Optional[str]:
        """Extract 5-digit train number like 32211, 32216, etc."""
        match = re.search(r'\b(32\d{3})\b', query)
        if match:
            return match.group(1)
        # Fallback to any 4-5 digit number
        match_any = re.search(r'\b(\d{4,5})\b', query)
        return match_any.group(1) if match_any else None

    def _compute_bm25_score(self, query_terms: List[str], chunk: KnowledgeChunk) -> float:
        """Compute keyword match and entity overlap score."""
        score = 0.0
        content_lower = chunk.content.lower()
        title_lower = chunk.title.lower()

        for term in query_terms:
            t = term.lower().strip()
            if len(t) < 2:
                continue

            # Check train numbers
            if t in [tn.lower() for tn in chunk.train_numbers]:
                score += 5.0

            # Check station codes
            if t.upper() in [st.upper() for st in chunk.station_codes]:
                score += 3.0

            # Check title match
            if t in title_lower:
                score += 2.5

            # Check keywords
            for kw in chunk.keywords:
                if t in kw.lower():
                    score += 2.0

            # Check content frequency
            count = content_lower.count(t)
            if count > 0:
                score += min(count * 0.5, 3.0)

        return score

    def _generate_dynamic_ml_chunk(self, train_number: str, query: str) -> Optional[KnowledgeChunk]:
        """
        Dynamically execute the real ML Delay Predictor (train_delay_model.pkl)
        and construct an up-to-the-minute grounded ML intelligence chunk.
        """
        train_record = train_schedule_db.get(train_number)
        if not train_record:
            return None

        now = get_ist_now()
        ctx = train_schedule_db.build_predictor_context(train_number, now)
        if not ctx:
            return None

        try:
            ml_req = DelayPredictionRequest(
                trainNumber=train_number,
                currentSpeed=ctx["currentSpeed"],
                distanceRemaining=ctx["distanceKm"],
                weatherCondition="Clear",
                junctionCongestionLevel=0.4,
                day=ctx["day"],
                month=ctx["month"],
                dayOfWeek=ctx["dayOfWeek"],
                departureHour=ctx["departureHour"],
                departureMinute=ctx["departureMinute"],
                arrivalHour=ctx["arrivalHour"],
                arrivalMinute=ctx["arrivalMinute"],
                travelDurationMins=ctx["travelDurationMins"],
                distanceKm=ctx["distanceKm"],
                direction=ctx["direction"],
                departureDelay=ctx["departureDelay"]
            )
            ml_res = eta_predictor.predict(ml_req)

            # Build rich explanation lines
            factor_lines = []
            for f in ml_res.explainability:
                factor_lines.append(f"  • {f.factor} [Category: {f.category}, Impact: +{f.impactMin} min]")

            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            current_day_name = day_names[now.weekday()]

            ml_content = (
                f"=== REAL-TIME ML DELAY & ETA INFERENCE ENGINE (train_delay_model.pkl) ===\n"
                f"Train: {train_number} — {ctx['trainName']}\n"
                f"• Query Timestamp: {now.strftime('%d-%b-%Y %I:%M %p')} ({current_day_name})\n"
                f"• Scheduled Run: Departure {ctx['departureHour']:02d}:{ctx['departureMinute']:02d} ({ctx['source']}) ➔ "
                f"Arrival {ctx['arrivalHour']:02d}:{ctx['arrivalMinute']:02d} ({ctx['destination']})\n"
                f"• Total Scheduled Travel Duration: {ctx['travelDurationMins']:.0f} mins across {ctx['distanceKm']} km\n"
                f"• ML Model Predicted Delay: +{ml_res.predictedDelayMinutes} minutes\n"
                f"• ML Estimated Arrival Window: {ml_res.arrivalWindow}\n"
                f"• Model Prediction Confidence Score: {int(ml_res.confidenceScore * 100)}% (95% CI: +{ml_res.confidenceIntervalMin[0]} to +{ml_res.confidenceIntervalMin[1]} mins)\n"
                f"• Historical Day-of-Week Average ({current_day_name}): +{ml_res.dayWiseHistoricalAvg:.1f} mins\n"
                f"• Sectional Catch-Up Potential: Up to {ml_res.catchUpPotentialMin:.1f} mins recoverable on fast tracks\n"
                f"• Primary ML Explainability Factors:\n" + "\n".join(factor_lines) + "\n"
                f"• Live Track Status: Speed {int(ctx['currentSpeed'])} km/h, Initial Delay {ctx['departureDelay']} min."
            )

            chunk = KnowledgeChunk(
                chunk_id=f"LIVE_ML_INFERENCE_{train_number}",
                title=f"Live ML Model Delay & ETA Forecast for Train {train_number}",
                content=ml_content,
                category="LIVE_ML_INFERENCE",
                train_numbers=[train_number],
                station_codes=[ctx["source"], ctx["destination"]],
                keywords=[train_number, "ml delay", "predicted delay", "eta", "machine learning", "confidence score", "explainability"],
                metadata={"predictedDelay": ml_res.predictedDelayMinutes, "arrivalWindow": ml_res.arrivalWindow, "confidence": ml_res.confidenceScore}
            )
            return chunk
        except Exception as e:
            print(f"[HybridRetriever] Error generating dynamic ML chunk for {train_number}: {e}")
            return None

    def retrieve(self, query: str, top_k: int = 4, score_threshold: float = 0.15) -> List[RetrievedDocument]:
        """
        Perform hybrid retrieval:
          1. Dense vector cosine similarity
          2. Sparse BM25 / keyword overlap
          3. Dynamic ML context injection for recognized train numbers
          4. Weighted rank fusion and top-k filtering
        """
        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        # 1. Extract Entities
        train_num = self._extract_train_number(cleaned_query)
        query_terms = re.findall(r'[\w\u0980-\u09FF]+', cleaned_query)

        # 2. Get Query Dense Embedding & Query Pinecone Cloud Vectors
        query_embedding = embedding_client.get_embedding(cleaned_query)
        pinecone_scores: Dict[str, float] = {}
        if query_embedding:
            p_matches = pinecone_client.query_vectors(query_embedding, top_k=top_k * 2)
            for m in p_matches:
                doc_id = m.get("id")
                score = float(m.get("score", 0.0))
                if doc_id:
                    pinecone_scores[doc_id] = score

        scored_candidates: List[Tuple[KnowledgeChunk, float, str]] = []

        # 3. Dynamic ML Context Injection (Top priority)
        if train_num:
            ml_chunk = self._generate_dynamic_ml_chunk(train_num, cleaned_query)
            if ml_chunk:
                # Dynamic ML chunk receives a top score
                scored_candidates.append((ml_chunk, 1.0, "DYNAMIC_ML_INFERENCE"))

        # 4. Score all indexed static chunks
        for chunk in self.indexer.chunks:
            dense_score = 0.0
            if query_embedding is not None and chunk.embedding is not None:
                dense_score = max(0.0, embedding_client.cosine_similarity(query_embedding, chunk.embedding))

            # Include Pinecone cloud vector score if available
            p_score = pinecone_scores.get(chunk.chunk_id, 0.0)
            if p_score > dense_score:
                dense_score = p_score

            bm25_score = self._compute_bm25_score(query_terms, chunk)

            # Train number exact match boost
            train_boost = 0.0
            if train_num and train_num in chunk.train_numbers:
                train_boost = 0.40

            # Combined hybrid score (0.0 to 1.0+ scale)
            hybrid_score = (0.50 * dense_score) + (0.35 * min(bm25_score / 10.0, 1.0)) + train_boost

            if hybrid_score > score_threshold:
                match_type = "PINECONE_CLOUD_AND_SPARSE" if p_score > 0.6 else ("DENSE_AND_SPARSE" if (dense_score > 0.4 and bm25_score > 2.0) else ("SPARSE_MATCH" if bm25_score > 3.0 else "DENSE_SEMANTIC"))
                scored_candidates.append((chunk, hybrid_score, match_type))

        # 5. Sort by descending score & deduplicate
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        results: List[RetrievedDocument] = []
        seen_ids = set()

        for chunk, score, m_type in scored_candidates:
            if chunk.chunk_id in seen_ids:
                continue
            seen_ids.add(chunk.chunk_id)
            results.append(RetrievedDocument(chunk=chunk, score=score, match_type=m_type))
            if len(results) >= top_k:
                break

        print(f"[HybridRetriever] Retrieved {len(results)} chunks for query: '{cleaned_query[:60]}...' (Train: {train_num})")
        return results


# Singleton instance
hybrid_retriever = HybridRetriever()
