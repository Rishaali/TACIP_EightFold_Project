import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import Pipeline from './pages/Pipeline'
import CandidatesPage from './pages/CandidatesPage'
import CandidateProfile from './pages/CandidateProfile'
import RuntimeConfig from './pages/RuntimeConfig'

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // Dark mode classes can be mapped here if needed
  }, [theme])

  const handleToggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <Router>
      <div className="layout">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Right Content Area */}
        <div className="main-content">
          <Navbar theme={theme} onToggleTheme={handleToggleTheme} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateProfile />} />
            <Route path="/config" element={<RuntimeConfig />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}
