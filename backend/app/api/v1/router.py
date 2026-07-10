"""
Aggregates all v1 routers into a single APIRouter.
main.py only needs to include this one router.
"""
from fastapi import APIRouter
from app.api.v1 import sessions, hints

api_router = APIRouter()
api_router.include_router(sessions.router)
api_router.include_router(hints.router)
