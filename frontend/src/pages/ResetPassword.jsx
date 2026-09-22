import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import AuthLayout from '../components/AuthLayout'
import { SparklesIcon, CheckCircleIcon } from '../components/Icons'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('This reset link is missing its security token. Please request a new link.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await client.post('/api/auth/reset-password', { token, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Security Update"
      title="Create your new password."
      blurb="Choose a strong, unique password to secure your B2World recruitment workspace."
      activeStage={2}
    >
      <h1>Set New Password</h1>
      <p>Enter and confirm your new credentials below.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {done && (
        <div className="alert alert-success">
          <CheckCircleIcon size={18} />
          <span>Password updated successfully! Redirecting you to login…</span>
        </div>
      )}

      {!done && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, 1 letter & 1 number"
            />
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm New Password</label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Update Password & Log In'}
          </button>
        </form>
      )}

      <div className="auth-form-foot">
        <Link to="/login">Back to Sign In</Link>
      </div>
    </AuthLayout>
  )
}
