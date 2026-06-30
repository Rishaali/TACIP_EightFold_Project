from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Status(str, Enum):
    SELECTED = "Selected"
    REVIEW = "Review Required"
    REJECTED = "Rejected"
    PENDING = "Pending"


class WorkExperience(BaseModel):
    company: str = ""
    role: str = ""
    duration_years: float = 0.0
    description: str = ""


class Education(BaseModel):
    degree: str = ""
    institution: str = ""
    year: Optional[int] = None
    cgpa: Optional[float] = None


class Project(BaseModel):
    name: str = ""
    description: str = ""
    tech_stack: List[str] = []


class ConfidenceBreakdown(BaseModel):
    resume_completeness: float = 0.0
    skill_match: float = 0.0
    experience_consistency: float = 0.0
    education_completeness: float = 0.0
    project_quality: float = 0.0
    contact_completeness: float = 0.0


class Location(BaseModel):
    city: str = ""
    region: str = ""
    country: str = ""


class Links(BaseModel):
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""


class Candidate(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    candidate_id: str = ""
    full_name: str = ""
    emails: List[str] = []
    phones: List[str] = []
    location: Location = Location()
    links: Links = Links()
    headline: str = ""
    years_experience: float = 0.0
    skills: List[str] = []
    experience: List[WorkExperience] = []
    education: List[Education] = []
    projects: List[Project] = []
    certifications: List[str] = []
    overall_confidence: float = 0.0
    confidence_breakdown: ConfidenceBreakdown = ConfidenceBreakdown()
    status: Status = Status.PENDING
    source_type: str = "pdf"
    source_file: str = ""
    pipeline_stage: str = "Parsed"
    ai_summary: str = ""
    ai_tags: List[str] = []
    ai_red_flags: List[str] = []
    provenance: List[str] = []
    raw_text: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
