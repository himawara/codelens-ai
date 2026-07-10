from sqlalchemy import Column, String, Integer, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class HintLevel(str, enum.Enum):
    nudge = "nudge"          # Just a direction pointer
    approach = "approach"    # High-level strategy
    pseudocode = "pseudocode"  # Step-by-step logic, no code


class ProblemDifficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class SolveSession(Base):
    __tablename__ = "solve_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    problem_title = Column(String(256), nullable=False)
    problem_statement = Column(Text, nullable=False)
    difficulty = Column(Enum(ProblemDifficulty), default=ProblemDifficulty.medium)
    language = Column(String(32), default="python")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    solved = Column(Integer, default=0)  # 0=unsolved, 1=solved

    hints = relationship("HintRecord", back_populates="session", cascade="all, delete-orphan")


class HintRecord(Base):
    __tablename__ = "hint_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("solve_sessions.id"), nullable=False)
    hint_level = Column(Enum(HintLevel), nullable=False)
    user_code_snapshot = Column(Text, nullable=True)
    hint_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tokens_used = Column(Integer, default=0)

    session = relationship("SolveSession", back_populates="hints")
