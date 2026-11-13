import React from 'react'

export default function Terms() {
  return (
    <div className="page-wrapper-sm">
      <div className="card">
        <h1 className="section-title" style={{ marginBottom: 24, fontSize: 24 }}>Terms and Conditions</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text-secondary)' }}>
          <p><strong>Effective Date:</strong> September 15, 2026</p>
          <p>Welcome to InterviewAI. By accessing or using our service, you agree to be bound by these Terms.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>1. Use of Service</h2>
          <p>You agree to use our services only for lawful purposes and in accordance with these Terms.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>2. User Content</h2>
          <p>You retain ownership of the resumes you upload, but grant us a license to process them for the purpose of generating your interview.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>3. Termination</h2>
          <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice, for conduct that we believe violates these Terms.</p>
          
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>4. Limitation of Liability</h2>
          <p>In no event shall InterviewAI be liable for any indirect, incidental, or consequential damages arising out of the use of our services.</p>
        </div>
      </div>
    </div>
  )
}
