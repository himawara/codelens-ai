from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.problem import HintLevel


class HintRecordOut(BaseModel):
    id: str
    hint_level: HintLevel
    hint_text: str
    created_at: datetime
    tokens_used: int

    class Config:
        from_attributes = True


class HintRequest(BaseModel):
    session_id: str
    hint_level: HintLevel = HintLevel.nudge
    user_code: Optional[str] = Field(default=None, description="Current user code snapshot")


class HintResponse(BaseModel):
    hint_id: str
    hint_level: HintLevel
    hint_text: str
    tokens_used: int
