"""
models.py - Modeles de base de donnees.

Un seul modele pour l'instant : User. Pas de modele "Report" car les
rapports generes ne sont pas persistes (generation a la volee,
telechargement direct, rien de stocke cote serveur apres coup).
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())