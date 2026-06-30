import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Eye, Filter, ArrowUpDown, Download, Trash2 } from 'lucide-react'
import { getCandidates, deleteCandidate, downloadReport } from '../api'
import type { Candidate } from '../types'
import { Spinner, EmptyState, StatusBadge, ConfidenceBar } from '../components/UI'

export default function CandidatesPage() {
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState(urlSearch)
  const [status, setStatus] = useState('')
  const [minExp, setMinExp] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetchCandidates()
  }, [search, status, minExp, sort])

  const fetchCandidates = async () => {
    try {
      const res = await getCandidates({
        search: search || undefined,
        status: status || undefined,
        min_experience: minExp ? parseFloat(minExp) : undefined,
        sort
      })
      setCandidates(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return
    try {
      await deleteCandidate(id)
      fetchCandidates()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownload = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const res = await downloadReport(format)
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `candidates_report.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Candidates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Explore parsed resumes, AI analytics, and confidence reports
          </p>
        </div>

        {/* Download Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => handleDownload('json')}>
            <Download size={14} /> JSON
          </button>
          <button className="btn btn-ghost" onClick={() => handleDownload('csv')}>
            <Download size={14} /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleDownload('pdf')}>
            <Download size={14} /> PDF Summary
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="card" style={{ padding: 18, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, email, or key skills…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Status */}
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Selected">Selected</option>
            <option value="Review Required">Review Required</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Min Experience */}
          <select className="select" value={minExp} onChange={e => setMinExp(e.target.value)}>
            <option value="">Any Experience</option>
            <option value="1">1+ Year</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="8">8+ Years</option>
          </select>

          {/* Sort */}
          <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest Upload</option>
            <option value="oldest">Oldest Upload</option>
            <option value="highest">Highest Confidence</option>
            <option value="lowest">Lowest Confidence</option>
          </select>
        </div>
      </div>

      {/* Grid or Table */}
      {loading ? (
        <Spinner />
      ) : candidates.length === 0 ? (
        <EmptyState message="No candidates match your filters. Upload resumes to populate your intelligence directory." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {candidates.map((c) => (
            <div key={c.candidate_id} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, marginRight: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                    <Link to={`/candidates/${c.candidate_id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                      {c.full_name || 'Unnamed Candidate'}
                    </Link>
                  </h3>
                  <StatusBadge status={c.status} />
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                  {c.headline || 'Resume Parsed Candidate'} · {c.years_experience} Years Exp
                </p>

                {/* Skills Chips */}
                {c.skills && c.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {c.skills.slice(0, 6).map((skill) => (
                      <span key={skill} className="chip">{skill}</span>
                    ))}
                    {c.skills.length > 6 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                        +{c.skills.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confidence Score Bar */}
              <div style={{ marginRight: 32 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Confidence Score</div>
                <ConfidenceBar score={c.overall_confidence} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/candidates/${c.candidate_id}`} className="btn btn-ghost" style={{ padding: 8 }}>
                  <Eye size={15} />
                </Link>
                <button className="btn btn-danger" style={{ padding: 8 }} onClick={() => handleDelete(c.candidate_id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
