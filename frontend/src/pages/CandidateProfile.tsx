import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MapPin, Globe, ExternalLink,
  Code, Briefcase, GraduationCap, Award, Compass,
  Download, AlertTriangle, CheckCircle, Info, ShieldAlert,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react'
import { getCandidate, generateOutput, downloadCandidateJson } from '../api'
import type { Candidate, OutputConfig } from '../types'
import { Spinner, EmptyState, StatusBadge, ConfidenceBar } from '../components/UI'

// ── Normalization label map — all 13 canonical fields ────────────────────────
const FIELD_NORMALIZE_MAP: { field: string; type: string; normalize: string; notes: string }[] = [
  { field: 'candidate_id',    type: 'string',                              normalize: 'none',      notes: 'Unique pipeline-generated ID' },
  { field: 'full_name',       type: 'string',                              normalize: 'trim',      notes: 'Leading/trailing whitespace removed' },
  { field: 'emails',          type: 'string[]',                            normalize: 'lowercase', notes: 'All email addresses lowercased' },
  { field: 'phones',          type: 'string[]',                            normalize: 'E164',      notes: 'Formatted to E.164 e.g. +12345678901' },
  { field: 'location',        type: '{ city, region, country }',          normalize: 'ISO-3166',  notes: 'Country code normalised to ISO-3166 alpha-2' },
  { field: 'links',           type: '{ linkedin, github, portfolio, other[] }', normalize: 'none', notes: 'URLs preserved as-is' },
  { field: 'headline',        type: 'string | null',                       normalize: 'trim',      notes: 'Professional title / role summary' },
  { field: 'years_experience',type: 'number | null',                       normalize: 'none',      notes: 'Derived from experience list if not explicit' },
  { field: 'skills',          type: '[{ name, confidence, sources[] }]',  normalize: 'canonical', notes: 'Skill names mapped to canonical form e.g. reactjs→React' },
  { field: 'experience',      type: '[{ company, title, start, end, summary }]', normalize: 'YYYY-MM', notes: 'Dates normalised to YYYY-MM format' },
  { field: 'education',       type: '[{ institution, degree, field, end_year }]', normalize: 'none', notes: 'Institution and degree preserved as extracted' },
  { field: 'provenance',      type: '[{ field, source, method }]',        normalize: 'none',      notes: 'Audit trail — where each value came from' },
  { field: 'overall_confidence', type: 'number',                          normalize: 'none',      notes: 'Weighted heuristic score 0–100' },
]

// ── Canonical config — all 13 fields ─────────────────────────────────────────
const CANONICAL_CONFIG: OutputConfig = {
  fields: [
    { path: 'candidate_id',     required: true,  normalize: undefined,   label: 'candidate_id' },
    { path: 'full_name',        required: true,  normalize: 'trim',      label: 'full_name' },
    { path: 'emails',           required: false, normalize: 'lowercase', label: 'emails' },
    { path: 'phones',           required: false, normalize: 'E164',      label: 'phones' },
    { path: 'location',         required: false, normalize: undefined,   label: 'location' },
    { path: 'links',            required: false, normalize: undefined,   label: 'links' },
    { path: 'headline',         required: false, normalize: 'trim',      label: 'headline' },
    { path: 'years_experience', required: false, normalize: undefined,   label: 'years_experience' },
    { path: 'skills',           required: false, normalize: 'canonical', label: 'skills' },
    { path: 'experience',       required: false, normalize: undefined,   label: 'experience' },
    { path: 'education',        required: false, normalize: undefined,   label: 'education' },
    { path: 'provenance',       required: false, normalize: undefined,   label: 'provenance' },
    { path: 'overall_confidence', required: false, normalize: undefined, label: 'overall_confidence' },
  ],
  include_confidence: true,
  include_provenance: true,
  on_missing: 'null',
}

// ── Score band helpers ────────────────────────────────────────────────────────
const scoreClass = (s: number) => s >= 85 ? 'conf-high' : s >= 65 ? 'conf-mid' : 'conf-low'
const scoreLabel = (s: number) => s >= 85 ? 'High Confidence' : s >= 65 ? 'Medium Confidence' : 'Low Confidence'
const scoreBgColor = (s: number) => s >= 85
  ? 'rgba(16,185,129,0.06)'  : s >= 65
  ? 'rgba(245,158,11,0.06)'  : 'rgba(239,68,68,0.06)'
const scoreBorderColor = (s: number) => s >= 85
  ? 'rgba(16,185,129,0.25)'  : s >= 65
  ? 'rgba(245,158,11,0.25)'  : 'rgba(239,68,68,0.25)'

// ── Sub-section header ────────────────────────────────────────────────────────
function SectionHeader({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}{title}
      </h3>
      {action}
    </div>
  )
}

// ── Collapsible Card ──────────────────────────────────────────────────────────
function CollapsibleCard({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text)', fontWeight: 700, fontSize: 15,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</span>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </button>
      {open && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  // Projection state — all 13 canonical fields
  const [fields, setFields] = useState<any[]>([
    { path: 'candidate_id',     from_field: '', label: 'candidate_id',     normalize: 'none',      required: true,  active: true },
    { path: 'full_name',        from_field: '', label: 'full_name',        normalize: 'trim',      required: true,  active: true },
    { path: 'emails',           from_field: '', label: 'emails',           normalize: 'lowercase', required: false, active: true },
    { path: 'phones',           from_field: '', label: 'phones',           normalize: 'E164',      required: false, active: true },
    { path: 'location',         from_field: '', label: 'location',         normalize: 'none',      required: false, active: true },
    { path: 'links',            from_field: '', label: 'links',            normalize: 'none',      required: false, active: true },
    { path: 'headline',         from_field: '', label: 'headline',         normalize: 'trim',      required: false, active: true },
    { path: 'years_experience', from_field: '', label: 'years_experience', normalize: 'none',      required: false, active: true },
    { path: 'skills',           from_field: '', label: 'skills',           normalize: 'canonical', required: false, active: true },
    { path: 'experience',       from_field: '', label: 'experience',       normalize: 'none',      required: false, active: true },
    { path: 'education',        from_field: '', label: 'education',        normalize: 'none',      required: false, active: true },
    { path: 'provenance',       from_field: '', label: 'provenance',       normalize: 'none',      required: false, active: true },
    { path: 'overall_confidence',from_field:'', label: 'overall_confidence',normalize:'none',      required: false, active: true },
  ])
  const [includeConfidence, setIncludeConfidence] = useState(true)
  const [includeProvenance, setIncludeProvenance]  = useState(true)
  const [onMissing, setOnMissing] = useState<'null' | 'omit' | 'error'>('null')
  const [projectedJson, setProjectedJson]   = useState('')
  const [projectionErrors, setProjectionErrors] = useState<string[]>([])
  const [projectionValid, setProjectionValid]   = useState(true)

  useEffect(() => { if (id) fetchCandidate() }, [id])

  const fetchCandidate = async () => {
    try {
      const res = await getCandidate(id!)
      setCandidate(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Keep a stable ref to candidate for use inside effects without stale closure
  const candidateRef = useRef<Candidate | null>(null)
  useEffect(() => { candidateRef.current = candidate }, [candidate])

  // Plain builder — reads current state at call-time
  const buildConfig = (): OutputConfig => ({
    fields: fields
      .filter(f => f.active)
      .map(f => ({
        path:       f.path,
        from_field: f.from_field || undefined,
        normalize:  f.normalize === 'none' ? undefined : f.normalize,
        required:   f.required,
        label:      f.label || undefined,
      })),
    include_confidence: includeConfidence,
    include_provenance: includeProvenance,
    on_missing: onMissing,
  })

  // Core projection call
  const runProjection = async (cand: Candidate, cfg: OutputConfig) => {
    try {
      const res = await generateOutput(cand.candidate_id, cfg)
      setProjectedJson(JSON.stringify(res.data.output, null, 2))
      setProjectionErrors(res.data.errors || [])
      setProjectionValid(res.data.valid ?? true)
    } catch (e: any) {
      setProjectedJson(JSON.stringify({ error: e.response?.data?.detail || 'Projection error' }, null, 2))
      setProjectionValid(false)
    }
  }

  // Re-project whenever ANY config value changes — including confidence + provenance toggles
  useEffect(() => {
    if (!candidate) return
    runProjection(candidate, buildConfig())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, fields, includeConfidence, includeProvenance, onMissing])

  const handleDownload = async () => {
    if (!candidate) return
    setDownloading(true)
    try {
      const res = await downloadCandidateJson(candidate.candidate_id, buildConfig())
      const blob = new Blob([res.data], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `output_${candidate.candidate_id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  if (loading)    return <Spinner />
  if (!candidate) return <EmptyState message="Candidate not found." />

  const score      = candidate.overall_confidence
  const isHigh     = score >= 85
  const isMid      = score >= 65 && score < 85
  const reasons    = candidate.confidence_reasons || []
  const hasReasons = reasons.length > 0

  // Build normalization display rows
  const normRows = Object.entries(FIELD_NORMALIZE_MAP).map(([key, meta]) => {
    const rawVal = (candidate as any)[key]
    const displayRaw = Array.isArray(rawVal)
      ? rawVal.slice(0, 2).join(', ') || '—'
      : rawVal ?? '—'
    return { field: meta.label, normalize: meta.normalize, raw: String(displayRaw), example: meta.example }
  })

  return (
    <div className="page fade-in">
      {/* Back link */}
      <Link to="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        color: 'var(--text-muted)', textDecoration: 'none',
        marginBottom: 24, fontSize: 13, fontWeight: 500,
      }}>
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* ── Page header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
            {candidate.full_name || 'Unnamed Candidate'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {candidate.headline || 'Candidate Profile'} &nbsp;·&nbsp;
            <span style={{ color: 'var(--text-dim)' }}>#{candidate.candidate_id}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <StatusBadge status={candidate.status} />
          <button
            className="btn btn-primary"
            style={{ gap: 7, padding: '8px 16px', fontSize: 13 }}
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={14} />
            {downloading ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 24, alignItems: 'start' }}>

        {/* ════ LEFT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Contact header card */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 16 }}>
              {candidate.emails?.map(email => (
                <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                  <Mail size={13} style={{ color: 'var(--accent)' }} /> {email}
                </div>
              ))}
              {candidate.phones?.map(phone => (
                <div key={phone} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                  <Phone size={13} style={{ color: 'var(--accent)' }} /> {phone}
                </div>
              ))}
              {candidate.location?.city && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
                  <MapPin size={13} style={{ color: 'var(--accent)' }} />
                  {candidate.location.city}{candidate.location.country ? `, ${candidate.location.country}` : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {candidate.links?.linkedin && (
                <a href={candidate.links.linkedin} target="_blank" rel="noreferrer"
                  className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                  <ExternalLink size={12} /> LinkedIn
                </a>
              )}
              {candidate.links?.github && (
                <a href={candidate.links.github} target="_blank" rel="noreferrer"
                  className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                  <ExternalLink size={12} /> GitHub
                </a>
              )}
              {candidate.links?.portfolio && (
                <a href={candidate.links.portfolio} target="_blank" rel="noreferrer"
                  className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                  <Globe size={12} /> Portfolio
                </a>
              )}
            </div>
          </div>

          {/* Skills */}
          <CollapsibleCard
            icon={<Code size={15} style={{ color: 'var(--accent)' }} />}
            title="Skills"
          >
            {candidate.skills?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {candidate.skills.map(s => (
                  <span key={s} className="chip">{s}</span>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skills detected.</p>}
          </CollapsibleCard>

          {/* Work Experience */}
          <CollapsibleCard
            icon={<Briefcase size={15} style={{ color: 'var(--accent)' }} />}
            title="Work Experience"
          >
            {candidate.experience?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {candidate.experience.map((exp, idx) => (
                  <div key={idx} style={{
                    paddingLeft: 14,
                    borderLeft: '2px solid var(--accent)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                        {exp.role || (exp as any).job_title || 'Role'}
                      </div>
                      {exp.duration_years != null && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card-2)',
                          padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {exp.duration_years} yrs
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 3 }}>{exp.company}</div>
                    {exp.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.6 }}>
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="info-panel warning" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>No work experience was detected in this candidate's profile. This reduces confidence score.</span>
              </div>
            )}
          </CollapsibleCard>

          {/* Education + Certs in grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <CollapsibleCard
              icon={<GraduationCap size={15} style={{ color: 'var(--accent)' }} />}
              title="Education"
            >
              {candidate.education?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {candidate.education.map((edu, idx) => (
                    <div key={idx}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{edu.degree}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{edu.institution}</div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {edu.year   && <span>Graduated: {edu.year}</span>}
                        {edu.cgpa   && <span>GPA: {edu.cgpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No education history detected.</p>}
            </CollapsibleCard>

            <CollapsibleCard
              icon={<Award size={15} style={{ color: 'var(--accent)' }} />}
              title="Certifications"
            >
              {candidate.certifications?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {candidate.certifications.map((c, idx) => (
                    <div key={idx} className="chip" style={{ background: 'var(--bg-card-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                      <Award size={11} style={{ marginRight: 4, color: 'var(--accent)' }} /> {c}
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No certifications listed.</p>}
            </CollapsibleCard>
          </div>

          {/* Projects */}
          {candidate.projects?.length > 0 && (
            <CollapsibleCard
              icon={<Code size={15} style={{ color: 'var(--accent)' }} />}
              title="Projects"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {candidate.projects.map((proj, idx) => (
                  <div key={idx}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{proj.name}</div>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>{proj.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {proj.tech_stack.map(tech => <span key={tech} className="chip" style={{ fontSize: 11 }}>{tech}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleCard>
          )}

          {/* Normalization Details */}
          <CollapsibleCard
            icon={<Info size={15} style={{ color: 'var(--accent)' }} />}
            title="Normalization Details"
            defaultOpen={false}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Shows what values were extracted and what normalization was applied during pipeline processing.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Field', 'Raw Value', 'Normalization', 'Example Transform'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)',
                        background: 'var(--bg-card-2)', borderBottom: '1px solid var(--border)',
                        fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--text)', fontWeight: 600 }}>{row.field}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 11 }}>
                        {row.raw}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: row.normalize === 'none' ? 'var(--bg-card-2)' : 'rgba(99,102,241,0.12)',
                          color: row.normalize === 'none' ? 'var(--text-muted)' : 'var(--accent)',
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600
                        }}>{row.normalize}</span>
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>
                        {row.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Confidence Score Card ── */}
          <div className="card" style={{
            padding: 24,
            background: scoreBgColor(score),
            borderColor: scoreBorderColor(score),
          }}>
            <SectionHeader
              icon={<ShieldAlert size={15} style={{ color: isHigh ? 'var(--green)' : isMid ? 'var(--yellow)' : 'var(--red)' }} />}
              title="Confidence Intelligence"
            />

            {/* Overall score */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Overall Trust Score</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card-2)',
                    padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    {scoreLabel(score)}
                  </span>
                  <span className={`${scoreClass(score)}`} style={{ fontSize: 22, fontWeight: 800 }}>
                    {score.toFixed(1)}%
                  </span>
                </div>
              </div>
              <ConfidenceBar score={score} />
            </div>

            {/* Score breakdown */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', marginBottom: 12 }}>
                SCORE BREAKDOWN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(candidate.confidence_breakdown || {}).map(([key, val]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-dim)' }}>{key.replace(/_/g, ' ')}</span>
                      <span className={scoreClass(val as number)} style={{ fontWeight: 600 }}>
                        {(val as number).toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 4 }}>
                      <div className="progress-fill" style={{
                        width: `${val}%`,
                        background: (val as number) >= 70
                          ? 'linear-gradient(90deg,var(--green),#34d399)'
                          : (val as number) >= 40
                          ? 'linear-gradient(90deg,var(--yellow),#fbbf24)'
                          : 'linear-gradient(90deg,var(--red),#f87171)'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why low? Confidence reasons */}
            {hasReasons && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', marginBottom: 10 }}>
                  WHY THIS SCORE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reasons.map((reason, i) => {
                    const isPositive = reason.toLowerCase().includes('well-structured') || reason.toLowerCase().includes('good completeness')
                    return (
                      <div key={i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '8px 12px', borderRadius: 8,
                        background: isPositive ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                        border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        fontSize: 12, lineHeight: 1.5,
                        color: isPositive ? 'var(--green)' : 'var(--text-dim)',
                      }}>
                        {isPositive
                          ? <CheckCircle size={13} style={{ flexShrink: 0, marginTop: 1, color: 'var(--green)' }} />
                          : <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1, color: 'var(--red)' }} />
                        }
                        {reason}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── AI Analytics ── */}
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader
              icon={<Info size={15} style={{ color: 'var(--accent)' }} />}
              title="AI Analytics"
            />
            {candidate.ai_tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {candidate.ai_tags.map(tag => (
                  <span key={tag} className="chip" style={{
                    background: isHigh ? 'rgba(16,185,129,0.12)' : isMid ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)',
                    color: isHigh ? 'var(--green)' : isMid ? 'var(--yellow)' : 'var(--red)',
                  }}>{tag}</span>
                ))}
              </div>
            )}
            {candidate.ai_red_flags?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', letterSpacing: '0.5px', marginBottom: 8 }}>
                  SYSTEM FLAGS
                </div>
                {candidate.ai_red_flags.map((flag, i) => (
                  <div key={i} className="info-panel danger" style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12 }}>{flag}</span>
                  </div>
                ))}
              </div>
            )}
            {candidate.ai_summary && (
              <div className="info-panel info" style={{ fontSize: 13, lineHeight: 1.6 }}>
                {candidate.ai_summary}
              </div>
            )}
          </div>

          {/* ── Projection Layer ── */}
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader
              icon={<Compass size={15} style={{ color: 'var(--accent)' }} />}
              title="Projection Layer"
              action={
                <span className={`badge ${projectionValid ? 'badge-selected' : 'badge-rejected'}`}>
                  {projectionValid ? '✔ Valid' : '❌ Invalid'}
                </span>
              }
            />

            {/* Config toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                  ON MISSING VALUE
                </label>
                <select className="select" style={{ width: '100%', fontSize: 13 }} value={onMissing} onChange={e => setOnMissing(e.target.value as any)}>
                  <option value="null">Set to NULL</option>
                  <option value="omit">Omit Field</option>
                  <option value="error">Throw Error</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Include Confidence</span>
                <div className={`toggle${includeConfidence ? ' on' : ''}`} onClick={() => {
                  const next = !includeConfidence
                  setIncludeConfidence(next)
                  setFields(prev => prev.map(f =>
                    f.path === 'overall_confidence' ? { ...f, active: next } : f
                  ))
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Include Provenance</span>
                <div className={`toggle${includeProvenance ? ' on' : ''}`} onClick={() => {
                  const next = !includeProvenance
                  setIncludeProvenance(next)
                  setFields(prev => prev.map(f =>
                    f.path === 'provenance' ? { ...f, active: next } : f
                  ))
                }} />
              </div>

              {/* Field mapping */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
                  SELECT & RENAME FIELDS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {fields
                    .filter(f => {
                      if (f.path === 'overall_confidence' && !includeConfidence) return false
                      if (f.path === 'provenance' && !includeProvenance) return false
                      return true
                    })
                    .map((f, idx) => {
                      const realIdx = fields.findIndex(ff => ff.path === f.path)
                      return (
                        <div key={f.path} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: 'var(--bg-card-2)', padding: '6px 10px',
                          borderRadius: 6, border: '1px solid var(--border)',
                        }}>
                          <input type="checkbox" checked={f.active} onChange={e => {
                            const next = [...fields]; next[realIdx] = { ...next[realIdx], active: e.target.checked }; setFields(next)
                          }} />
                          <span style={{ fontSize: 12, flex: 1, color: 'var(--text)', fontFamily: 'monospace' }}>{f.path}</span>
                          <input
                            className="input"
                            style={{ width: 100, padding: '3px 7px', fontSize: 11 }}
                            placeholder="rename…"
                            value={f.label}
                            onChange={e => {
                              const next = [...fields]; next[realIdx] = { ...next[realIdx], label: e.target.value }; setFields(next)
                            }}
                          />
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Projection errors */}
            {projectionErrors.length > 0 && (
              <div className="info-panel danger" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, letterSpacing: '0.4px' }}>PROJECTION ERRORS</div>
                {projectionErrors.map((err, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, marginTop: 4 }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {err}
                  </div>
                ))}
              </div>
            )}

            {/* Live JSON output */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                LIVE PROJECTED OUTPUT
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: 11, gap: 5 }}
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download size={11} /> {downloading ? 'Saving…' : 'Download'}
              </button>
            </div>
            <div className="json-preview">{projectedJson || '{}'}</div>
          </div>

          {/* ── Canonical Config Reference ── */}
          <CollapsibleCard
            icon={<FileText size={15} style={{ color: 'var(--accent)' }} />}
            title="Canonical Config Format"
            defaultOpen={false}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
              The default output configuration schema used by the pipeline. Copy this JSON to replicate the standard projection.
            </p>
            <div style={{ position: 'relative' }}>
              <div className="json-preview" style={{ maxHeight: 320 }}>
                {JSON.stringify(CANONICAL_CONFIG, null, 2)}
              </div>
              <button
                className="btn btn-ghost"
                style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', fontSize: 11, gap: 5 }}
                onClick={() => navigator.clipboard.writeText(JSON.stringify(CANONICAL_CONFIG, null, 2))}
              >
                Copy
              </button>
            </div>
          </CollapsibleCard>

        </div>
      </div>
    </div>
  )
}
