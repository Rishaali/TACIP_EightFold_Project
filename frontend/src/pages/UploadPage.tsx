import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload, FileText, Link as LinkIcon, AlertCircle, CheckCircle2, History, Trash2
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import {
  uploadPdf, uploadMultiplePdfs, uploadCsv, uploadUrl, getUploadHistory
} from '../api'
import { Spinner } from '../components/UI'

export default function UploadPage() {
  const navigate = useNavigate()

  const [url, setUrl] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Combined Upload State
  const [combinedPdfs, setCombinedPdfs] = useState<File[]>([])
  const [combinedCsv, setCombinedCsv] = useState<File | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await getUploadHistory()
      setHistory(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Dropzones
  const { getRootProps: getPdfProps, getInputProps: getPdfInput, isDragActive: pdfActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      setError(null)
      setSuccess(null)
      setLoading(true)
      try {
        if (acceptedFiles.length === 1) {
          const res = await uploadPdf(acceptedFiles[0])
          setSuccess(`Successfully uploaded ${acceptedFiles[0].name}. Redirecting to pipeline...`)
          setTimeout(() => navigate(`/pipeline?job_id=${res.data.job_id}`), 1200)
        } else {
          const res = await uploadMultiplePdfs(acceptedFiles)
          setSuccess(`Successfully queued ${acceptedFiles.length} resumes. Redirecting to pipeline...`)
          setTimeout(() => navigate('/pipeline'), 1200)
        }
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to upload resume')
        setLoading(false)
      }
    }
  })

  const { getRootProps: getCsvProps, getInputProps: getCsvInput, isDragActive: csvActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      setError(null)
      setSuccess(null)
      setLoading(true)
      try {
        const res = await uploadCsv(acceptedFiles[0])
        setSuccess(`Successfully uploaded ${acceptedFiles[0].name}. Redirecting to pipeline...`)
        setTimeout(() => navigate(`/pipeline?job_id=${res.data.job_id}`), 1200)
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Failed to upload CSV')
        setLoading(false)
      }
    }
  })

  // URL upload handler
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await uploadUrl(url)
      setSuccess(`URL queued for processing. Redirecting to pipeline...`)
      setTimeout(() => navigate(`/pipeline?job_id=${res.data.job_id}`), 1200)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to parse resume from URL')
      setLoading(false)
    }
  }

  // Combined Upload Submit
  const handleCombinedSubmit = async () => {
    if (combinedPdfs.length === 0 || !combinedCsv) {
      setError('Please add both PDFs and a CSV metadata file.')
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      // First upload CSV
      const csvRes = await uploadCsv(combinedCsv)
      // Then upload the PDFs
      await uploadMultiplePdfs(combinedPdfs)
      setSuccess(`Successfully uploaded CSV and ${combinedPdfs.length} PDFs. Redirecting to pipeline...`)
      setTimeout(() => navigate('/pipeline'), 1500)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Combined upload failed')
      setLoading(false)
    }
  }

  return (
    <div className="page fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Resume & Data Ingestion</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Ingest resume PDFs, parse metadata CSVs, or combine both for rich profiling
        </p>
      </div>

      {error && (
        <div className="card" style={{
          padding: 16, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
          color: 'var(--red)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="card" style={{
          padding: 16, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)',
          color: 'var(--green)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20
        }}>
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>
        {/* Main upload options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Resume PDF Dropzone */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload Resumes (Single / Multiple PDFs)</h3>
            <div {...getPdfProps()} className={`dropzone${pdfActive ? ' active' : ''}`}>
              <input {...getPdfInput()} />
              <Upload size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>Drag and drop resume PDF(s) here</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Only PDF format is supported</p>
            </div>
          </div>

          {/* CSV Only Dropzone */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload CSV Only (Bulk Candidate Metadata)</h3>
            <div {...getCsvProps()} className={`dropzone${csvActive ? ' active' : ''}`}>
              <input {...getCsvInput()} />
              <FileText size={32} style={{ color: 'var(--accent)', marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>Drag and drop metadata CSV here</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>CSV with candidate details</p>
            </div>
          </div>

          {/* URL Ingestion */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload Resume using URL</h3>
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <LinkIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="https://example.com/resumes/john_doe.pdf"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !url.trim()}>
                Ingest URL
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Combined Upload & Ingestion History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Combined PDF + CSV */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload PDFs + CSV Together</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Map resume parsing alongside structured metadata inside your CSV file.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* PDF file selection */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Select Resume PDFs</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={e => setCombinedPdfs(Array.from(e.target.files || []))}
                  style={{ fontSize: 13, color: 'var(--text-dim)' }}
                />
                {combinedPdfs.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                    {combinedPdfs.length} PDFs selected
                  </div>
                )}
              </div>

              {/* CSV file selection */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Select Metadata CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCombinedCsv(e.target.files?.[0] || null)}
                  style={{ fontSize: 13, color: 'var(--text-dim)' }}
                />
                {combinedCsv && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                    CSV: {combinedCsv.name}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCombinedSubmit}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={loading || combinedPdfs.length === 0 || !combinedCsv}
              >
                Upload Combined Dataset
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card" style={{ padding: 24, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <History size={16} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Upload History</h3>
            </div>

            {historyLoading ? (
              <Spinner />
            ) : history.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No upload history found.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                {history.map((h) => (
                  <div key={h.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--bg-card-2)', borderRadius: 8, border: '1px solid var(--border)'
                  }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.file}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {h.type.toUpperCase()} · {new Date(h.uploaded_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className="badge badge-selected" style={{ fontSize: 10 }}>Ingested</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
