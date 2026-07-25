from __future__ import annotations

import os
import re
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

app = FastAPI(title="BISU Skill Matching Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = os.getenv("SKILL_MODEL", "all-MiniLM-L6-v2")
EMBEDDING_MODEL = None

SKILL_PHRASES = [
    "communication",
    "problem solving",
    "teamwork",
    "adaptability",
    "time management",
    "leadership",
    "research",
    "programming",
    "web development",
    "database management",
    "critical thinking",
    "stress management",
]


class SkillMatchRequest(BaseModel):
    cvText: str = ""
    applicationLetterText: str = ""
    interviewAnswers: List[str] | None = None


class SkillMatchResponse(BaseModel):
    matchedSkills: List[str]
    skillScores: Dict[str, int]
    summary: str


def normalize_text(text: str) -> str:
    text = text or ""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_model() -> SentenceTransformer:
    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        EMBEDDING_MODEL = SentenceTransformer(MODEL_NAME)
    return EMBEDDING_MODEL


def extract_skills(text: str) -> List[Dict[str, Any]]:
    if not text.strip():
        return []

    model = load_model()
    normalized = normalize_text(text)
    phrases = [normalized, *SKILL_PHRASES]
    embeddings = model.encode(phrases, convert_to_tensor=True, normalize_embeddings=True)
    doc_embedding = embeddings[0]
    skill_embeddings = embeddings[1:]
    scores = util.cos_sim(doc_embedding, skill_embeddings)[0]

    ranked = []
    for idx, phrase in enumerate(SKILL_PHRASES):
        score = float(scores[idx].item())
        if score >= 0.16:
            ranked.append({"skill": phrase, "score": round(score * 100, 1)})

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:8]


def build_summary(skills: List[Dict[str, Any]]) -> str:
    if not skills:
        return "No strong skill matches were found in the uploaded documents."
    top_skills = ", ".join(item["skill"] for item in skills[:4])
    return f"The uploaded documents most strongly reflect: {top_skills}."


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/match-skills", response_model=SkillMatchResponse)
def match_skills(payload: SkillMatchRequest) -> SkillMatchResponse:
    try:
        combined_text = " ".join(
            part for part in [
                payload.cvText,
                payload.applicationLetterText,
                *(payload.interviewAnswers or []),
            ]
            if part and str(part).strip()
        )
        if not combined_text.strip():
            raise HTTPException(status_code=400, detail="No text provided")

        matches = extract_skills(combined_text)
        skill_names = [item["skill"] for item in matches]
        skill_scores = {name: int(round(item["score"])) for name, item in zip(skill_names, matches)}
        return SkillMatchResponse(
            matchedSkills=skill_names,
            skillScores=skill_scores,
            summary=build_summary(matches),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
