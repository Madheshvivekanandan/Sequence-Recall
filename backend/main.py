from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import uuid
import random
import os

app = FastAPI(title="Sequence Recall API")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COLORS = ["green", "red", "blue", "yellow"]
sessions: Dict[str, List[str]] = {}

class GameStartResponse(BaseModel):
    session_id: str
    new_cell: str
    sequence: List[str]

class GameNextResponse(BaseModel):
    new_cell: str
    round_number: int
    sequence: List[str]

class ValidationRequest(BaseModel):
    session_id: str
    sequence: List[str]

class ValidationResponse(BaseModel):
    correct: bool
    score: int
    game_over: bool

class NextRoundRequest(BaseModel):
    session_id: str

@app.post("/api/game/start", response_model=GameStartResponse)
async def start_game():
    session_id = str(uuid.uuid4())
    first_color = random.choice(COLORS)
    sessions[session_id] = [first_color]
    return GameStartResponse(
        session_id=session_id,
        new_cell=first_color,
        sequence=sessions[session_id].copy(),
    )

@app.post("/api/game/validate", response_model=ValidationResponse)
async def validate_sequence(req: ValidationRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    actual_sequence = sessions[req.session_id]
    
    if req.sequence == actual_sequence:
        score = len(actual_sequence) * 20
        return ValidationResponse(correct=True, score=score, game_over=False)
    else:
        score = (len(actual_sequence) - 1) * 20
        del sessions[req.session_id]
        return ValidationResponse(correct=False, score=max(0, score), game_over=True)

@app.post("/api/game/next", response_model=GameNextResponse)
async def next_round(req: NextRoundRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    next_color = random.choice(COLORS)
    sessions[req.session_id].append(next_color)
    return GameNextResponse(
        new_cell=next_color,
        round_number=len(sessions[req.session_id]),
        sequence=sessions[req.session_id].copy(),
    )

frontend_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
