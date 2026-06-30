import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Upload, GitBranch, Users, Settings, Brain
} from 'lucide-react'

const links = [
  { to: '/',         label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/upload',   label: 'Upload',      icon: Upload },
  { to: '/pipeline', label: 'Pipeline',    icon: GitBranch },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/config',   label: 'Output Config', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>TACIP</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>INTELLIGENCE PIPELINE</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>v1.0.0 · Trust-Aware AI</div>
      </div>
    </aside>
  )
}
