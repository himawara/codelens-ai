from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.problem import ProblemDifficulty
from app.schemas.hint import HintRecordOut


class SessionCreate(BaseModel):
    problem_title: str = Field(..., min_length=1, max_length=256)
    problem_statement: str = Field(..., min_length=10)
    difficulty: ProblemDifficulty = ProblemDifficulty.medium
    language: str = Field(default="python", max_length=32)


class SessionUpdate(BaseModel):
    solved: Optional[int] = None


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
