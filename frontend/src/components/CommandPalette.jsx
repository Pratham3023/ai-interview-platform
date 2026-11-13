import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Upload, Map, Sparkles,
  LogOut, LogIn, UserPlus, ArrowRight, CornerDownLeft, X,
  Terminal, Volume2, Shield, FileText
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function CommandPalette({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const items = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      shortcut: 'G D',
      action: () => { navigate('/dashboard'); onClose() },
      show: !!user,
    },
    {
      id: 'upload',
      label: 'New interview',
      category: 'Interviews',
      icon: Upload,
      shortcut: 'N I',
      action: () => { navigate('/upload'); onClose() },
      show: !!user,
    },
    {
      id: 'login',
      label: 'Sign in',
      category: 'Account',
      icon: LogIn,
      action: () => { navigate('/login'); onClose() },
      show: !user,
    },
    {
      id: 'register',
      label: 'Create account',
      category: 'Account',
      icon: UserPlus,
      action: () => { navigate('/register'); onClose() },
      show: !user,
    },
    {
      id: 'studio-preview',
      label: 'How a session runs',
      category: 'Home page',
      icon: Terminal,
      action: () => {

        navigate('/')
        onClose()
        setTimeout(() => {
          document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      },
      show: true,
    },
    {
      id: 'privacy',
      label: 'Privacy',
      category: 'General',
      icon: Shield,
      action: () => { navigate('/privacy'); onClose() },
      show: true,
    },
    {
      id: 'terms',
      label: 'Terms',
      category: 'General',
      icon: FileText,
      action: () => { navigate('/terms'); onClose() },
      show: true,
    },
    {
      id: 'logout',
      label: 'Sign out',
      category: 'Account',
      icon: LogOut,
      action: () => { logout(); navigate('/'); onClose() },
      show: !!user,
    },
  ].filter(i => i.show)

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filtered, selectedIndex, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '12vh',
          paddingLeft: 16,
          paddingRight: 16,
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
            }}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 580,
              background: 'var(--sheet)',
              border: '1px solid var(--rule-2)',
              borderRadius: 8,
              boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {/* Search Input Box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              gap: 12,
            }}>
              <Search size={18} style={{ color: 'var(--pencil)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Jump to a page"
                aria-label="Jump to a page"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--rule)',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  padding: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Results List */}
            <div style={{
              maxHeight: 340,
              overflowY: 'auto',
              padding: '8px 10px',
            }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                }}>
                  Nothing matches “{query}”.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--pen-tint)' : 'transparent',
                        border: '1px solid transparent',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSelected ? 'var(--pen)' : 'var(--graphite)',
                          transition: 'all 0.12s ease',
                        }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--ink)',
                          }}>
                            {item.label}
                          </div>
                          
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.shortcut && (
                          <span style={{
                            fontSize: 11,
                            color: 'var(--graphite)',
                            background: '#FFFFFF',
                            border: '1px solid var(--rule)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}>
                            {item.shortcut}
                          </span>
                        )}
                        {isSelected && (
                          <CornerDownLeft size={13} style={{ color: 'var(--pen)' }} />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer with Keyboard Hints */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 18px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--sheet-2)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <span><kbd style={{ padding: '1px 4px', borderRadius: 3, }}>↑</kbd> <kbd style={{ padding: '1px 4px', borderRadius: 3, }}>↓</kbd> navigate</span>
                <span><kbd style={{ padding: '1px 4px', borderRadius: 3, }}>↵</kbd> select</span>
                <span><kbd style={{ padding: '1px 4px', borderRadius: 3, }}>esc</kbd> close</span>
              </div>

            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
