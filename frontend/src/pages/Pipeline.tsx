import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, CheckCircle2, Loader2, AlertCircle, Play, Eye
} from 'lucide-react'
import { getAllJobs, getPipelineJob } from '../api'
import type { PipelineJob } from '../types'
import { Spinner, EmptyState } from '../components/UI'

const STAGES = [
  "Resume Parsing",
  "Information Extraction",
  "Candidate Profile Generation",
  "Confidence Score Calculation",
  "AI Analysis",
  "Runtime Output Generation"
]

export default function Pipeline() {
  const [searchParams] = useSearchParams()
  const activeJobId = searchParams.get('job_id')

  const [jobs, setJobs] = useState<PipelineJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null)

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeJobId && jobs.length > 0) {
      const match = jobs.find(j => j.job_id === activeJobId)
      if (match) setSelectedJob(match)
    } else if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0])
    }
  }, [jobs, activeJobId])

  const fetchJobs = async () => {
    try {
      const res = await getAllJobs()
      setJobs(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const getStageIndex = (stage: string) => {
    return STAGES.indexOf(stage)
  }

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Pipeline Status</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Monitor live data extraction, AI trust-scoring, and output rendering stages
        </p>
      </div>

      {loading && jobs.length === 0 ? (
        <Spinner />
      ) : jobs.length === 0 ? (
        <EmptyState message="No active pipeline jobs. Upload resumes to trigger the processing pipeline." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          {/* Job List */}
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              Active Jobs ({jobs.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
              {jobs.map((job) => {
                const isActive = selectedJob?.job_id === job.job_id
                return (
                  <div
                    key={job.job_id}
                    onClick={() => setSelectedJob(job)}
                    style={{
                      padding: 12, borderRadius: 8, cursor: 'pointer',
                      background: isActive ? 'rgba(99,102,241,0.1)' : 'var(--bg-card-2)',
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.file}
                      </div>
                      <span className={`badge ${
                        job.status === 'complete' ? 'badge-selected' : job.status === 'error' ? 'badge-rejected' : 'badge-review'
                      }`} style={{ fontSize: 9 }}>
                        {job.status}
                      </span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      Stage: {job.current_stage || 'Queued'}
                    </div>

                    <div className="progress-bar" style={{ marginTop: 8 }}>
                      <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected Job Tracker */}
          <div className="card" style={{ padding: 24 }}>
            {selectedJob ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>{selectedJob.file}</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Job ID: {selectedJob.job_id}</p>
                  </div>

                  {selectedJob.status === 'complete' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {selectedJob.candidate_id && (
                        <Link to={`/candidates/${selectedJob.candidate_id}`} className="btn btn-primary">
                          <Eye size={14} /> View Profile
                        </Link>
                      )}
                      {selectedJob.candidate_ids && (
                        <Link to="/candidates" className="btn btn-primary">
                          <Eye size={14} /> View Candidates
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {selectedJob.status === 'error' && (
                  <div style={{
                    padding: 14, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.2)', marginBottom: 20, fontSize: 13
                  }}>
                    <AlertCircle size={14} style={{ marginRight: 6 }} />
                    Error: {selectedJob.error || 'Parsing failed'}
                  </div>
                )}

                {/* Steps tracker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {STAGES.map((stage, idx) => {
                    const activeIdx = getStageIndex(selectedJob.current_stage)
                    const isCompleted = selectedJob.status === 'complete' || idx < activeIdx
                    const isActive = selectedJob.status === 'processing' && idx === activeIdx

                    return (
                      <div
                        key={stage}
                        className={`pipeline-step${isCompleted ? ' complete' : isActive ? ' active' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
                          {isCompleted ? (
                            <CheckCircle2 size={20} color="var(--green)" />
                          ) : isActive ? (
                            <Loader2 size={20} className="spin" color="var(--accent)" />
                          ) : (
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: 'var(--border)'
                            }} />
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: isCompleted ? 'var(--text)' : isActive ? 'var(--accent)' : 'var(--text-muted)'
                          }}>
                            {stage}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {isCompleted ? 'Completed successfully' : isActive ? 'Analyzing data stream...' : 'Waiting to start'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <EmptyState message="Select a job from the list to view its pipeline status details." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
