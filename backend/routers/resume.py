import json
import os
import io
import tempfile
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, Resume

router = APIRouter(prefix="/api/resume", tags=["resume"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
UPLOADS_DIR = "/app/uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _extract_text_pdf(data: bytes) -> str:
    import PyPDF2
    reader = PyPDF2.PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_text_docx(data: bytes) -> str:
    import docx
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        f.write(data)
        tmp = f.name
    try:
        doc = docx.Document(tmp)
        return "\n".join(p.text for p in doc.paragraphs)
    finally:
        os.unlink(tmp)


def _parse_with_gemini(text: str) -> dict:
    if not GEMINI_API_KEY:
        return {"raw": text, "error": "No GEMINI_API_KEY set — AI parsing disabled"}
    prompt = f"""Extract structured information from this resume and return ONLY valid JSON with these fields:
{{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "education": [{{"degree": "", "field": "", "institution": "", "year": "", "gpa": ""}}],
  "experience": [{{"title": "", "company": "", "duration": "", "bullets": []}}],
  "skills": [],
  "languages": [],
  "certifications": [],
  "awards": [],
  "gpa": "",
  "expected_graduation": ""
}}

Resume text:
{text[:6000]}"""
    r = requests.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=60,
    )
    r.raise_for_status()
    raw = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    data = await file.read()
    name = file.filename or "resume"
    if name.lower().endswith(".pdf"):
        text = _extract_text_pdf(data)
    elif name.lower().endswith(".docx"):
        text = _extract_text_docx(data)
    else:
        raise HTTPException(400, "Only PDF and DOCX files are supported")

    dest = os.path.join(UPLOADS_DIR, name)
    with open(dest, "wb") as f:
        f.write(data)

    parsed = _parse_with_gemini(text)

    db.query(Resume).delete()
    resume = Resume(filename=name, raw_text=text, parsed_json=json.dumps(parsed))
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return {"id": resume.id, "filename": name, "parsed": parsed}


@router.get("/")
def get_resume(db: Session = Depends(get_db)):
    r = db.query(Resume).order_by(Resume.created_at.desc()).first()
    if not r:
        return None
    return {"id": r.id, "filename": r.filename, "parsed": json.loads(r.parsed_json), "created_at": r.created_at}


@router.delete("/")
def delete_resume(db: Session = Depends(get_db)):
    db.query(Resume).delete()
    db.commit()
    return {"ok": True}
