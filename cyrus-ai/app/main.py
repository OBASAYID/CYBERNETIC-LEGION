from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from neural_core.brain import Brain
from neural_core.learning_engine import LearningEngine


class TrainingItem(BaseModel):
    content: str = Field(min_length=1)
    metadata: dict = Field(default_factory=dict)


class TrainingRequest(BaseModel):
    items: list[TrainingItem]


class RecallRequest(BaseModel):
    query: str = Field(min_length=1)


learning_engine = LearningEngine()
brain = Brain(learning_engine)
app = FastAPI(title="CYRUS AI Service", version="1.0.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "learning": learning_engine.stats()}


@app.post("/train")
def train(request: TrainingRequest) -> dict:
    return brain.train([item.model_dump() for item in request.items])


@app.post("/decide")
def decide(payload: dict) -> dict:
    return brain.decide(payload)


@app.post("/recall")
def recall(request: RecallRequest) -> dict:
    matches = [event.__dict__ for event in learning_engine.events if request.query.lower() in event.content.lower()]
    return {"results": matches[:10]}
