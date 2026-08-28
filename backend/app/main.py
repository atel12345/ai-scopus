"""
main.py - Point d'entree FastAPI. Definit les routes d'inscription
et de connexion. Le pipeline lui-meme est expose via pipeline_routes.py.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import User
from app.auth import hash_password, verify_password, create_access_token
from app.pipeline_routes import router as pipeline_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agent IA Scopus API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pipeline_router, prefix="/pipeline", tags=["pipeline"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déja enregistré")

    user = User(email=user_in.email, hashed_password=hash_password(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "message": "Compte crée avec succés",
        "email": user.email
    }

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token(data={"sub": user.email})
    return Token(access_token=token)

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Agent IA Scopus API"
    }