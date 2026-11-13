import React from 'react'

export default function Privacy() {
  return (
    <div className="page-wrapper-sm">
      <div className="card">
        <h1 className="section-title" style={{ marginBottom: 24, fontSize: 24 }}>Privacy Policy</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
          <p><strong>Effective Date:</strong> September 15, 2026</p>
          <p>This Privacy Policy describes how InterviewAI collects, uses, and shares your personal information.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>1. Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, and resume content, which is used strictly for generating interview questions and learning roadmaps.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>2. How We Use Your Information</h2>
          <p>Your data is used to provide, maintain, and improve our services. We do not sell your personal data to third parties.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>3. Data Security</h2>
          <p>We implement appropriate technical and organizational measures to protect the security of your personal information.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>4. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at privacy@example.com.</p>
        </div>
      </div>
    </div>
  )
}
