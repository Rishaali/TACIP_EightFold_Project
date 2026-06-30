from typing import Dict, Any, List

# Weights (must sum to 1.0)
WEIGHTS = {
    "resume_completeness": 0.30,
    "skill_match": 0.25,
    "experience_consistency": 0.20,
    "education_completeness": 0.10,
    "project_quality": 0.10,
    "contact_completeness": 0.05,
}

PREFERRED_SKILLS = [
    "python", "javascript", "java", "react", "node", "docker", "kubernetes",
    "aws", "machine learning", "sql", "typescript", "spring", "mongodb"
]


def score_resume_completeness(candidate: Dict[str, Any]) -> float:
    checks = [
        bool(candidate.get("full_name")),
        bool(candidate.get("emails")),
        bool(candidate.get("phones")),
        bool(candidate.get("skills")),
        bool(candidate.get("experience")),
        bool(candidate.get("education")),
        bool(candidate.get("headline")),
        bool(candidate.get("location", {}).get("city")),
    ]
    return round(sum(checks) / len(checks) * 100, 2)


def score_skill_match(candidate: Dict[str, Any]) -> float:
    """Jaccard Similarity + Set Union of candidate skills vs preferred skills."""
    cand_skills = set(s.lower().strip() for s in candidate.get("skills", []))
    pref_skills = set(PREFERRED_SKILLS)
    if not cand_skills:
        return 0.0
    intersection = cand_skills.intersection(pref_skills)
    union = cand_skills.union(pref_skills)
    jaccard = len(intersection) / len(union) if union else 0.0
    overlap = len(intersection) / len(pref_skills) if pref_skills else 0.0
    match_score = (jaccard * 60) + (overlap * 40)
    base_score = min(len(cand_skills) / 8.0, 1.0) * 30
    return round(min(base_score + match_score * 70, 100.0), 2)


def score_experience_consistency(candidate: Dict[str, Any]) -> float:
    years = candidate.get("years_experience", 0)
    exp_list = candidate.get("experience", [])
    # If years_experience is 0 but we have experience list, derive it
    if years == 0 and exp_list:
        years = sum(e.get("duration_years", 0) for e in exp_list)
    year_score = min(years / 10.0, 1.0) * 60
    consistency_score = min(len(exp_list) / 3.0, 1.0) * 40
    return round(year_score + consistency_score, 2)


def score_education_completeness(candidate: Dict[str, Any]) -> float:
    education = candidate.get("education", [])
    if not education:
        return 0.0
    score = 50.0
    for edu in education:
        if edu.get("institution"):
            score += 20
        if edu.get("year"):
            score += 15
        if edu.get("cgpa"):
            score += 15
    return round(min(score, 100.0), 2)


def score_project_quality(candidate: Dict[str, Any]) -> float:
    projects = candidate.get("projects", [])
    if not projects:
        return 0.0
    count_score = min(len(projects) / 4.0, 1.0) * 60
    tech_score = sum(10 for p in projects if p.get("tech_stack"))
    return round(min(count_score + tech_score, 100.0), 2)


def score_contact_completeness(candidate: Dict[str, Any]) -> float:
    checks = [
        bool(candidate.get("emails")),
        bool(candidate.get("phones")),
        bool(candidate.get("links", {}).get("linkedin")),
        bool(candidate.get("links", {}).get("github")),
    ]
    return round(sum(checks) / len(checks) * 100, 2)


def get_confidence_reasons(candidate: Dict[str, Any], breakdown: Dict[str, float]) -> List[str]:
    """Generate human-readable reasons explaining why confidence score is what it is."""
    reasons = []

    # Resume completeness reasons
    if breakdown.get("resume_completeness", 100) < 70:
        missing = []
        if not candidate.get("full_name"): missing.append("full name")
        if not candidate.get("emails"): missing.append("email address")
        if not candidate.get("phones"): missing.append("phone number")
        if not candidate.get("skills"): missing.append("skills section")
        if not candidate.get("experience"): missing.append("work experience")
        if not candidate.get("education"): missing.append("education history")
        if not candidate.get("headline"): missing.append("professional headline")
        if missing:
            reasons.append(f"Missing key resume fields: {', '.join(missing)}.")

    # Skill match reasons
    sm = breakdown.get("skill_match", 100)
    if sm < 60:
        cand_skills = set(s.lower() for s in candidate.get("skills", []))
        matched = [s for s in PREFERRED_SKILLS if s in cand_skills]
        if not matched:
            reasons.append("No preferred technical skills detected (Python, JavaScript, Java, React, AWS, etc.).")
        elif len(matched) < 3:
            reasons.append(f"Low skill overlap — only {len(matched)} preferred skills matched: {', '.join(matched)}.")

    # Experience reasons
    ex = breakdown.get("experience_consistency", 100)
    if ex < 50:
        years = candidate.get("years_experience", 0)
        exp_list = candidate.get("experience", [])
        if years < 2 and not exp_list:
            reasons.append("No work experience history detected in the resume.")
        elif years < 2:
            reasons.append(f"Very limited experience ({years} years detected).")

    # Education reasons
    if breakdown.get("education_completeness", 100) < 50:
        reasons.append("Education section is incomplete or missing institution/year details.")

    # Project reasons
    if breakdown.get("project_quality", 100) < 20:
        reasons.append("No projects listed — project section is empty or not detected.")

    # Contact reasons
    cc = breakdown.get("contact_completeness", 100)
    if cc < 50:
        missing_c = []
        if not candidate.get("phones"): missing_c.append("phone")
        if not candidate.get("links", {}).get("linkedin"): missing_c.append("LinkedIn")
        if not candidate.get("links", {}).get("github"): missing_c.append("GitHub")
        if missing_c:
            reasons.append(f"Incomplete contact info — missing: {', '.join(missing_c)}.")

    if not reasons:
        reasons.append("Profile is well-structured with good completeness and skill alignment.")

    return reasons


def calculate_confidence(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Weighted heuristic sum with Jaccard similarity skill scoring."""
    # Auto-derive years_experience if zero
    if not candidate.get("years_experience") and candidate.get("experience"):
        candidate["years_experience"] = round(
            sum(e.get("duration_years", 0) for e in candidate["experience"]), 1
        )

    breakdown = {
        "resume_completeness": score_resume_completeness(candidate),
        "skill_match": score_skill_match(candidate),
        "experience_consistency": score_experience_consistency(candidate),
        "education_completeness": score_education_completeness(candidate),
        "project_quality": score_project_quality(candidate),
        "contact_completeness": score_contact_completeness(candidate),
    }
    overall = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)
    reasons = get_confidence_reasons(candidate, breakdown)

    return {
        "overall_confidence": round(overall, 1),
        "confidence_breakdown": breakdown,
        "confidence_reasons": reasons,
    }
