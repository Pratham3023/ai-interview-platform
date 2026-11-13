import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { FileText, X } from 'lucide-react'
import { resumeAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function ResumeUpload() {
  const navigate  = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState(null)
  const [file, setFile]           = useState(null)

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0]
    if (!f) return
    if (f.type !== 'application/pdf') return toast.error('That file isn’t a PDF. Export your resume as PDF and try again.')
    if (f.size > 10 * 1024 * 1024)   return toast.error('That file is over 10 MB. Try a smaller export.')
    setFile(f)
    setUploading(true)
    try {
      const data = await resumeAPI.upload(f)
      setResult(data)
      toast.success(`Found ${data.total_skills_detected} skills`)
    } catch (err) {
      toast.error(err.message || 'Couldn’t read that resume. Try again.')
      setFile(null)
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1, disabled: uploading,
  })

  const reset = () => { setResult(null); setFile(null) }

  return (
    <div className="page-wrapper-md">
      <ol className="flow-steps" aria-label="Interview setup">
        <li aria-current="step">Resume</li>
        <li>Role</li>
        <li>Interview</li>
      </ol>

      <div className="page-head">
        <h1>Upload your resume</h1>
        <p>We read the skills you list so the questions match your background. Nothing else is asked of you yet.</p>
      </div>

      {!result ? (
        <>
          <div
            {...getRootProps()}
            className={'dropzone' + (isDragActive ? ' is-active' : '') + (uploading ? ' is-busy' : '')}
          >
            <input {...getInputProps()} aria-label="Resume PDF" />
            {uploading ? (
              <div>
                <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, marginBottom: 16 }} />
                <p className="dropzone-title">Reading {file?.name || 'your resume'}…</p>
                <p>Picking out skills and grouping them by subject.</p>
              </div>
            ) : (
              <div>
                <FileText size={30} strokeWidth={1.5} style={{ color: 'var(--graphite)', marginBottom: 14 }} />
                <p className="dropzone-title">
                  {isDragActive ? 'Drop it here' : 'Drag your resume here, or click to choose a file'}
                </p>
                <p>PDF, up to 10 MB</p>
              </div>
            )}
          </div>

          <ul className="notes">
            <li>A PDF exported from Word or Google Docs works best. Scanned images can miss skills.</li>
            <li>Multi-column layouts and project sections are fine.</li>
            <li>You can upload a different version any time.</li>
          </ul>
        </>
      ) : (
        <>
          <div className="callout callout-success" style={{ marginBottom: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 650 }}>Found {result.total_skills_detected} skills</p>
              <p style={{ color: 'var(--graphite)', fontSize: '0.88rem' }}>{result.filename}</p>
            </div>
            <button onClick={reset} className="icon-btn" aria-label="Remove this resume" title="Remove">
              <X size={16} />
            </button>
          </div>

          <div className="sheet" style={{ marginBottom: 24 }}>
            <div className="section-header">
              <h2 className="section-title">Your skills, by subject</h2>
              <span className="label">{Object.keys(result.skill_profile || {}).length} subjects</span>
            </div>
            <div className="rows">
              {Object.entries(result.skill_profile).map(([domain, skills]) => (
                <div key={domain} className="row skill-row">
                  <div>
                    <div style={{ fontWeight: 650 }}>{domain}</div>
                    <div className="label">{skills.length} {skills.length === 1 ? 'skill' : 'skills'}</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {skills.map(skill => <span key={skill} className="tag">{skill}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/interview/setup/${result.resume_id}`)}
              className="btn btn-primary btn-lg"
            >
              Choose a role
            </button>
            <button onClick={reset} className="btn btn-secondary btn-lg">Upload a different resume</button>
          </div>
        </>
      )}
    </div>
  )
}
