import json
import os
import io
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db, Resume
import anthropic

router = APIRouter(prefix="/api/resume", tags=["resume"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
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


def _parse_with_claude(text: str) -> dict:
    if not ANTHROPIC_API_KEY:
        return {"raw": text, "error": "No ANTHROPIC_API_KEY set — AI parsing disabled"}
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
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
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = msg.content[0].text.strip()
    # Strip markdown code fences if present
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

    # Save file
    dest = os.path.join(UPLOADS_DIR, name)
    with open(dest, "wb") as f:
        f.write(data)

    parsed = _parse_with_claude(text)

    # Replace existing resume (single-user app)
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
