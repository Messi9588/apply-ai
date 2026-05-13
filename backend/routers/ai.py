import os
import json
import requests
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Resume

router = APIRouter(prefix="/api/ai", tags=["ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def _call_gemini(prompt: str) -> str:
    r = requests.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


class CoverLetterRequest(BaseModel):
    listing_title: str
    listing_org: str
    listing_type: str
    listing_description: str
    listing_requirements: str = ""
    listing_amount: str = ""


@router.post("/cover-letter")
def generate_cover_letter(req: CoverLetterRequest, db: Session = Depends(get_db)):
    if not GEMINI_API_KEY:
        raise HTTPException(503, "GEMINI_API_KEY not configured")
    resume = db.query(Resume).order_by(Resume.created_at.desc()).first()
    if not resume:
        raise HTTPException(400, "Upload a resume first")

    profile = json.loads(resume.parsed_json)

    if req.listing_type == "scholarship":
        prompt = f"""You are a professional scholarship application writer. Write a compelling, personalized cover letter for this scholarship application.

SCHOLARSHIP: {req.listing_title}
ORGANIZATION: {req.listing_org}
AMOUNT: {req.listing_amount}
DESCRIPTION: {req.listing_description}
REQUIREMENTS: {req.listing_requirements}

APPLICANT PROFILE:
{json.dumps(profile, indent=2)}

Write a 3-4 paragraph scholarship essay/cover letter that:
1. Opens with a compelling personal hook
2. Connects the applicant's background and achievements to the scholarship's mission
3. Describes future goals and how this scholarship enables them
4. Closes with gratitude and confidence

Use specific details from the profile. Be sincere and personal. Do NOT use generic filler phrases.
Return ONLY the letter text, no subject line, no date, no address."""
    else:
        prompt = f"""You are a professional career coach. Write a compelling, personalized cover letter for this job application.

JOB TITLE: {req.listing_title}
COMPANY: {req.listing_org}
JOB DESCRIPTION: {req.listing_description}
REQUIREMENTS: {req.listing_requirements}

APPLICANT PROFILE:
{json.dumps(profile, indent=2)}

Write a 3-4 paragraph cover letter that:
1. Opens with genuine enthusiasm for the specific role and company
2. Highlights 2-3 most relevant experiences/skills from the resume that match the job requirements
3. Shows cultural fit and what the applicant brings uniquely
4. Closes with a clear call to action

Be specific, not generic. Reference actual details from both the job and the resume.
Return ONLY the letter text, no header, no date, no address block."""

    try:
        letter = _call_gemini(prompt)
    except Exception as e:
        raise HTTPException(500, f"Gemini error: {str(e)}")
    return {"cover_letter": letter}


class FormFillRequest(BaseModel):
    listing_title: str
    listing_org: str
    listing_description: str


@router.post("/form-fill")
def generate_form_data(req: FormFillRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).order_by(Resume.created_at.desc()).first()
    if not resume:
        raise HTTPException(400, "Upload a resume first")
    profile = json.loads(resume.parsed_json)

    edu = profile.get("education", [{}])
    latest_edu = edu[0] if edu else {}
    exp = profile.get("experience", [{}])
    latest_exp = exp[0] if exp else {}

    return {
        "fields": {
            "Full Name": profile.get("name", ""),
            "Email": profile.get("email", ""),
            "Phone": profile.get("phone", ""),
            "Address / City": profile.get("location", ""),
            "University / Institution": latest_edu.get("institution", ""),
            "Degree": latest_edu.get("degree", ""),
            "Major / Field of Study": latest_edu.get("field", ""),
            "GPA": profile.get("gpa", latest_edu.get("gpa", "")),
            "Expected Graduation": profile.get("expected_graduation", latest_edu.get("year", "")),
            "Current Employer / Title": latest_exp.get("title", ""),
            "Skills (comma-separated)": ", ".join(profile.get("skills", [])[:10]),
            "Languages": ", ".join(profile.get("languages", [])),
        }
    }
