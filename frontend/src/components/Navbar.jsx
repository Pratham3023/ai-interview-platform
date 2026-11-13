import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Wordmark } from './Marks'

export default function Navbar({ onOpenCommand }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/') }
  const isActive = (path) => location.pathname.startsWith(path)

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/upload',    label: 'New interview' },
  ]

  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-inner">
        <Wordmark to="/dashboard" />

        <div className="navbar-links">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={'navbar-link' + (isActive(to) ? ' active' : '')}
              aria-current={isActive(to) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="navbar-right">
          <button onClick={onOpenCommand} className="navbar-cmd-btn" aria-label="Jump to a page">
            <Search size={16} strokeWidth={1.75} />
            <span className="navbar-cmd-text">Jump to…</span>
            <kbd>Ctrl K</kbd>
          </button>

          <div className="navbar-user">
            <div className="navbar-avatar" aria-hidden="true">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="navbar-username">{user?.full_name?.split(' ')[0]}</span>
            <button onClick={handleLogout} title="Sign out" aria-label="Sign out" className="icon-btn">
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
