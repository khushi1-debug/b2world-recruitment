import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { SparklesIcon, ArrowRightIcon } from '../components/Icons'

const ROLES = [
  { value: 'candidate', label: 'Candidate — Looking for opportunities' },
  { value: 'hr_manager', label: 'HR Manager — Managing jobs & pipelines' },
  { value: 'recruiter', label: 'Recruiter — Sourcing & screening talent' },
  { value: 'project_manager', label: 'Project Manager — Overseeing teams' },
  { value: 'team_lead', label: 'Team Lead — Technical evaluations' },
  { value: 'developer', label: 'Developer — Team contributor' },
]

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('candidate')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(name, email, password, role)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(' '))
      } else {
        setError(detail || 'Could not create your account. Please try again.')
      }
    }
  }

  return (
    <AuthLayout
      eyebrow="Get Started"
      title="One platform, seven intelligent role workspaces."
      blurb="Whether you're hiring candidates, managing sprints, or applying for your next role — B2World tailors the interface directly to your needs."
      activeStage={0}
    >
      <h1>Create Account</h1>
      <p>Set up your B2World profile in seconds.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya Sharma"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Work Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="priya@company.com"
          />
        </div>

        <div className="field">
          <label htmlFor="role">Primary Role</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, 1 letter & 1 number"
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : (
            <>
              <SparklesIcon size={16} />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="auth-form-foot">
        Already have an account? <Link to="/login">Sign in here</Link>
      </div>
    </AuthLayout>
  )
}
