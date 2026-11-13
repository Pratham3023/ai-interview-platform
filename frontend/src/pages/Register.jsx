import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const handleChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (form.password.length < 6)       return toast.error('Password must be at least 6 characters')
    try {
      await register(form.email, form.password, form.fullName)
      toast.success('Account created')
      navigate('/upload')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Then upload your resume to start your first mock interview."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="reg-name">Full name</label>
          <input
            id="reg-name"
            type="text"
            className="form-input"
            value={form.fullName}
            onChange={handleChange('fullName')}
            required
            autoComplete="name"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            value={form.email}
            onChange={handleChange('email')}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            value={form.password}
            onChange={handleChange('password')}
            required
            autoComplete="new-password"
            aria-describedby="reg-password-hint"
          />
          <span className="form-hint" id="reg-password-hint">At least 6 characters.</span>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
          <input
            id="reg-confirm"
            type="password"
            className="form-input"
            value={form.confirm}
            onChange={handleChange('confirm')}
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          id="register-submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading}
          style={{ marginTop: 6 }}
        >
          {loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
