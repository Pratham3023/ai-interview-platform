import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle, ChevronRight, Brain, AlertCircle } from 'lucide-react'
import { resumeAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ResumeUpload() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [file, setFile] = useState(null)

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0]
    if (!f) return
    if (f.type !== 'application/pdf') return toast.error('Only PDF files are supported')
    if (f.size > 10 * 1024 * 1024) return toast.error('File too large (max 10 MB)')

    setFile(f)
    setUploading(true)

    try {
      const data = await resumeAPI.upload(f)
      setResult(data)
      toast.success(`${data.total_skills_detected} skills detected!`)
    } catch (err) {
      toast.error(err.message || 'Upload failed')
      setFile(null)
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, disabled: uploading,
  })

  const DOMAIN_COLORS = {
    DBMS: '#6366f1', DSA: '#06b6d4', OS: '#10b981', 'Computer Networks': '#f59e0b',
    Python: '#3b82f6', 'Machine Learning': '#a855f7', Java: '#ef4444',
    OOP: '#ec4899', 'Web Development': '#14b8a6', FastAPI: '#84cc16', MongoDB: '#22c55e',
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Upload Your Resume</h1>
        <p className="text-secondary">Upload your PDF resume to extract your technical skill profile and generate personalized interview questions.</p>
      </div>

      {!result ? (
        <div {...getRootProps()} className="card" style={{
          border: `2px dashed ${isDragActive ? '#6366f1' : 'var(--color-border)'}`,
          background: isDragActive ? 'rgba(99,102,241,0.08)' : 'var(--color-surface)',
          textAlign: 'center', padding: 64, cursor: 'pointer', transition: 'all 0.2s ease',
        }}>
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 16px', borderWidth: 3 }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>Analyzing resume...</p>
              <p className="text-secondary text-sm">Extracting skills with NLP engine</p>
            </div>
          ) : (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Upload size={32} style={{ color: '#6366f1' }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
              </h2>
              <p className="text-secondary" style={{ marginBottom: 16 }}>or click to browse files</p>
              <span className="badge badge-primary">PDF only · Max 10 MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Success header */}
          <div className="card" style={{ marginBottom: 24, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <CheckCircle size={40} style={{ color: '#10b981' }} />
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600 }}>{result.total_skills_detected} Skills Detected</h2>
                <p className="text-secondary text-sm">From: {result.filename}</p>
              </div>
            </div>
          </div>

          {/* Skill Profile */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Your Skill Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(result.skill_profile).map(([domain, skills]) => (
                <div key={domain}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: DOMAIN_COLORS[domain] || '#6366f1' }}>{domain}</span>
                    <span className="text-muted text-xs">{skills.length} skills</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skills.map(skill => (
                      <span key={skill} style={{ padding: '3px 10px', borderRadius: 6, background: `${DOMAIN_COLORS[domain] || '#6366f1'}18`, border: `1px solid ${DOMAIN_COLORS[domain] || '#6366f1'}40`, fontSize: 12, color: DOMAIN_COLORS[domain] || '#a5b4fc' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setResult(null); setFile(null) }} className="btn btn-secondary">
              <Upload size={16} /> Upload Different Resume
            </button>
            <button onClick={() => navigate(`/interview/setup/${result.resume_id}`)} className="btn btn-primary" style={{ flex: 1 }}>
              <Brain size={18} /> Start Interview <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Info Cards */}
      {!result && (
        <div className="grid-3" style={{ marginTop: 32 }}>
          {[
            { icon: Brain, title: 'AI Skill Extraction', desc: 'NLP engine matches your resume against 200+ technical keywords across 11 domains' },
            { icon: FileText, title: 'Multi-column Support', desc: 'PyMuPDF handles standard, multi-column, and complex resume layouts accurately' },
            { icon: AlertCircle, title: 'Text-based PDFs', desc: 'Ensure your PDF contains selectable text, not scanned images, for best results' },
          ].map(item => (
            <div key={item.title} className="card" style={{ padding: 20 }}>
              <item.icon size={20} style={{ color: '#6366f1', marginBottom: 10 }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.title}</h3>
              <p className="text-secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
