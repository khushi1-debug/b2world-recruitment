import React, { useState } from 'react'
import client from '../api/client'
import {
  SparklesIcon,
  SearchIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  ClockIcon,
  AlertTriangleIcon
} from '../components/Icons'

const STAGE_LABELS = {
  applied: 'Applied',
  under_review: 'Under Review',
  screened: 'Screened & Scored',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  technical_round: 'Technical Evaluation',
  hr_round: 'HR Interview',
  selected: 'Selected & Offer Released 🎉',
  rejected: 'Not Selected at this Time',
  joined: 'Joined Team 🚀',
  withdrawn: 'Application Withdrawn',
}

const STAGE_BADGE = {
  selected: 'badge-emerald',
  joined: 'badge-emerald',
  rejected: 'badge-rose',
  applied: 'badge-gray',
  withdrawn: 'badge-gray',
  shortlisted: 'badge-brand',
  interview_scheduled: 'badge-sky',
}

const MILESTONES = [
  { id: 'applied', label: '1. Applied' },
  { id: 'screened', label: '2. Screened' },
  { id: 'interview', label: '3. Interview' },
  { id: 'offer', label: '4. Decision' },
]

function getMilestoneIndex(stage) {
  if (['applied'].includes(stage)) return 0
  if (['under_review', 'screened', 'shortlisted'].includes(stage)) return 1
  if (['interview_scheduled', 'technical_round', 'hr_round'].includes(stage)) return 2
  if (['selected', 'joined', 'rejected'].includes(stage)) return 3
  return 0
}

export default function TrackApplication() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [withdrawingId, setWithdrawingId] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setResults(null)
    setLoading(true)
    try {
      const res = await client.get('/api/candidates/track', {
        params: { email: email.trim() },
      })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No applications found for this email address.')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (candidateId) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be reversed.')) return
    setWithdrawingId(candidateId)
    try {
      await client.post(`/api/candidates/${candidateId}/withdraw`, null, {
        params: { email: email.trim() },
      })
      setResults(results.map((r) =>
        r.candidate_id === candidateId ? { ...r, stage: 'withdrawn' } : r
      ))
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not withdraw application at this moment.')
    } finally {
      setWithdrawingId(null)
    }
  }

  return (
    <div className="page container" style={{ maxWidth: 680 }}>
      <div className="page-head" style={{ textAlign: 'center', justifyContent: 'center' }}>
        <div>
          <h1>Candidate Self-Service Tracking</h1>
          <p>Check the live progress of your job applications with your email address.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 32, marginBottom: 28 }}>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email Address Used to Apply</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@example.com"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : (
              <>
                <SearchIcon size={16} />
                <span>Track Applications</span>
              </>
            )}
          </button>
        </form>
      </div>

      {results && (
        <div>
          <div className="hint" style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9375rem' }}>
            Found {results.length} application{results.length === 1 ? '' : 's'} for {results[0]?.full_name || 'you'}:
          </div>

          {results.map((r) => {
            const currentMilestone = getMilestoneIndex(r.stage)
            const canWithdraw = !['selected', 'joined', 'withdrawn'].includes(r.stage)

            return (
              <div key={r.job_id} className="card" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{r.job_title}</h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockIcon size={13} />
                      <span>Submitted on {new Date(r.applied_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <span className={`badge ${STAGE_BADGE[r.stage] || 'badge-brand'}`}>
                    {STAGE_LABELS[r.stage] || r.stage}
                  </span>
                </div>

                {/* Visual Step Tracker */}
                {r.stage !== 'withdrawn' && (
                  <div className="stepper-container">
                    <div className="stepper-line" />
                    {MILESTONES.map((m, idx) => {
                      const isCompleted = idx < currentMilestone
                      const isActive = idx === currentMilestone
                      return (
                        <div
                          key={m.id}
                          className={`stepper-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                        >
                          <div className="stepper-circle">
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <div className="stepper-label">{m.label}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {canWithdraw && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="link-btn"
                      style={{ color: 'var(--rose-600)' }}
                      onClick={() => handleWithdraw(r.candidate_id)}
                      disabled={withdrawingId === r.candidate_id}
                    >
                      {withdrawingId === r.candidate_id ? 'Processing withdrawal…' : 'Withdraw this application'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}