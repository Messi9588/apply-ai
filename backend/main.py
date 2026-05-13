from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os

from database import init_db
from routers import resume, jobs, ai, applications

app = FastAPI(title="ApplyAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(ai.router)
app.include_router(applications.router)

UPLOADS_DIR = "/app/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# In-memory pending fill store for browser extension
_pending_fill: dict = {}


class PendingFill(BaseModel):
    listing_title: str
    listing_org: str
    listing_type: str
    listing_url: str
    cover_letter: str
    fields: dict


@app.get("/api/pending-fill")
def get_pending_fill():
    return _pending_fill if _pending_fill else None


@app.post("/api/pending-fill")
def set_pending_fill(data: PendingFill):
    _pending_fill.clear()
    _pending_fill.update(data.dict())
    return {"ok": True}


@app.delete("/api/pending-fill")
def clear_pending_fill():
    _pending_fill.clear()
    return {"ok": True}


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"ok": True}
