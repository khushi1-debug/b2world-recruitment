import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { SparklesIcon, MailIcon, LockIcon, ArrowRightIcon } from '../components/Icons'

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@b2world.demo', role: 'Super Admin' },
  { label: 'HR Manager', email: 'hr@b2world.demo', role: 'HR Manager' },
  { label: 'Recruiter', email: 'recruiter@b2world.demo', role: 'Recruiter' },
  { label: 'Developer', email: 'dev@b2world.demo', role: 'Developer' },
]

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('Demo@1234')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      const dest = location.state?.from || '/dashboard'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.')
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome Back"
      title="Every hire, every candidate, tracked with AI."
      blurb="Log in to access your intelligent candidate pipeline, run automated ATS scoring, and manage hiring workflows seamlessly."
      activeStage={1}
    >
      <h1>Log In</h1>
      <p>Enter your credentials or pick a demo account below.</p>

      {/* Demo Account Quick-Fill Helper for Boss / Evaluator */}
      <div className="auth-demo-picker">
        <div className="auth-demo-title">
          <SparklesIcon size={13} />
          <span>Quick Demo Logins (Click to autofill)</span>
        </div>
        <div className="auth-demo-buttons">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              className="demo-chip"
              onClick={() => handleQuickFill(acc.email)}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Work Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hr@b2world.demo"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-form-link-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : (
            <>
              <span>Sign In to B2World</span>
              <ArrowRightIcon size={16} />
            </>
          )}
        </button>
      </form>

      <div className="auth-form-foot">
        Don&apos;t have an account yet? <Link to="/register">Create one now</Link>
      </div>
    </AuthLayout>
  )
}
