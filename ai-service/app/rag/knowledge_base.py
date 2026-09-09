"""
knowledge_base.py — Enterprise RAG Knowledge Base Bridge
=========================================================
Wraps HybridRetriever & RAGGenerator for seamless multi-dimensional search & generation.
Maintains full backward compatibility for legacy callers.
"""

from typing import List, Dict, Any, Optional
from app.rag.hybrid_retriever import hybrid_retriever, RetrievedDocument
from app.rag.rag_generator import rag_generator


class RailwayKnowledgeBase:
    """Enterprise RAG Bridge integrating dense embeddings, ML models, and Gemini generation."""

    def __init__(self):
        self.retriever = hybrid_retriever
        self.generator = rag_generator

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Perform hybrid retrieval and return list of document dicts."""
        docs = self.retriever.retrieve(query, top_k=top_k)
        return [
            {
                "id": d.chunk.chunk_id,
                "title": d.chunk.title,
                "content": d.chunk.content,
                "category": d.chunk.category,
                "score": d.score,
                "match_type": d.match_type,
            }
            for d in docs
        ]

    def answer_query(self, query: str, language_style: str = "en", top_k: int = 4) -> Dict[str, Any]:
        """End-to-end RAG answer generation with dynamic ML context."""
        retrieved_docs = self.retriever.retrieve(query, top_k=top_k)
        return self.generator.generate_response(query, retrieved_docs, language_style)


# Singleton instance
knowledge_base = RailwayKnowledgeBase()
