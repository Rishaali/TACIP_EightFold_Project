import os
import json
import uuid
import shutil
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from schemas.candidate import Candidate, Status
from schemas.output_config import OutputConfig
from services.resume_parser import parse_pdf_resume
from services.csv_processor import parse_csv_file
from services.confidence_service import calculate_confidence, get_confidence_reasons
from services.ai_analysis import generate_ai_analysis, determine_status
from services.projection_service import project_candidate, DEFAULT_CONFIG
from services.report_service import export_json, export_csv, export_pdf_report

# ── App Init ──────────────────────────────────────────────────────────────────
app = FastAPI(title="TACIP API", version="1.0.0", description="Trust-Aware Candidate Intelligence Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
EXPORTS_DIR = Path("exports")
EXPORTS_DIR.mkdir(exist_ok=True)

# ── In-Memory Store (replace with MongoDB in production) ──────────────────────
# ── In-Memory Store (seeded with mock candidates) ──────────────────────
candidates_db: dict[str, dict] = {
    "TACIP-DEMO01": {
        "candidate_id": "TACIP-DEMO01",
        "full_name": "John Doe",
        "emails": ["john.doe@example.com"],
        "phones": ["+12345678901"],
        "location": {"city": "San Francisco", "region": "CA", "country": "USA"},
        "links": {
            "linkedin": "https://linkedin.com/in/johndoe",
            "github": "https://github.com/johndoe",
            "portfolio": "https://johndoe.dev"
        },
        "headline": "Lead Full-Stack AI Engineer",
        "years_experience": 8.5,
        "skills": ["Python", "JavaScript", "React", "Docker", "AWS", "Machine Learning", "FastAPI"],
        "experience": [
            {
                "company": "OpenAI Technologies",
                "role": "Lead Full-Stack AI Engineer",
                "duration_years": 4.5,
                "description": "Architected distributed model-serving pipelines and frontend dashboards."
            },
            {
                "company": "Stripe Corp",
                "role": "Senior Software Engineer",
                "duration_years": 4.0,
                "description": "Designed billing APIs and high-availability ledger databases."
            }
        ],
        "education": [
            {
                "degree": "B.Tech in Computer Science",
                "institution": "Stanford University",
                "year": 2017,
                "cgpa": 9.2
            }
        ],
        "projects": [
            {
                "name": "Trust-Aware Intelligent Classifier",
                "description": "AI matching pipeline using Jaccard Similarity and vector projections.",
                "tech_stack": ["Python", "FastAPI", "React"]
            }
        ],
        "certifications": ["AWS Certified Solutions Architect"],
        "overall_confidence": 94.2,
        "confidence_breakdown": {
            "resume_completeness": 100.0,
            "skill_match": 95.0,
            "experience_consistency": 90.0,
            "education_completeness": 95.0,
            "project_quality": 95.0,
            "contact_completeness": 100.0
        },
        "status": "Selected",
        "source_type": "pdf",
        "source_file": "john_doe_resume.pdf",
        "pipeline_stage": "Complete",
        "ai_summary": "Excellent Candidate - Ready for Interview. Highly aligned experience and strong skills overlap.",
        "ai_tags": ["Ready for Interview", "Strong Resume", "Good Skill Match", "Top Performer"],
        "ai_red_flags": [],
        "provenance": ["PDF: john_doe_resume.pdf"],
        "created_at": "2026-06-30T10:00:00Z",
        "updated_at": "2026-06-30T10:00:00Z"
    },
    "TACIP-DEMO02": {
        "candidate_id": "TACIP-DEMO02",
        "full_name": "Jane Smith",
        "emails": ["jane.smith@example.com"],
        "phones": ["+919876543210"],
        "location": {"city": "Bangalore", "region": "Karnataka", "country": "India"},
        "links": {
            "linkedin": "https://linkedin.com/in/janesmith",
            "github": "https://github.com/janesmith",
            "portfolio": ""
        },
        "headline": "Backend Engineer (Java & Spring)",
        "years_experience": 4.0,
        "skills": ["Java", "Spring Boot", "SQL", "MongoDB", "TypeScript", "Docker"],
        "experience": [
            {
                "company": "Infosys Ltd",
                "role": "Software Engineer",
                "duration_years": 4.0,
                "description": "Built core banking REST APIs using Spring Boot and Oracle database."
            }
        ],
        "education": [
            {
                "degree": "B.E in Information Technology",
                "institution": "VTU",
                "year": 2020,
                "cgpa": 8.0
            }
        ],
        "projects": [],
        "certifications": [],
        "overall_confidence": 72.8,
        "confidence_breakdown": {
            "resume_completeness": 80.0,
            "skill_match": 70.0,
            "experience_consistency": 75.0,
            "education_completeness": 70.0,
            "project_quality": 0.0,
            "contact_completeness": 75.0
        },
        "status": "Review Required",
        "source_type": "csv",
        "source_file": "candidates_list.csv",
        "pipeline_stage": "Complete",
        "ai_summary": "Good Candidate - Needs Manual Review. Solid backend foundations but missing project portfolio details.",
        "ai_tags": ["Needs Manual Review", "Recommend Technical Interview", "Moderate Match"],
        "ai_red_flags": ["Some fields may need verification", "No projects listed"],
        "provenance": ["CSV: candidates_list.csv"],
        "created_at": "2026-06-30T10:05:00Z",
        "updated_at": "2026-06-30T10:05:00Z"
    },
    "TACIP-DEMO03": {
        "candidate_id": "TACIP-DEMO03",
        "full_name": "Bob Johnson",
        "emails": ["bob.j@example.com"],
        "phones": [],
        "location": {"city": "", "region": "", "country": "UK"},
        "links": {},
        "headline": "Junior Developer",
        "years_experience": 0.5,
        "skills": ["HTML", "CSS"],
        "experience": [],
        "education": [],
        "projects": [],
        "certifications": [],
        "overall_confidence": 35.0,
        "confidence_breakdown": {
            "resume_completeness": 30.0,
            "skill_match": 20.0,
            "experience_consistency": 0.0,
            "education_completeness": 0.0,
            "project_quality": 0.0,
            "contact_completeness": 25.0
        },
        "status": "Rejected",
        "source_type": "pdf",
        "source_file": "bob_resume.pdf",
        "pipeline_stage": "Complete",
        "ai_summary": "Low Confidence - Incomplete Profile. Candidate needs significant resume improvement and lacks required technical experience.",
        "ai_tags": ["Incomplete Profile", "Missing Skills", "Needs Resume Improvement"],
        "ai_red_flags": ["Profile is incomplete", "Low skill match score", "No work experience"],
        "provenance": ["PDF: bob_resume.pdf"],
        "created_at": "2026-06-30T10:10:00Z",
        "updated_at": "2026-06-30T10:10:00Z"
    }
}

# Enrich mock candidates with confidence reasons on startup
for _cid, _c in candidates_db.items():
    if "confidence_reasons" not in _c:
        _c["confidence_reasons"] = get_confidence_reasons(_c, _c.get("confidence_breakdown", {}))

pipeline_jobs: dict[str, dict] = {}
runtime_config: dict = DEFAULT_CONFIG.model_dump()
upload_history: list[dict] = [
    {
        "id": "job-demo-01",
        "file": "john_doe_resume.pdf",
        "type": "pdf",
        "uploaded_at": "2026-06-30T10:00:00Z"
    },
    {
        "id": "job-demo-02",
        "file": "candidates_list.csv",
        "type": "csv",
        "uploaded_at": "2026-06-30T10:05:00Z"
    }
]



# ── Helpers ───────────────────────────────────────────────────────────────────
def make_candidate_id() -> str:
    return f"TACIP-{uuid.uuid4().hex[:8].upper()}"


def enrich_candidate(raw: dict) -> dict:
    """Run the full enrichment pipeline on a raw parsed dict."""
    raw["candidate_id"] = make_candidate_id()

    # Auto-derive years_experience from experience list if missing
    if not raw.get("years_experience") and raw.get("experience"):
        raw["years_experience"] = round(
            sum(e.get("duration_years", 0) for e in raw["experience"]), 1
        )

    # Confidence scoring
    conf_result = calculate_confidence(raw)
    raw["overall_confidence"] = conf_result["overall_confidence"]
    raw["confidence_breakdown"] = conf_result["confidence_breakdown"]
    raw["confidence_reasons"] = conf_result["confidence_reasons"]

    # AI Analysis
    ai = generate_ai_analysis(raw["overall_confidence"])
    raw["ai_summary"] = raw.get("ai_summary") or ai["rating"]
    raw["ai_tags"] = ai["tags"]
    raw["ai_red_flags"] = ai["red_flags"]
    raw["ai_suggestions"] = ai["suggestions"]

    # Status
    raw["status"] = determine_status(raw["overall_confidence"])

    # Timestamps
    raw["created_at"] = datetime.utcnow().isoformat()
    raw["updated_at"] = datetime.utcnow().isoformat()
    raw["pipeline_stage"] = "Complete"

    return raw


async def process_pdf_background(job_id: str, file_path: str):
    """Background pipeline processor for a single PDF."""
    stages = [
        ("Resume Parsing", 0.8),
        ("Information Extraction", 0.8),
        ("Candidate Profile Generation", 0.5),
        ("Confidence Score Calculation", 0.3),
        ("AI Analysis", 0.3),
        ("Runtime Output Generation", 0.2),
    ]
    pipeline_jobs[job_id]["status"] = "processing"

    try:
        for i, (stage, delay) in enumerate(stages):
            await asyncio.sleep(delay)
            pipeline_jobs[job_id]["current_stage"] = stage
            pipeline_jobs[job_id]["progress"] = int((i + 1) / len(stages) * 100)

        raw = parse_pdf_resume(file_path)
        candidate = enrich_candidate(raw)
        candidates_db[candidate["candidate_id"]] = candidate
        pipeline_jobs[job_id]["status"] = "complete"
        pipeline_jobs[job_id]["candidate_id"] = candidate["candidate_id"]
        pipeline_jobs[job_id]["progress"] = 100
    except Exception as e:
        pipeline_jobs[job_id]["status"] = "error"
        pipeline_jobs[job_id]["error"] = str(e)


async def process_csv_background(job_id: str, file_path: str):
    """Background pipeline processor for CSV."""
    stages = [
        ("CSV Parsing", 0.5),
        ("Information Extraction", 0.5),
        ("Candidate Profile Generation", 0.5),
        ("Confidence Score Calculation", 0.3),
        ("AI Analysis", 0.3),
        ("Runtime Output Generation", 0.2),
    ]
    pipeline_jobs[job_id]["status"] = "processing"

    try:
        for i, (stage, delay) in enumerate(stages):
            await asyncio.sleep(delay)
            pipeline_jobs[job_id]["current_stage"] = stage
            pipeline_jobs[job_id]["progress"] = int((i + 1) / len(stages) * 100)

        rows = parse_csv_file(file_path)
        ids = []
        for raw in rows:
            candidate = enrich_candidate(raw)
            candidates_db[candidate["candidate_id"]] = candidate
            ids.append(candidate["candidate_id"])

        pipeline_jobs[job_id]["status"] = "complete"
        pipeline_jobs[job_id]["candidate_ids"] = ids
        pipeline_jobs[job_id]["progress"] = 100
    except Exception as e:
        pipeline_jobs[job_id]["status"] = "error"
        pipeline_jobs[job_id]["error"] = str(e)


# ── Upload Routes ─────────────────────────────────────────────────────────────
@app.post("/api/upload/pdf")
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    job_id = uuid.uuid4().hex
    dest = UPLOAD_DIR / f"{job_id}_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pipeline_jobs[job_id] = {
        "job_id": job_id, "file": file.filename,
        "status": "queued", "progress": 0, "current_stage": "Queued"
    }
    upload_history.insert(0, {
        "id": job_id, "file": file.filename, "type": "pdf",
        "uploaded_at": datetime.utcnow().isoformat()
    })

    background_tasks.add_task(process_pdf_background, job_id, str(dest))
    return {"job_id": job_id, "message": "PDF upload started"}


@app.post("/api/upload/pdfs")
async def upload_multiple_pdfs(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    jobs = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            continue
        job_id = uuid.uuid4().hex
        dest = UPLOAD_DIR / f"{job_id}_{file.filename}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        pipeline_jobs[job_id] = {
            "job_id": job_id, "file": file.filename,
            "status": "queued", "progress": 0, "current_stage": "Queued"
        }
        upload_history.insert(0, {
            "id": job_id, "file": file.filename, "type": "pdf",
            "uploaded_at": datetime.utcnow().isoformat()
        })
        background_tasks.add_task(process_pdf_background, job_id, str(dest))
        jobs.append(job_id)
    return {"job_ids": jobs, "count": len(jobs)}


@app.post("/api/upload/csv")
async def upload_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported.")
    job_id = uuid.uuid4().hex
    dest = UPLOAD_DIR / f"{job_id}_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    pipeline_jobs[job_id] = {
        "job_id": job_id, "file": file.filename,
        "status": "queued", "progress": 0, "current_stage": "Queued"
    }
    upload_history.insert(0, {
        "id": job_id, "file": file.filename, "type": "csv",
        "uploaded_at": datetime.utcnow().isoformat()
    })
    background_tasks.add_task(process_csv_background, job_id, str(dest))
    return {"job_id": job_id, "message": "CSV upload started"}


class UrlUploadRequest(BaseModel):
    url: str


@app.post("/api/upload/url")
async def upload_from_url(req: UrlUploadRequest, background_tasks: BackgroundTasks):
    import httpx
    job_id = uuid.uuid4().hex
    filename = req.url.split("/")[-1].split("?")[0] or "resume.pdf"
    dest = UPLOAD_DIR / f"{job_id}_{filename}"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
        with open(dest, "wb") as f:
            f.write(resp.content)
    except Exception as e:
        raise HTTPException(400, f"Failed to download URL: {e}")

    pipeline_jobs[job_id] = {
        "job_id": job_id, "file": filename,
        "status": "queued", "progress": 0, "current_stage": "Queued"
    }
    upload_history.insert(0, {
        "id": job_id, "file": filename, "type": "url",
        "url": req.url, "uploaded_at": datetime.utcnow().isoformat()
    })
    background_tasks.add_task(process_pdf_background, job_id, str(dest))
    return {"job_id": job_id, "message": "URL upload started"}


# ── Pipeline Routes ────────────────────────────────────────────────────────────
@app.get("/api/pipeline/{job_id}")
def get_pipeline_status(job_id: str):
    job = pipeline_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/api/pipeline")
def get_all_jobs():
    return list(pipeline_jobs.values())


@app.get("/api/upload/history")
def get_upload_history():
    return upload_history[:50]


# ── Candidate Routes ───────────────────────────────────────────────────────────
@app.get("/api/candidates")
def list_candidates(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_confidence: Optional[float] = Query(None),
    max_confidence: Optional[float] = Query(None),
    min_experience: Optional[float] = Query(None),
    sort: Optional[str] = Query("newest"),  # newest|oldest|highest|lowest
):
    result = list(candidates_db.values())

    if search:
        q = search.lower()
        result = [c for c in result if q in (c.get("full_name") or "").lower()
                  or any(q in e for e in (c.get("emails") or []))]

    if status:
        result = [c for c in result if c.get("status") == status]

    if min_confidence is not None:
        result = [c for c in result if c.get("overall_confidence", 0) >= min_confidence]

    if max_confidence is not None:
        result = [c for c in result if c.get("overall_confidence", 0) <= max_confidence]

    if min_experience is not None:
        result = [c for c in result if c.get("years_experience", 0) >= min_experience]

    if sort == "highest":
        result.sort(key=lambda x: x.get("overall_confidence", 0), reverse=True)
    elif sort == "lowest":
        result.sort(key=lambda x: x.get("overall_confidence", 0))
    elif sort == "oldest":
        result.sort(key=lambda x: x.get("created_at", ""))
    else:
        result.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return result


@app.get("/api/candidates/stats")
def get_stats():
    all_c = list(candidates_db.values())
    total = len(all_c)
    selected = sum(1 for c in all_c if c.get("status") == "Selected")
    review = sum(1 for c in all_c if c.get("status") == "Review Required")
    rejected = sum(1 for c in all_c if c.get("status") == "Rejected")
    avg_conf = round(sum(c.get("overall_confidence", 0) for c in all_c) / total, 1) if total else 0
    return {
        "total": total,
        "selected": selected,
        "review_required": review,
        "rejected": rejected,
        "average_confidence": avg_conf,
    }


@app.get("/api/candidates/{candidate_id}")
def get_candidate(candidate_id: str):
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    return c


@app.delete("/api/candidates/{candidate_id}")
def delete_candidate(candidate_id: str):
    if candidate_id not in candidates_db:
        raise HTTPException(404, "Candidate not found")
    del candidates_db[candidate_id]
    return {"message": "Deleted"}


# ── Output / Projection Routes ─────────────────────────────────────────────────
@app.get("/api/config")
def get_config():
    return runtime_config


@app.post("/api/config")
def save_config(config: OutputConfig):
    global runtime_config
    runtime_config = config.model_dump()
    return {"message": "Configuration saved", "config": runtime_config}


@app.post("/api/output/{candidate_id}")
def generate_output(candidate_id: str, config: Optional[OutputConfig] = None):
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    cfg = config or OutputConfig(**runtime_config)
    result = project_candidate(c, cfg)
    return result


@app.post("/api/output/batch")
def generate_batch_output(config: Optional[OutputConfig] = None):
    cfg = config or OutputConfig(**runtime_config)
    results = []
    for c in candidates_db.values():
        results.append(project_candidate(c, cfg))
    return results


# ── Report Routes ──────────────────────────────────────────────────────────────
@app.get("/api/reports/json")
def download_json():
    data = list(candidates_db.values())
    content = export_json(data)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=tacip_report.json"},
    )


@app.get("/api/reports/csv")
def download_csv():
    data = list(candidates_db.values())
    content = export_csv(data)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tacip_report.csv"},
    )


@app.get("/api/reports/pdf")
def download_pdf():
    data = list(candidates_db.values())
    content = export_pdf_report(data)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=tacip_report.pdf"},
    )



# ── Candidate Output Download ──────────────────────────────────────────────────
@app.get("/api/candidates/{candidate_id}/output/json")
def download_candidate_output_json(candidate_id: str):
    """Download the projected output JSON for a specific candidate."""
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    from services.projection_service import project_candidate, DEFAULT_CONFIG
    result = project_candidate(c, DEFAULT_CONFIG)
    content = json.dumps({
        "candidate_id": candidate_id,
        "full_name": c.get("full_name"),
        "generated_at": datetime.utcnow().isoformat(),
        "output_config": DEFAULT_CONFIG.model_dump(),
        "projected_output": result["output"],
        "validation": {"valid": result["valid"], "errors": result["errors"]},
    }, indent=2, default=str)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=output_{candidate_id}.json"},
    )


@app.post("/api/candidates/{candidate_id}/output/json")
def download_candidate_output_json_post(candidate_id: str, config: OutputConfig = None):
    """Download the projected output JSON for a candidate, optionally with a custom config."""
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    cfg = config if config else DEFAULT_CONFIG
    result = project_candidate(c, cfg)
    content = json.dumps({
        "candidate_id": candidate_id,
        "full_name": c.get("full_name"),
        "generated_at": datetime.utcnow().isoformat(),
        "output_config": cfg.model_dump(),
        "projected_output": result["output"],
        "validation": {"valid": result["valid"], "errors": result["errors"]},
    }, indent=2, default=str)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=output_{candidate_id}.json"},
    )


@app.get("/api/candidates/{candidate_id}/output/pdf")
def download_candidate_output_pdf(candidate_id: str):
    """Download a PDF summary for a single candidate."""
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    content = export_pdf_report([c])
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=profile_{candidate_id}.pdf"},
    )


# ── Candidate Confidence Reasons ───────────────────────────────────────────────
@app.get("/api/candidates/{candidate_id}/confidence-reasons")
def get_candidate_confidence_reasons(candidate_id: str):
    """Get detailed reasons explaining the confidence score."""
    c = candidates_db.get(candidate_id)
    if not c:
        raise HTTPException(404, "Candidate not found")
    from services.confidence_service import get_confidence_reasons
    reasons = c.get("confidence_reasons") or get_confidence_reasons(c, c.get("confidence_breakdown", {}))
    return {
        "candidate_id": candidate_id,
        "full_name": c.get("full_name"),
        "overall_confidence": c.get("overall_confidence"),
        "status": c.get("status"),
        "reasons": reasons,
        "breakdown": c.get("confidence_breakdown", {}),
        "suggestions": c.get("ai_suggestions", []),
    }


# ── Pipeline Processing Summary ────────────────────────────────────────────────
@app.get("/api/pipeline/summary")
def get_pipeline_summary():
    """Return processing summary statistics across all jobs."""
    all_jobs = list(pipeline_jobs.values())
    total = len(all_jobs)
    completed = sum(1 for j in all_jobs if j.get("status") == "complete")
    failed = sum(1 for j in all_jobs if j.get("status") == "error")
    processing = sum(1 for j in all_jobs if j.get("status") == "processing")
    queued = sum(1 for j in all_jobs if j.get("status") == "queued")

    # Candidate normalization stats
    all_candidates = list(candidates_db.values())
    total_candidates = len(all_candidates)
    normalized_count = sum(
        1 for c in all_candidates
        if c.get("emails") and c.get("phones") and c.get("skills")
    )
    error_count = sum(
        1 for c in all_candidates
        if not c.get("full_name") or not c.get("emails")
    )

    return {
        "pipeline": {
            "total_jobs": total,
            "completed": completed,
            "processing": processing,
            "queued": queued,
            "failed": failed,
            "success_rate": round((completed / total * 100) if total else 0, 1),
        },
        "candidates": {
            "total_processed": total_candidates,
            "fully_normalized": normalized_count,
            "partial_profiles": total_candidates - normalized_count - error_count,
            "error_profiles": error_count,
            "normalization_rate": round((normalized_count / total_candidates * 100) if total_candidates else 0, 1),
        },
        "confidence": {
            "selected": sum(1 for c in all_candidates if c.get("status") == "Selected"),
            "review_required": sum(1 for c in all_candidates if c.get("status") == "Review Required"),
            "rejected": sum(1 for c in all_candidates if c.get("status") == "Rejected"),
            "avg_score": round(
                sum(c.get("overall_confidence", 0) for c in all_candidates) / total_candidates, 1
            ) if total_candidates else 0,
        },
    }


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "candidates": len(candidates_db)}

