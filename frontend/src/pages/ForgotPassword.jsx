import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AuthLayout from '../components/AuthLayout'
import { SparklesIcon, ArrowRightIcon } from '../components/Icons'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Account Recovery"
      title="Secure Password Reset &amp; Recovery."
      blurb="Enter the email associated with your account and we'll generate a cryptographically signed, time-limited reset link."
      activeStage={2}
    >
      <h1>Reset Password</h1>
      <p>We will email you a secure recovery link.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {sent ? (
        <div className="alert alert-success">
          If that email is registered, a password reset link has been dispatched. Check your inbox (or backend terminal in local dev mode).
        </div>
      ) : (
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
              placeholder="you@company.com"
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : (
              <>
                <span>Send Reset Link</span>
                <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </form>
      )}

      <div className="auth-form-foot">
        Remembered your password? <Link to="/login">Back to log in</Link>
      </div>
    </AuthLayout>
  )
}
