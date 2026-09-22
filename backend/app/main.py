from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.config import settings
from app import models  # noqa: F401  (ensures models are registered before create_all)
from app.routers import auth, jobs, candidates

# Creates all tables on startup if they don't already exist.
# For production, prefer a migration tool (Alembic) instead of create_all.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="B2World AI Recruitment & Workforce Management Platform",
    description="MVP backend covering Auth, Job Management, AI Resume Screening, and Candidate Pipeline.",
    version="0.1.0",
)

frontend_origins = (
    [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
    if settings.FRONTEND_ORIGIN
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_origin_regex=r"https?://localhost:\d+|https://.*\.vercel\.app|https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "b2world-backend", "version": "0.1.1-debug"}
