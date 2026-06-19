"""Database engine + session helpers."""
from sqlmodel import SQLModel, Session, create_engine

from config import settings
import models  # noqa: F401  -- ensure models are registered before create_all

# Managed Postgres often hands out a "postgres://" URL, which SQLAlchemy 2 rejects.
_db_url = settings.database_url
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
engine = create_engine(_db_url, echo=False, pool_pre_ping=True, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
