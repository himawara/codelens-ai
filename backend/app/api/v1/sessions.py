from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from app.db.session import get_db
from app.models.problem import SolveSession, HintRecord
from app.schemas.session import SessionCreate, SessionOut, SessionUpdate, SessionListItem

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_query():
    """Base query that eagerly loads hints — required for async SQLAlchemy."""
    return select(SolveSession).options(selectinload(SolveSession.hints))


@router.post("/", response_model=SessionOut, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    record = SolveSession(**payload.model_dump())
    db.add(record)
    await db.flush()
    # Re-fetch with hints eagerly loaded so serialization doesn't lazy-load
    result = await db.execute(
        _session_query().where(SolveSession.id == record.id)
    )
    return result.scalar_one()


@router.get("/", response_model=List[SessionListItem])
async def list_sessions(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SolveSession).order_by(SolveSession.created_at.desc()).offset(skip).limit(limit)
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        count_result = await db.execute(
            select(func.count(HintRecord.id)).where(HintRecord.session_id == s.id)
        )
        hint_count = count_result.scalar() or 0
        items.append(SessionListItem(
            id=s.id,
            problem_title=s.problem_title,
            difficulty=s.difficulty,
            language=s.language,
            created_at=s.created_at,
            solved=s.solved,
            hint_count=hint_count,
        ))
    return items


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        _session_query().where(SolveSession.id == session_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    return record


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(session_id: str, payload: SessionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        _session_query().where(SolveSession.id == session_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    await db.flush()
    await db.refresh(record)
    return record


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SolveSession).where(SolveSession.id == session_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(record)
