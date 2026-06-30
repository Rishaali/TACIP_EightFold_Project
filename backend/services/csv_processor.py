import pandas as pd
import re
from pathlib import Path
from typing import List, Dict, Any


COLUMN_MAP = {
    # Name variations
    "name": "full_name", "full name": "full_name", "candidate name": "full_name",
    # Email
    "email": "emails", "email address": "emails", "e-mail": "emails",
    # Phone
    "phone": "phones", "phone number": "phones", "mobile": "phones", "contact": "phones",
    # Location
    "location": "location_raw", "city": "city", "country": "country", "region": "region",
    # Experience
    "experience": "years_experience", "years of experience": "years_experience",
    "exp": "years_experience", "experience (years)": "years_experience",
    # Skills
    "skills": "skills_raw", "skill set": "skills_raw", "technologies": "skills_raw",
    # Links
    "linkedin": "linkedin", "github": "github", "portfolio": "portfolio",
    # Education
    "education": "education_raw", "degree": "degree", "qualification": "degree",
    # Status
    "status": "status",
    # Headline
    "headline": "headline", "title": "headline", "designation": "headline",
    # Summary
    "summary": "ai_summary", "about": "ai_summary",
}


def normalize_column(col: str) -> str:
    return col.strip().lower()


def safe_list(val: Any) -> List[str]:
    if pd.isna(val):
        return []
    if isinstance(val, list):
        return [str(v) for v in val if v]
    items = re.split(r"[,;|]", str(val))
    return [i.strip() for i in items if i.strip()]


def parse_float(val: Any) -> float:
    try:
        if pd.isna(val):
            return 0.0
        num = re.search(r"\d+\.?\d*", str(val))
        return float(num.group(0)) if num else 0.0
    except:
        return 0.0


def parse_csv_file(file_path: str) -> List[Dict[str, Any]]:
    """Parse a CSV file and return list of candidate dicts."""
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV: {e}")

    # Normalize column names
    df.columns = [normalize_column(c) for c in df.columns]

    # Map to standard fields
    rename = {}
    for col in df.columns:
        if col in COLUMN_MAP:
            rename[col] = COLUMN_MAP[col]
    df = df.rename(columns=rename)

    candidates = []
    for _, row in df.iterrows():
        row_dict = row.to_dict()

        # Emails
        emails = safe_list(row_dict.get("emails", row_dict.get("email", "")))

        # Phones
        phones = safe_list(row_dict.get("phones", row_dict.get("phone", "")))

        # Skills
        skills_raw = row_dict.get("skills_raw", row_dict.get("skills", ""))
        skills = safe_list(skills_raw)

        # Location
        location_raw = row_dict.get("location_raw", "")
        parts = [p.strip() for p in str(location_raw).split(",") if p.strip()] if location_raw else []
        location = {
            "city": row_dict.get("city", parts[0] if parts else ""),
            "region": row_dict.get("region", parts[1] if len(parts) > 1 else ""),
            "country": row_dict.get("country", parts[2] if len(parts) > 2 else ""),
        }

        # Experience
        years_experience = parse_float(row_dict.get("years_experience", 0))

        # Education
        education_raw = row_dict.get("education_raw", row_dict.get("degree", ""))
        education = []
        if education_raw and str(education_raw) != "nan":
            education = [{"degree": str(education_raw), "institution": "", "year": None, "cgpa": None}]

        candidate = {
            "full_name": str(row_dict.get("full_name", row_dict.get("name", ""))).strip(),
            "emails": emails,
            "phones": phones,
            "location": location,
            "links": {
                "linkedin": str(row_dict.get("linkedin", "")).strip() if row_dict.get("linkedin") and str(row_dict.get("linkedin")) != "nan" else "",
                "github": str(row_dict.get("github", "")).strip() if row_dict.get("github") and str(row_dict.get("github")) != "nan" else "",
                "portfolio": str(row_dict.get("portfolio", "")).strip() if row_dict.get("portfolio") and str(row_dict.get("portfolio")) != "nan" else "",
            },
            "headline": str(row_dict.get("headline", "")).strip() if row_dict.get("headline") and str(row_dict.get("headline")) != "nan" else "",
            "years_experience": years_experience,
            "skills": skills,
            "experience": [],
            "education": education,
            "projects": [],
            "certifications": [],
            "ai_summary": str(row_dict.get("ai_summary", "")).strip() if row_dict.get("ai_summary") else "",
            "source_type": "csv",
            "source_file": Path(file_path).name,
            "provenance": [f"CSV: {Path(file_path).name}"],
            "raw_text": "",
        }
        candidates.append(candidate)

    return candidates
