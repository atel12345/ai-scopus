"""
database.py - Configuration de la connexion PostgreSQL via SQLAlchemy.

En local : utilise SQLite par defaut si DATABASE_URL n'est pas definie.
En production (Render) : DATABASE_URL sera fournie automatiquement par
Render lors de la creation d'une base PostgreSQL liee au service.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local_dev.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependance FastAPI : fournit une session DB et la ferme apres usage."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()