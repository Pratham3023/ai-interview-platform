import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// Lazy loaded Pages
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ResumeUpload = lazy(() => import('./pages/ResumeUpload'))
const InterviewSetup = lazy(() => import('./pages/InterviewSetup'))
const InterviewSession = lazy(() => import('./pages/InterviewSession'))
const InterviewResults = lazy(() => import('./pages/InterviewResults'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))

// Layout
import Navbar from './components/Navbar'
import CommandPalette from './components/CommandPalette'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  const [cmdOpen, setCmdOpen] = React.useState(false)

  // Global Ctrl+K / Cmd+K shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const isInterview = location.pathname.startsWith('/interview/')
  
  return (
    <>
      {user && !isInterview && <Navbar onOpenCommand={() => setCmdOpen(true)} />}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      <Suspense fallback={
        <div className="page-wrapper" aria-busy="true">
          <div className="skeleton" style={{ width: 280, height: 34, marginBottom: 32 }} />
          <div className="skeleton" style={{ height: 96, marginBottom: 20 }} />
          <div className="grid-2">
            <div className="skeleton-card" style={{ height: 240 }} />
            <div className="skeleton-card" style={{ height: 240 }} />
          </div>
        </div>
      }>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing onOpenCommand={() => setCmdOpen(true)} />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
          <Route path="/interview/setup/:resumeId" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
          <Route path="/interview/:sessionId" element={<ProtectedRoute><InterviewSession /></ProtectedRoute>} />
          <Route path="/results/:sessionId" element={<ProtectedRoute><InterviewResults /></ProtectedRoute>} />
          <Route path="/roadmap/:sessionId" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#121215',
              color: '#F5F5F4',
              border: '1px solid #2A2A31',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 12px 30px -10px rgba(0,0,0,0.8)',
            },
            success: { iconTheme: { primary: '#5BD38A', secondary: '#000000' } },
            error: { iconTheme: { primary: '#FF7A6E', secondary: '#000000' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
