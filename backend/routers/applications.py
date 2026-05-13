from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Application
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/applications", tags=["applications"])

VALID_STATUSES = {"saved", "applied", "interview", "rejected", "accepted"}


class SaveRequest(BaseModel):
    listing_id: str
    listing_title: str
    listing_org: str
    listing_url: str
    listing_type: str
    cover_letter: str = ""


class UpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    cover_letter: Optional[str] = None


@router.post("/")
def save_application(req: SaveRequest, db: Session = Depends(get_db)):
    app = Application(
        listing_id=0,
        listing_title=req.listing_title,
        listing_org=req.listing_org,
        listing_url=req.listing_url,
        listing_type=req.listing_type,
        cover_letter=req.cover_letter,
        status="saved",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _serialize(app)


@router.get("/")
def list_applications(db: Session = Depends(get_db)):
    apps = db.query(Application).order_by(Application.created_at.desc()).all()
    return [_serialize(a) for a in apps]


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    apps = db.query(Application).all()
    counts = {s: 0 for s in VALID_STATUSES}
    jobs = 0
    scholarships = 0
    for a in apps:
        counts[a.status] = counts.get(a.status, 0) + 1
        if a.listing_type == "scholarship":
            scholarships += 1
        else:
            jobs += 1
    return {"total": len(apps), "by_status": counts, "jobs": jobs, "scholarships": scholarships}


@router.patch("/{app_id}")
def update_application(app_id: int, req: UpdateRequest, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    if req.status is not None:
        if req.status not in VALID_STATUSES:
            raise HTTPException(400, f"Invalid status. Choose from: {VALID_STATUSES}")
        app.status = req.status
        if req.status == "applied" and not app.applied_at:
            app.applied_at = datetime.utcnow()
    if req.notes is not None:
        app.notes = req.notes
    if req.cover_letter is not None:
        app.cover_letter = req.cover_letter
    db.commit()
    db.refresh(app)
    return _serialize(app)


@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    db.delete(app)
    db.commit()
    return {"ok": True}


def _serialize(a: Application) -> dict:
    return {
        "id": a.id,
        "listing_title": a.listing_title,
        "listing_org": a.listing_org,
        "listing_url": a.listing_url,
        "listing_type": a.listing_type,
        "cover_letter": a.cover_letter,
        "status": a.status,
        "notes": a.notes or "",
        "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        "created_at": a.created_at.isoformat(),
    }
