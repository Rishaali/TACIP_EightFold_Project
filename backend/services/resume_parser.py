import re
import pdfplumber
from pathlib import Path
from typing import Optional


SKILL_KEYWORDS = [
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node", "django", "fastapi", "flask", "spring", "sql", "mysql", "postgresql",
    "mongodb", "redis", "aws", "azure", "gcp", "docker", "kubernetes", "git",
    "linux", "machine learning", "deep learning", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "c++", "c#", "golang", "rust", "swift",
    "kotlin", "flutter", "react native", "graphql", "rest api", "microservices",
    "ci/cd", "jenkins", "github actions", "terraform", "ansible", "hadoop",
    "spark", "kafka", "elasticsearch", "tableau", "power bi", "figma", "html",
    "css", "sass", "tailwind", "bootstrap", "next.js", "express", "fastify",
    "selenium", "pytest", "junit", "postman", "jira", "confluence", "agile",
    "scrum", "devops", "nlp", "computer vision", "data science", "data engineering"
]

DEGREE_KEYWORDS = ["b.tech", "m.tech", "bsc", "msc", "b.e", "m.e", "phd", "mba",
                   "bachelor", "master", "doctorate", "diploma", "b.com", "b.ca", "mca"]

COMPANY_INDICATORS = ["pvt", "ltd", "inc", "corp", "technologies", "solutions",
                      "systems", "software", "consulting", "services", "labs"]


def extract_text_from_pdf(path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        text = f"[PDF extraction error: {e}]"
    return text


def parse_name(text: str) -> str:
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    for line in lines[:5]:
        # Name: typically short, no digits, no special chars
        if len(line.split()) in (2, 3) and not re.search(r"[\d@|•|:]", line):
            if not any(k in line.lower() for k in ["resume", "curriculum", "vitae", "cv", "profile"]):
                return line
    return lines[0] if lines else ""


def parse_emails(text: str) -> list:
    return list(set(re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)))


def parse_phones(text: str) -> list:
    raw = re.findall(r"[\+]?[\d][\d\s\-\(\)]{8,14}[\d]", text)
    cleaned = []
    for p in raw:
        p = re.sub(r"[\s\-\(\)]", "", p)
        if 10 <= len(p) <= 15:
            cleaned.append(p)
    return list(set(cleaned))


def parse_linkedin(text: str) -> str:
    m = re.search(r"linkedin\.com/in/[\w\-]+", text, re.IGNORECASE)
    return "https://" + m.group(0) if m else ""


def parse_github(text: str) -> str:
    m = re.search(r"github\.com/[\w\-]+", text, re.IGNORECASE)
    return "https://" + m.group(0) if m else ""


def parse_portfolio(text: str) -> str:
    m = re.search(r"https?://(?!(?:www\.)?(?:linkedin|github))[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}(?:/[\w\-]*)?", text)
    return m.group(0) if m else ""


def parse_location(text: str) -> dict:
    # Simple heuristic: look for city, state patterns
    patterns = [
        r"([A-Z][a-z]+),\s*([A-Z]{2})\s",  # City, ST
        r"([A-Z][a-z]+),\s*([A-Z][a-z]+)",  # City, Country/State
        r"Location[:\s]+([^\n]+)",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            parts = m.group(0).replace("Location:", "").strip().split(",")
            return {
                "city": parts[0].strip() if len(parts) > 0 else "",
                "region": parts[1].strip() if len(parts) > 1 else "",
                "country": parts[2].strip() if len(parts) > 2 else ""
            }
    return {"city": "", "region": "", "country": ""}


def parse_skills(text: str) -> list:
    text_lower = text.lower()
    found = []
    for skill in SKILL_KEYWORDS:
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower):
            found.append(skill.title() if len(skill) > 3 else skill.upper())
    return list(set(found))


def parse_years_experience(text: str) -> float:
    patterns = [
        r"(\d+\.?\d*)\s*\+?\s*years?\s+of\s+experience",
        r"experience[:\s]+(\d+\.?\d*)\s*\+?\s*years?",
        r"(\d+\.?\d*)\s*years?\s+experience",
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return float(m.group(1))

    # Count date ranges like 2018-2022
    date_ranges = re.findall(r"(20\d\d|19\d\d)\s*[-–]\s*(20\d\d|present|current)", text, re.IGNORECASE)
    total = 0.0
    for start, end in date_ranges:
        try:
            s = int(start)
            e = 2024 if end.lower() in ("present", "current") else int(end)
            total += max(0, e - s)
        except:
            pass
    return round(min(total, 40), 1) if total else 0.0


def parse_experience(text: str) -> list:
    experiences = []
    # Look for experience sections
    section_match = re.search(
        r"(experience|work history|employment)(.*?)(education|skills|projects|certifications|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    if not section_match:
        return experiences

    section = section_match.group(2)
    lines = [l.strip() for l in section.splitlines() if l.strip()]

    i = 0
    while i < len(lines) - 1:
        line = lines[i]
        # Detect company lines
        if any(ind in line.lower() for ind in COMPANY_INDICATORS) or re.search(r"(20\d\d|19\d\d)", line):
            exp = {"company": line, "role": "", "duration_years": 0.0, "description": ""}
            if i + 1 < len(lines):
                exp["role"] = lines[i + 1]
            # Duration
            dur = re.search(r"(20\d\d|19\d\d)\s*[-–]\s*(20\d\d|present|current)", line, re.IGNORECASE)
            if dur:
                try:
                    s = int(dur.group(1))
                    e = 2024 if dur.group(2).lower() in ("present", "current") else int(dur.group(2))
                    exp["duration_years"] = max(0, e - s)
                except:
                    pass
            experiences.append(exp)
        i += 1
    return experiences[:5]


def parse_education(text: str) -> list:
    educations = []
    section_match = re.search(
        r"education(.*?)(experience|skills|projects|certifications|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    if not section_match:
        return educations

    section = section_match.group(1)
    lines = [l.strip() for l in section.splitlines() if l.strip()]

    for line in lines[:10]:
        if any(d in line.lower() for d in DEGREE_KEYWORDS):
            edu = {"degree": line, "institution": "", "year": None, "cgpa": None}
            year_match = re.search(r"(20\d\d|19\d\d)", line)
            if year_match:
                edu["year"] = int(year_match.group(1))
            cgpa_match = re.search(r"(\d\.\d+)\s*(cgpa|gpa|/10|/4)", line, re.IGNORECASE)
            if cgpa_match:
                edu["cgpa"] = float(cgpa_match.group(1))
            educations.append(edu)
    return educations[:3]


def parse_headline(text: str, name: str) -> str:
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    for i, line in enumerate(lines[:10]):
        if name and name.lower() in line.lower():
            if i + 1 < len(lines):
                candidate = lines[i + 1]
                if len(candidate) > 5 and not re.search(r"[@\d]", candidate):
                    return candidate
    return ""


def parse_certifications(text: str) -> list:
    certs = []
    section = re.search(
        r"certification(.*?)(experience|skills|projects|education|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    if section:
        lines = [l.strip() for l in section.group(1).splitlines() if l.strip()]
        certs = [l for l in lines[:8] if len(l) > 5]
    return certs


def parse_projects(text: str) -> list:
    projects = []
    section = re.search(
        r"project(.*?)(experience|skills|education|certification|$)",
        text, re.IGNORECASE | re.DOTALL
    )
    if not section:
        return projects

    lines = [l.strip() for l in section.group(1).splitlines() if l.strip()]
    i = 0
    while i < len(lines) and len(projects) < 5:
        line = lines[i]
        if len(line) > 5 and not line.endswith(":"):
            proj = {"name": line, "description": "", "tech_stack": []}
            if i + 1 < len(lines):
                proj["description"] = lines[i + 1]
            # Extract tech from description
            desc_lower = (proj["description"] + " " + line).lower()
            proj["tech_stack"] = [s.title() for s in SKILL_KEYWORDS if s in desc_lower][:6]
            projects.append(proj)
        i += 1
    return projects


def parse_pdf_resume(file_path: str) -> dict:
    """Main entry point: parse a PDF and return structured candidate dict."""
    text = extract_text_from_pdf(file_path)
    name = parse_name(text)

    return {
        "full_name": name,
        "emails": parse_emails(text),
        "phones": parse_phones(text),
        "location": parse_location(text),
        "links": {
            "linkedin": parse_linkedin(text),
            "github": parse_github(text),
            "portfolio": parse_portfolio(text),
        },
        "headline": parse_headline(text, name),
        "years_experience": parse_years_experience(text),
        "skills": parse_skills(text),
        "experience": parse_experience(text),
        "education": parse_education(text),
        "projects": parse_projects(text),
        "certifications": parse_certifications(text),
        "raw_text": text[:3000],
        "source_type": "pdf",
        "source_file": Path(file_path).name,
        "provenance": [f"PDF: {Path(file_path).name}"],
    }
