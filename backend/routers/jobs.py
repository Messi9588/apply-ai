import os
import json
import requests
from fastapi import APIRouter, Query, HTTPException
from scholarships_db import SCHOLARSHIPS

router = APIRouter(prefix="/api/listings", tags=["listings"])

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
ADZUNA_COUNTRY = os.getenv("ADZUNA_COUNTRY", "us")


def _search_adzuna(keywords: str, location: str = "", page: int = 1, results: int = 20) -> list:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/{ADZUNA_COUNTRY}/search/{page}"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": results,
        "what": keywords,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        jobs = []
        for j in data.get("results", []):
            jobs.append({
                "id": f"adzuna_{j.get('id', '')}",
                "title": j.get("title", ""),
                "organization": j.get("company", {}).get("display_name", ""),
                "location": j.get("location", {}).get("display_name", ""),
                "listing_type": "job",
                "description": j.get("description", ""),
                "requirements": "",
                "url": j.get("redirect_url", ""),
                "deadline": "",
                "amount": "",
                "salary": _format_salary(j),
                "source": "adzuna",
            })
        return jobs
    except Exception:
        return []


def _format_salary(j: dict) -> str:
    lo = j.get("salary_min")
    hi = j.get("salary_max")
    if lo and hi:
        return f"${int(lo):,} – ${int(hi):,}"
    if lo:
        return f"${int(lo):,}+"
    return ""


def _search_scholarships(keywords: str) -> list:
    kw = keywords.lower()
    results = []
    for s in SCHOLARSHIPS:
        searchable = " ".join([
            s["title"], s["organization"], s["description"],
            s["requirements"], s.get("amount", "")
        ]).lower()
        if not kw or any(k in searchable for k in kw.split()):
            results.append({
                "id": f"builtin_{SCHOLARSHIPS.index(s)}",
                "title": s["title"],
                "organization": s["organization"],
                "location": s.get("location", "United States"),
                "listing_type": "scholarship",
                "description": s["description"],
                "requirements": s["requirements"],
                "url": s["url"],
                "deadline": s.get("deadline", ""),
                "amount": s.get("amount", ""),
                "salary": "",
                "source": "builtin",
            })
    return results


@router.get("/search")
def search(
    q: str = Query(default=""),
    listing_type: str = Query(default="all"),  # all | job | scholarship
    location: str = Query(default=""),
    page: int = Query(default=1, ge=1),
):
    results = []
    if listing_type in ("all", "job"):
        results.extend(_search_adzuna(q or "internship OR entry level", location, page))
    if listing_type in ("all", "scholarship"):
        results.extend(_search_scholarships(q))
    return {"results": results, "total": len(results)}


@router.get("/scholarships")
def all_scholarships():
    return {"results": _search_scholarships("")}
