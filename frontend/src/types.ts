export type Status = 'Selected' | 'Review Required' | 'Rejected' | 'Pending'

// ── Canonical Field Types ──────────────────────────────────────────────────────
export interface Location { city: string | null; region: string | null; country: string | null }
export interface Links { linkedin: string | null; github: string | null; portfolio: string | null; other?: string[] }

// Canonical: { name, confidence, sources[] }
export interface SkillItem { name: string; confidence?: number; sources?: string[] }

// Canonical: { company, title, start, end, summary }  (dates: YYYY-MM)
export interface WorkExperience {
  company: string | null
  title?: string | null    // canonical key
  role?: string | null     // legacy key from mock data
  start?: string | null    // YYYY-MM
  end?: string | null      // YYYY-MM | "Present"
  summary?: string | null  // canonical key
  description?: string | null  // legacy key from mock data
  duration_years?: number  // legacy key from mock data
}

// Canonical: { institution, degree, field, end_year }
export interface Education {
  institution: string | null
  degree: string | null
  field?: string | null
  end_year?: number | null
  // legacy keys still present in mock data
  year?: number | null
  cgpa?: number | null
}

// Canonical: { field, source, method }
export interface ProvenanceItem { field: string; source: string; method?: string }

export interface Project { name: string; description: string; tech_stack: string[] }
export interface ConfidenceBreakdown {
  resume_completeness: number; skill_match: number; experience_consistency: number
  education_completeness: number; project_quality: number; contact_completeness: number
}

export interface Candidate {
  candidate_id: string
  full_name: string
  emails: string[]
  phones: string[]
  location: Location
  links: Links
  headline: string | null
  years_experience: number | null
  skills: string[] | SkillItem[]
  experience: WorkExperience[]
  education: Education[]
  projects?: Project[]
  certifications?: string[]
  overall_confidence: number
  confidence_breakdown: ConfidenceBreakdown
  confidence_reasons?: string[]
  status: Status
  source_type: string
  source_file: string
  pipeline_stage: string
  ai_summary: string
  ai_tags: string[]
  ai_red_flags: string[]
  provenance: string[] | ProvenanceItem[]
  created_at: string
}

export interface Stats {
  total: number; selected: number; review_required: number
  rejected: number; average_confidence: number
}

export interface PipelineJob {
  job_id: string; file: string; status: string; progress: number
  current_stage: string; candidate_id?: string; candidate_ids?: string[]; error?: string
}

export interface FieldConfig {
  path: string; from_field?: string; normalize?: string
  required: boolean; label?: string
}
export interface OutputConfig {
  fields: FieldConfig[]; include_confidence: boolean
  include_provenance: boolean; on_missing: 'null' | 'omit' | 'error'
}
