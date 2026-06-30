import { useState } from 'react'
import { Search, Bell, Moon, Sun, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface NavbarProps { theme: 'dark' | 'light'; onToggleTheme: () => void }

export default function Navbar({ theme, onToggleTheme }: NavbarProps) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/candidates?search=${encodeURIComponent(search)}`)
      setSearch('')
    }
  }

  return (
    <header className="navbar">
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
        <Search size={14} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)'
        }} />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search candidates… (Enter)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <button className="btn btn-ghost" style={{ padding: '8px', width: 36, height: 36, justifyContent: 'center' }}
        onClick={onToggleTheme} title="Toggle theme">
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div style={{
        width: 36, height: 36, borderRadius: 99,
        background: 'linear-gradient(135deg,#6366f1,#818cf8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <User size={16} color="white" />
      </div>
    </header>
  )
}
