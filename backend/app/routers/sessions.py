from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from app.database import get_db
from app.models import SolveSession, HintRecord
from app.schemas import SessionCreate, SessionOut, SessionUpdate, SessionListItem

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionOut, status_code=201)
async def create_session(payload: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = SolveSession(**payload.model_dump())
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.get("/", response_model=List[SessionListItem])
async def list_sessions(skip: int = 0, limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SolveSession).order_by(SolveSession.created_at.desc()).offset(skip).limit(limit)
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        hint_count_result = await db.execute(
            select(func.count(HintRecord.id)).where(HintRecord.session_id == s.id)
        )
        hint_count = hint_count_result.scalar() or 0
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
    result = await db.execute(select(SolveSession).where(SolveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(session_id: str, payload: SessionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolveSession).where(SolveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.flush()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SolveSession).where(SolveSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
