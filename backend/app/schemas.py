from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import HintLevel, ProblemDifficulty


# ── Session ──────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    problem_title: str = Field(..., min_length=1, max_length=256)
    problem_statement: str = Field(..., min_length=10)
    difficulty: ProblemDifficulty = ProblemDifficulty.medium
    language: str = Field(default="python", max_length=32)


class SessionUpdate(BaseModel):
    solved: Optional[int] = None


class HintRecordOut(BaseModel):
    id: str
    hint_level: HintLevel
    hint_text: str
    created_at: datetime
    tokens_used: int

    class Config:
        from_attributes = True


class SessionOut(BaseModel):
    id: str
    problem_title: str
    difficulty: ProblemDifficulty
    language: str
    created_at: datetime
    solved: int
    hints: List[HintRecordOut] = []

    class Config:
        from_attributes = True


class SessionListItem(BaseModel):
    id: str
    problem_title: str
    difficulty: ProblemDifficulty
    language: str
    created_at: datetime
    solved: int
    hint_count: int = 0

    class Config:
        from_attributes = True


# ── Hint Request ──────────────────────────────────────────────────────────────

class HintRequest(BaseModel):
    session_id: str
    hint_level: HintLevel = HintLevel.nudge
    user_code: Optional[str] = Field(default=None, description="Current user code snapshot")


class HintResponse(BaseModel):
    hint_id: str
    hint_level: HintLevel
    hint_text: str
    tokens_used: int
