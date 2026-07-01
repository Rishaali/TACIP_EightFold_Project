# TACIP – Trust-Aware Candidate Intelligence Pipeline

## Project Overview

TACIP (Trust-Aware Candidate Intelligence Pipeline) is a full-stack AI-powered candidate profile transformation system that converts resumes and structured recruiter data into a single trusted canonical candidate profile.

The system accepts candidate information from multiple heterogeneous sources such as Resume PDFs, Resume URLs, and Recruiter CSV files, extracts meaningful information, normalizes all fields into a standard schema, calculates an explainable confidence score, generates AI-based insights, and produces configurable runtime outputs without modifying backend code.

The entire pipeline is deterministic, explainable, scalable, and robust, ensuring that identical inputs always produce identical outputs.

---

# Features

## Candidate Data Ingestion

Supports multiple input formats:

- Upload Single Resume PDF
- Upload Multiple Resume PDFs
- Upload Resume using URL
- Upload Recruiter CSV
- Upload Resume + CSV Together

---

## Resume Parsing

Automatically extracts:

- Candidate Name
- Email Address
- Phone Number
- Skills
- Work Experience
- Education
- Certifications
- Projects
- Location

---

## Canonical Candidate Profile Generation

Transforms extracted information into a standardized schema.

Generated fields include:

- candidate_id
- full_name
- emails
- phones
- location
- links
- headline
- years_experience
- skills
- experience
- education
- provenance
- overall_confidence

---

## Data Normalization

Automatically standardizes:

- Phone Numbers → E.164 Format
- Skills → Canonical Skill Names
- Dates → YYYY-MM
- Removes duplicate values
- Handles missing fields safely

---

## Explainable Confidence Score

Each candidate receives a confidence score between **0–100** using a **Weighted Rule-Based Confidence Scoring Algorithm**.

The score is calculated using:

- Resume Completeness
- Contact Information Quality
- Skill Extraction Confidence
- Experience Consistency
- Education Completeness
- Project Quality
- Parsing Accuracy
- Missing Field Penalty
- Data Consistency

Every score is completely explainable and deterministic.

---

## AI Candidate Analysis

Automatically provides:

- Candidate Strengths
- Missing Information
- Resume Quality
- Skill Gaps
- Improvement Suggestions
- Selection Recommendation

---

## Runtime Projection Layer

Users can dynamically configure the final output without changing backend code.

Supported operations:

- Select required fields
- Rename fields
- Map canonical paths
- Enable/Disable Confidence Score
- Enable/Disable Provenance
- Configure Missing Value Policy
- Preview Live JSON Output

---

## Candidate Dashboard

Includes:

- Candidate Search
- Filter by Name
- Filter by Confidence Score
- Filter by Experience
- Candidate Status
- Export JSON
- Export CSV
- Export PDF

---

# Tech Stack

## Frontend

- React.js
- TypeScript
- Vite
- CSS

## Backend

- Python
- Flask
- REST APIs

## Parsing & AI

- PyMuPDF
- pdfplumber
- Regex
- NLP
- Weighted Rule-Based Confidence Scoring
- Rule Engine

## Storage

- JSON
- CSV
- Local File Storage

---

# Project Architecture

```text
                   +----------------------+
                   |      React Frontend  |
                   +----------+-----------+
                              |
                         REST API Calls
                              |
                   +----------v-----------+
                   |    Flask Backend     |
                   +----------+-----------+
                              |
                +-------------+-------------+
                |                           |
         Upload Controller         Config Controller
                |                           |
                +-------------+-------------+
                              |
                  Candidate Processing Engine
                              |
      +-----------+-----------+-----------+-----------+
      |           |           |           |           |
 Resume Parser  CSV Parser  URL Parser  Validator  Normalizer
      |           |           |           |           |
      +-----------+-----------+-----------+-----------+
                              |
                 Canonical Profile Builder
                              |
              Confidence Score Calculation
                              |
                  AI Analysis Generator
                              |
                Projection Configuration
                              |
                   JSON Output Generator
                              |
                 Export JSON / CSV / PDF
```

---

# Pipeline Workflow

```text
Resume / CSV / URL Upload
            │
            ▼
Resume Parsing
            │
            ▼
Information Extraction
            │
            ▼
Canonical Profile Generation
            │
            ▼
Data Normalization
            │
            ▼
Confidence Score Calculation
            │
            ▼
AI Candidate Analysis
            │
            ▼
Projection Layer Configuration
            │
            ▼
Runtime Output Generation
            │
            ▼
Export JSON / CSV / PDF
```

---

# Confidence Score Algorithm

The system uses a **Weighted Rule-Based Confidence Scoring Algorithm**.

| Feature | Weight |
|----------|---------|
| Resume Completeness | 25% |
| Skill Extraction | 20% |
| Contact Validation | 15% |
| Experience Consistency | 15% |
| Education Completeness | 10% |
| Projects & Certifications | 10% |
| Parsing Confidence | 5% |

Final Score Formula:

```text
Confidence Score =
Σ (Feature Weight × Feature Confidence)
```

Example:

```text
Resume Completeness       = 90 × 25%
Skill Extraction          = 95 × 20%
Contact Validation        = 100 × 15%
Experience Consistency    = 80 × 15%
Education Completeness    = 85 × 10%
Projects                  = 75 × 10%
Parsing Accuracy          = 95 × 5%

Overall Confidence = 90.5 / 100
```

---

# Edge Cases Handled

The pipeline safely handles:

- Empty Resume
- Corrupted PDF
- Invalid Resume URL
- Empty CSV
- Missing Contact Information
- Missing Education
- Missing Experience
- Duplicate Skills
- Duplicate Candidate Records
- Invalid Phone Numbers
- Multiple Email Addresses
- Incomplete Candidate Profiles

The system never crashes. Unknown values are stored as **NULL** instead of generating incorrect information.

---

# Folder Structure

```text
TACIP_EightFold_Project/
│
├── backend/
│   ├── schemas/
│   ├── services/
│   ├── uploads/
│   ├── exports/
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── types.ts
│   └── package.json
│
└── README.md
```

---

# Installation

## 1. Clone Repository

```bash
git clone https://github.com/Rishaali/TACIP.git
cd TACIP_EightFold_Project
```

---

## 2. Backend Setup

Navigate to backend

```bash
cd backend
```

Create virtual environment

```bash
python -m venv .venv
```

Activate virtual environment

### Windows

```bash
.venv\Scripts\activate
```

### Linux / macOS

```bash
source .venv/bin/activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run Flask server

```bash
.venv\Scripts\uvicorn app:app --host 127.0.0.1 --port 8002 --reload
```

Backend will start on:

```text
[http://localhost:800](http://127.0.0.1:8002)
```

---

## 3. Frontend Setup

Navigate to frontend

```bash
cd frontend
```

Install dependencies

```bash
npm install
```

Run React application

```bash
npm run dev
```

Frontend will start on:

```text
http://localhost:5175
```

---

# How to Run the Project

1. Start the Flask backend.
2. Start the React frontend.
3. Open the application in your browser.
4. Upload Resume PDF, Resume URL, CSV, or Resume + CSV.
5. The pipeline parses and extracts candidate information.
6. A canonical candidate profile is generated.
7. Confidence score is calculated.
8. AI analysis is generated.
9. Configure the Projection Layer.
10. Preview the runtime JSON output.
11. Export results as JSON, CSV, or PDF.

---

# Output

The generated candidate profile contains:

- Candidate Information
- Contact Details
- Skills
- Work Experience
- Education
- Confidence Score
- Provenance Metadata
- AI Analysis
- Configurable Runtime Output

---

# Future Enhancements

- LinkedIn Profile Integration
- GitHub Profile Analysis
- ATS JSON Import
- Semantic Skill Matching using Embeddings
- LLM-Based Resume Summarization
- PostgreSQL / MongoDB Integration
- User Authentication
- Role-Based Access Control
- Docker Deployment
- Cloud Storage Integration

---

# Author

**Rishaali R**

### TACIP – Trust-Aware Candidate Intelligence Pipeline

*A deterministic, explainable, and AI-powered candidate intelligence system that transforms heterogeneous recruitment data into trusted canonical candidate profiles with configurable runtime outputs.*
