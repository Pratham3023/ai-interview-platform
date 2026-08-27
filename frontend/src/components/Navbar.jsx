import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Brain, LayoutDashboard, Upload, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/') }
  const isActive = (path) => location.pathname.startsWith(path)

  const navLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'New Interview' },
  ]

  return (
    <nav style={{ background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, maxWidth: 1300, margin: '0 auto' }}>
        {/* Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={24} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 18, fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            InterviewAI
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: 4 }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: isActive(to) ? '#fff' : 'var(--text-secondary)', background: isActive(to) ? 'var(--color-primary-glow)' : 'transparent', transition: 'all 0.15s ease' }}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{user?.full_name?.split(' ')[0]}</span>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
