import { motion } from 'framer-motion'
import type { Status } from '../types'

export function StatusBadge({ status }: { status: Status }) {
  const cls: Record<Status, string> = {
    'Selected': 'badge-selected',
    'Review Required': 'badge-review',
    'Rejected': 'badge-rejected',
    'Pending': 'badge-pending',
  }
  return <span className={`badge ${cls[status]}`}>{status}</span>
}

export function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--yellow)' : 'var(--red)'
  const cls = score >= 85 ? 'conf-high' : score >= 65 ? 'conf-mid' : 'conf-low'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
      <div style={{ flex: 1 }}>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
      <span className={`${cls}`} style={{ fontSize: 13, fontWeight: 600, minWidth: 36 }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

export function StatCard({
  label, value, icon, color, subtitle
}: {
  label: string; value: string | number; icon: string; color: string; subtitle?: string
}) {
  return (
    <motion.div
      className="card stat-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stat-icon" style={{ background: `${color}22` }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{subtitle}</div>}
      </div>
    </motion.div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
      }} className="spin" />
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</div>
    </div>
  )
}
