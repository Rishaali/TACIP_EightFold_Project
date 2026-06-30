# TACIP — Trust-Aware Candidate Intelligence Pipeline

A modern, enterprise-grade AI recruitment platform that parses resumes, scores candidates, and delivers **runtime-configurable structured output** through a projection layer.

---

## 🚀 Running the Project

### Backend (Python FastAPI)

```bash
cd TransFlowNew/backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

Backend runs at: **http://127.0.0.1:8002**

---

### Frontend (React + Vite + Tailwind)

```bash
cd TransFlowNew/frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5175**

---

## 📂 Project Structure

```
TransFlowNew/
├── backend/
│   ├── app.py                      ← FastAPI main app (all routes)
│   ├── requirements.txt
│   ├── schemas/
│   │   ├── candidate.py            ← Pydantic candidate model
│   │   └── output_config.py        ← Runtime config schema
│   └── services/
│       ├── resume_parser.py        ← PDF parsing (regex heuristics)
│       ├── csv_processor.py        ← CSV ingestion with column mapping
│       ├── confidence_service.py   ← Jaccard Similarity + Weighted Sum scoring
│       ├── ai_analysis.py          ← AI rating + suggestions by confidence
│       ├── projection_service.py   ← Runtime output projection layer
│       └── report_service.py       ← JSON / CSV / PDF export
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.tsx       ← Home dashboard with KPI cards & table
        │   ├── UploadPage.tsx      ← PDF / CSV / URL / Combined upload
        │   ├── Pipeline.tsx        ← Real-time pipeline stage tracking
        │   ├── CandidatesPage.tsx  ← Filterable candidate list
        │   ├── CandidateProfile.tsx← Full profile + Projection layer UI
        │   └── RuntimeConfig.tsx   ← Global output config editor
        └── components/
            ├── Sidebar.tsx
            ├── Navbar.tsx
            └── UI.tsx              ← StatusBadge, ConfidenceBar, StatCard
```

---

## 🧠 Confidence Score Algorithm

Uses **Jaccard Similarity + Weighted Heuristic Sum**:

| Dimension              | Weight |
|------------------------|--------|
| Resume Completeness    | 30%    |
| Skill Match (Jaccard)  | 25%    |
| Experience Consistency | 20%    |
| Education Completeness | 10%    |
| Project Quality        | 10%    |
| Contact Completeness   | 5%     |

**Skill Match** uses Jaccard Similarity:
```
Jaccard = |Candidate_Skills ∩ Preferred_Skills| / |Candidate_Skills ∪ Preferred_Skills|
```

---

## ⚙️ Runtime Output Configuration (Flagship Feature)

The projection layer reshapes API output **at runtime** without any backend code changes.

Example config:
```json
{
  "fields": [
    { "path": "candidate_id", "required": true },
    { "path": "primary_email", "from_field": "emails[0]", "normalize": "lowercase" },
    { "path": "phone", "from_field": "phones[0]", "normalize": "E164" },
    { "path": "skills", "from_field": "skills", "normalize": "canonical" }
  ],
  "include_confidence": true,
  "include_provenance": true,
  "on_missing": "null"
}
```

---

## 📡 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload/pdf` | Upload single PDF resume |
| POST | `/api/upload/pdfs` | Upload multiple PDF resumes |
| POST | `/api/upload/csv` | Upload candidate CSV |
| POST | `/api/upload/url` | Parse resume from URL |
| GET | `/api/pipeline/{job_id}` | Get processing stage status |
| GET | `/api/candidates` | List candidates (search + filter + sort) |
| GET | `/api/candidates/{id}` | Get single candidate profile |
| GET | `/api/candidates/stats` | Dashboard KPI stats |
| GET | `/api/config` | Get runtime output config |
| POST | `/api/config` | Save runtime output config |
| POST | `/api/output/{id}` | Generate projected output for candidate |
| GET | `/api/reports/json` | Download JSON report |
| GET | `/api/reports/csv` | Download CSV report |
| GET | `/api/reports/pdf` | Download PDF report |
