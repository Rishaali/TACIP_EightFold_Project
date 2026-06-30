import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, CheckCircle2, AlertTriangle, XCircle, Award, Search, ArrowUpDown, FileDown
} from 'lucide-react'
import { getStats, getCandidates, downloadReport } from '../api'
import type { Candidate, Stats } from '../types'
import { StatCard, StatusBadge, ConfidenceBar, Spinner, EmptyState } from '../components/UI'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [minExperience, setMinExperience] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetchData()
  }, [search, status, minExperience, sort])

  const fetchData = async () => {
    try {
      const statsRes = await getStats()
      setStats(statsRes.data)

      const candRes = await getCandidates({
        search: search || undefined,
        status: status || undefined,
        min_experience: minExperience ? parseFloat(minExperience) : undefined,
        sort
      })
      setCandidates(candRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const res = await downloadReport(format)
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/pdf'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tacip_report.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      console.error('Failed to download report', e)
    }
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Candidate Intelligence</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Overview of automated candidate profile indexing & trust-scoring
          </p>
        </div>

        {/* Reports Download */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => handleExport('json')}>
            <FileDown size={14} /> JSON
          </button>
          <button className="btn btn-ghost" onClick={() => handleExport('csv')}>
            <FileDown size={14} /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('pdf')}>
            <FileDown size={14} /> PDF Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20, marginBottom: 32
        }}>
          <StatCard label="Total Candidates" value={stats.total} icon="👥" color="#6366f1" />
          <StatCard label="Selected" value={stats.selected} icon="✅" color="#10b981" />
          <StatCard label="Review Required" value={stats.review_required} icon="⚠️" color="#f59e0b" />
          <StatCard label="Rejected" value={stats.rejected} icon="❌" color="#ef4444" />
          <StatCard label="Avg Confidence" value={`${stats.average_confidence}%`} icon="🎯" color="#3b82f6" />
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: 18, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Selected">Selected</option>
          <option value="Review Required">Review Required</option>
          <option value="Rejected">Rejected</option>
        </select>

        {/* Experience Filter */}
        <select className="select" value={minExperience} onChange={e => setMinExperience(e.target.value)}>
          <option value="">Any Experience</option>
          <option value="2">2+ Years</option>
          <option value="5">5+ Years</option>
          <option value="8">8+ Years</option>
        </select>

        {/* Sort */}
        <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Confidence</option>
          <option value="lowest">Lowest Confidence</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: 10 }}>
        {loading ? (
          <Spinner />
        ) : candidates.length === 0 ? (
          <EmptyState message="No candidates match your filter criteria." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Experience</th>
                  <th>Confidence Score</th>
                  <th>Status</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.candidate_id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                      <Link to={`/candidates/${c.candidate_id}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>
                        {c.full_name || 'Unnamed Candidate'}
                      </Link>
                    </td>
                    <td>{(c.emails && c.emails[0]) || '—'}</td>
                    <td>{c.years_experience} Yrs</td>
                    <td>
                      <ConfidenceBar score={c.overall_confidence} />
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/candidates/${c.candidate_id}`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
