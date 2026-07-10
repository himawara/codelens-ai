"""
Declarative base — import this in models, not the engine.
Keeps the model layer independent of the session layer.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
