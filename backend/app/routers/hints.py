import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import SolveSession, HintRecord
from app.schemas import HintRequest, HintResponse
from app.services.gemini import stream_hint, get_hint_full

router = APIRouter(prefix="/hints", tags=["hints"])


async def _get_previous_hints(session_id: str, db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(HintRecord.hint_text)
        .where(HintRecord.session_id == session_id)
        .order_by(HintRecord.created_at.desc())
        .limit(3)
    )
    return [row[0] for row in result.fetchall()]


@router.post("/stream")
async def stream_hint_endpoint(payload: HintRequest, db: AsyncSession = Depends(get_db)):
    """
    SSE endpoint — streams hint tokens in real-time.
    Saves the full hint to DB after streaming completes.

    Response format (text/event-stream):
      data: <token>\\n\\n
      data: [DONE]\\n\\n
    """
    # Validate session exists
    result = await db.execute(select(SolveSession).where(SolveSession.id == payload.session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    previous_hints = await _get_previous_hints(payload.session_id, db)

    async def event_generator():
        full_text = []
        try:
            async for token in stream_hint(
                problem_statement=session.problem_statement,
                hint_level=payload.hint_level,
                user_code=payload.user_code,
                previous_hints=previous_hints,
            ):
                full_text.append(token)
                # SSE format: "data: <payload>\n\n"
                yield f"data: {json.dumps(token)}\n\n"
                await asyncio.sleep(0)  # yield control to event loop

            # Save completed hint to DB
            complete_hint = "".join(full_text)
            token_estimate = len(complete_hint.split()) * 4 // 3
            hint_record = HintRecord(
                session_id=payload.session_id,
                hint_level=payload.hint_level,
                user_code_snapshot=payload.user_code,
                hint_text=complete_hint,
                tokens_used=token_estimate,
            )
            db.add(hint_record)
            await db.commit()

            yield f"data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield f"data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/{session_id}")
async def get_session_hints(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return all hints for a session (for history view)."""
    result = await db.execute(
        select(HintRecord)
        .where(HintRecord.session_id == session_id)
        .order_by(HintRecord.created_at.asc())
    )
    hints = result.scalars().all()
    return hints
