import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle2, Download, BarChart2, Users, Zap, AlertTriangle } from 'lucide-react'
import { getConfig, saveConfig } from '../api'
import api from '../api'
import type { OutputConfig, FieldConfig } from '../types'
import { Spinner } from '../components/UI'

const NORMALIZATIONS = ["none", "E164", "canonical", "lowercase", "trim"]

export default function RuntimeConfig() {
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any | null>(null)

  // Config States
  const [includeConfidence, setIncludeConfidence] = useState(true)
  const [includeProvenance, setIncludeProvenance] = useState(true)
  const [onMissing, setOnMissing] = useState<'null' | 'omit' | 'error'>('null')
  const [fields, setFields] = useState<FieldConfig[]>([])

  useEffect(() => {
    fetchConfig()
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const res = await api.get('/pipeline/summary')
      setSummary(res.data)
    } catch (e) { /* summary is optional */ }
  }

  const fetchConfig = async () => {
    try {
      const res = await getConfig()
      const data: OutputConfig = res.data
      setIncludeConfidence(data.include_confidence)
      setIncludeProvenance(data.include_provenance)
      setOnMissing(data.on_missing)
      setFields(data.fields || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = () => {
    setFields([...fields, { path: '', from_field: '', normalize: 'none', required: false, label: '' }])
  }

  const handleRemoveField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  const handleFieldChange = (idx: number, key: keyof FieldConfig, value: any) => {
    const next = [...fields]
    next[idx] = { ...next[idx], [key]: value }
    setFields(next)
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)
    const cfg = buildConfig()
    try {
      await saveConfig(cfg)
      setSuccess('Runtime configuration updated successfully!')
    } catch (e) {
      setError('Failed to save config')
    }
  }

  const buildConfig = (): OutputConfig => {
    const validFields = fields.filter(f => f.path.trim())
    return {
      fields: validFields.map(f => ({
        path: f.path,
        from_field: f.from_field || undefined,
        normalize: f.normalize === 'none' ? undefined : f.normalize,
        required: f.required,
        label: f.label || undefined
      })),
      include_confidence: includeConfidence,
      include_provenance: includeProvenance,
      on_missing: onMissing
    }
  }

  const handleDownloadConfig = () => {
    const cfg = buildConfig()
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'tacip_output_config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Generate dynamic config mock preview
  const generatePreviewJson = () => {
    const preview: Record<string, any> = {}
    fields.forEach(f => {
      if (!f.path) return
      const key = f.label || f.path
      let sampleVal: any = `[Value projected from ${f.from_field || f.path}]`
      if (f.normalize === 'E164') sampleVal = "+12345678900"
      if (f.normalize === 'canonical') sampleVal = "React Developer"
      if (f.normalize === 'lowercase') sampleVal = "john.doe@example.com"
      preview[key] = sampleVal
    })
    if (includeConfidence) preview["overall_confidence"] = 92.5
    if (includeProvenance) preview["provenance"] = ["PDF: resume.pdf"]
    return JSON.stringify(preview, null, 2)
  }

  if (loading) return <Spinner />

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>Projection Layer Configuration</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Reshape, normalize, rename and map candidate outputs dynamically without backend rebuilds
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={handleDownloadConfig}
            title="Download current config as JSON"
            style={{ gap: 7 }}
          >
            <Download size={14} /> Download Config
          </button>
          <button className="btn btn-primary" onClick={handleSave} style={{ gap: 7 }}>
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </div>

      {success && (
        <div className="card" style={{
          padding: 16, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)',
          color: 'var(--green)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20
        }}>
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {error && (
        <div className="card" style={{
          padding: 16, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
          color: 'var(--red)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 24 }}>
        {/* Left Card: Field Mapping & Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* General settings */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pipeline Projection Strategy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Missing Value Handling Policy
                </label>
                <select className="select" style={{ width: '100%' }} value={onMissing} onChange={e => setOnMissing(e.target.value as any)}>
                  <option value="null">Set to NULL (Default behavior)</option>
                  <option value="omit">OMIT (Completely drop missing keys from JSON)</option>
                  <option value="error">ERROR (Fail pipeline validation checks)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>Include Confidence Scores</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Injects overall confidence score in output JSON</div>
                </div>
                <div className={`toggle${includeConfidence ? ' on' : ''}`} onClick={() => setIncludeConfidence(!includeConfidence)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>Include Provenance Metadata</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Injects source file name & parsing path logs</div>
                </div>
                <div className={`toggle${includeProvenance ? ' on' : ''}`} onClick={() => setIncludeProvenance(!includeProvenance)} />
              </div>
            </div>
          </div>

          {/* Fields Editor */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Field Mapping Projection Layout</h3>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={handleAddField}>
                + Add Custom Field
              </button>
            </div>

            {fields.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No field projections defined.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {fields.map((f, idx) => (
                  <div key={idx} style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr auto auto', gap: 10,
                    alignItems: 'center', background: 'var(--bg-card-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)'
                  }}>
                    {/* Path name */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Target Name</label>
                      <input
                        className="input"
                        style={{ padding: '6px 10px', fontSize: 12, marginTop: 4 }}
                        placeholder="e.g. primary_email"
                        value={f.path}
                        onChange={e => handleFieldChange(idx, 'path', e.target.value)}
                      />
                    </div>

                    {/* From path mapping */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>From Field (Path)</label>
                      <input
                        className="input"
                        style={{ padding: '6px 10px', fontSize: 12, marginTop: 4 }}
                        placeholder="e.g. emails[0]"
                        value={f.from_field || ''}
                        onChange={e => handleFieldChange(idx, 'from_field', e.target.value)}
                      />
                    </div>

                    {/* Custom Label */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rename / Label</label>
                      <input
                        className="input"
                        style={{ padding: '6px 10px', fontSize: 12, marginTop: 4 }}
                        placeholder="e.g. contact_email"
                        value={f.label || ''}
                        onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                      />
                    </div>

                    {/* Normalization */}
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Normalize</label>
                      <select
                        className="select"
                        style={{ padding: '5px 8px', fontSize: 12, marginTop: 4, width: '100%' }}
                        value={f.normalize || 'none'}
                        onChange={e => handleFieldChange(idx, 'normalize', e.target.value)}
                      >
                        {NORMALIZATIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>

                    {/* Required Check */}
                    <div style={{ textAlign: 'center' }}>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>Required</label>
                      <input
                        type="checkbox"
                        style={{ marginTop: 8 }}
                        checked={f.required}
                        onChange={e => handleFieldChange(idx, 'required', e.target.checked)}
                      />
                    </div>

                    {/* Delete */}
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 10px', marginTop: 14 }}
                      onClick={() => handleRemoveField(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Schema Output Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              Live Schema Configuration Output Preview
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Demonstrates output document shape that API will serve according to rules configured on the left.
            </p>
            <div className="json-preview" style={{ height: '420px', maxHeight: 'none' }}>
              {generatePreviewJson()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Processing Summary ────────────────────────────────────────────── */}
      {summary && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <BarChart2 size={18} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Processing Summary</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
              Live stats across all pipeline jobs
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* Pipeline Jobs */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Zap size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Pipeline Jobs</span>
              </div>
              {[
                { label: 'Total Jobs',    value: summary.pipeline?.total_jobs ?? 0,   color: 'var(--text)' },
                { label: 'Completed',     value: summary.pipeline?.completed ?? 0,     color: 'var(--green)' },
                { label: 'Processing',    value: summary.pipeline?.processing ?? 0,    color: 'var(--accent)' },
                { label: 'Queued',        value: summary.pipeline?.queued ?? 0,        color: 'var(--yellow)' },
                { label: 'Failed',        value: summary.pipeline?.failed ?? 0,        color: 'var(--red)' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, padding: '6px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{
                marginTop: 12, fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>Success Rate</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {summary.pipeline?.success_rate ?? 0}%
                </span>
              </div>
              <div className="progress-bar" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${summary.pipeline?.success_rate ?? 0}%` }} />
              </div>
            </div>

            {/* Candidate Normalization */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Users size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Candidate Normalization</span>
              </div>
              {[
                { label: 'Total Processed',    value: summary.candidates?.total_processed ?? 0,   color: 'var(--text)' },
                { label: 'Fully Normalized',   value: summary.candidates?.fully_normalized ?? 0,  color: 'var(--green)' },
                { label: 'Partial Profiles',   value: summary.candidates?.partial_profiles ?? 0,  color: 'var(--yellow)' },
                { label: 'Error Profiles',     value: summary.candidates?.error_profiles ?? 0,    color: 'var(--red)' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, padding: '6px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{
                marginTop: 12, fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span>Normalization Rate</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                  {summary.candidates?.normalization_rate ?? 0}%
                </span>
              </div>
              <div className="progress-bar" style={{ marginTop: 6 }}>
                <div className="progress-fill" style={{ width: `${summary.candidates?.normalization_rate ?? 0}%` }} />
              </div>
            </div>

            {/* Confidence Breakdown */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Confidence Breakdown</span>
              </div>
              {[
                { label: 'Selected',        value: summary.confidence?.selected ?? 0,        color: 'var(--green)' },
                { label: 'Review Required', value: summary.confidence?.review_required ?? 0,  color: 'var(--yellow)' },
                { label: 'Rejected',        value: summary.confidence?.rejected ?? 0,         color: 'var(--red)' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 13, padding: '8px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: row.color, display: 'inline-block'
                    }} />
                    <span style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                  </span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-card-2)', border: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg Confidence Score</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                  {summary.confidence?.avg_score ?? 0}%
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
