import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import {
  BriefcaseIcon,
  UsersIcon,
  BrainIcon,
  ClockIcon,
  TrendingUpIcon,
  PlusIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  MapPinIcon,
  FileTextIcon,
  CopyIcon,
  EyeIcon,
  CalendarIcon
} from '../components/Icons'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [jobs, setJobs] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(true)
  const [staleCandidates, setStaleCandidates] = useState([])

  const FINAL_STAGES = ['selected', 'rejected', 'joined']
  const isStale = (appliedAt, stage) => {
    if (FINAL_STAGES.includes(stage)) return false
    const days = Math.floor((Date.now() - new Date(appliedAt).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 7
  }

  const loadDashboard = async () => {
    try {
      const userRes = await client.get('/api/auth/me')
      setUser(userRes.data)

      const jobsRes = await client.get('/api/jobs/mine')
      setJobs(jobsRes.data)

      // Fetch analytics for each job
      const analyticsData = {}
      for (const job of jobsRes.data) {
        try {
          const analyticsRes = await client.get(`/api/jobs/${job.id}/analytics`)
          analyticsData[job.id] = analyticsRes.data
        } catch {
          analyticsData[job.id] = null
        }
      }
      setAnalytics(analyticsData)

      // Fetch all candidates once to find stale ones across every job
      try {
        const candidatesRes = await client.get('/api/candidates')
        const stale = candidatesRes.data.filter((c) => isStale(c.applied_at, c.stage))
        setStaleCandidates(stale)
      } catch {
        setStaleCandidates([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="page container">
        <div className="empty-state">
          <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 16 }}>Loading executive recruitment workspace…</p>
        </div>
      </div>
    )
  }

  const totalApplicants = Object.values(analytics).reduce((sum, a) => sum + (a?.total_applications || 0), 0)
  const validAnalytics = Object.values(analytics).filter((a) => a && a.avg_ats_score)
  const avgATS = validAnalytics.length > 0
    ? (validAnalytics.reduce((sum, a) => sum + (a.avg_ats_score || 0), 0) / validAnalytics.length).toFixed(0)
    : '—'

  const totalJobViews = jobs.reduce((sum, j) => sum + (j.views_count || 0), 0)

  const hireTimes = Object.values(analytics)
    .map((a) => a?.avg_time_to_hire_days)
    .filter((v) => v !== null && v !== undefined)
  const avgTimeToHire = hireTimes.length > 0
    ? `${(hireTimes.reduce((s, v) => s + v, 0) / hireTimes.length).toFixed(1)}d`
    : '—'

  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <h1>Recruitment Command Center</h1>
          <p>Welcome back, {user?.name || 'Recruiter'}. Real-time ATS metrics and pipeline intelligence.</p>
        </div>
        <div className="page-actions">
          <Link to="/jobs/new" className="btn btn-primary">
            <PlusIcon size={16} />
            <span>Create New Job</span>
          </Link>
        </div>
      </div>

      {/* Actionable Priority Banner for Stale Candidates */}
      {staleCandidates.length > 0 && (
        <div className="stale-alert">
          <div className="stale-alert-title">
            <AlertTriangleIcon size={18} />
            <span>Priority Attention: {staleCandidates.length} candidate{staleCandidates.length === 1 ? '' : 's'} waiting 7+ days without a decision</span>
          </div>
          <div className="stale-alert-list">
            {staleCandidates.slice(0, 6).map((c) => (
              <Link key={c.id} to={`/jobs/${c.job_id}/candidates`} className="stale-alert-item">
                {c.full_name} · {c.job_title || 'Role'} →
              </Link>
            ))}
            {staleCandidates.length > 6 && (
              <span className="hint" style={{ alignSelf: 'center', marginLeft: 8 }}>
                +{staleCandidates.length - 6} more in pipeline
              </span>
            )}
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <BriefcaseIcon size={28} />
          </div>
          <h3>No job postings created yet</h3>
          <p>Post your first job opening to start receiving and screening AI-ranked applications.</p>
          <div style={{ marginTop: 20 }}>
            <Link to="/jobs/new" className="btn btn-primary">
              <PlusIcon size={16} />
              <span>Post Your First Job</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Executive KPI Stats */}
          <div className="dash-grid">
            <div className="card dash-stat">
              <div className="dash-stat-top">
                <div className="dash-stat-label">Active Jobs</div>
                <div className="dash-stat-icon">
                  <BriefcaseIcon size={20} />
                </div>
              </div>
              <div className="dash-stat-num">{jobs.length}</div>
              <div className="dash-stat-trend">
                <TrendingUpIcon size={14} />
                <span>{jobs.filter((j) => j.status === 'published').length} published · {totalJobViews} views</span>
              </div>
            </div>

            <div className="card dash-stat">
              <div className="dash-stat-top">
                <div className="dash-stat-label">Total Applicants</div>
                <div className="dash-stat-icon" style={{ background: 'var(--sky-50)', color: 'var(--sky-600)' }}>
                  <UsersIcon size={20} />
                </div>
              </div>
              <div className="dash-stat-num">{totalApplicants}</div>
              <div className="dash-stat-trend" style={{ color: 'var(--sky-600)' }}>
                <span>Across all active roles</span>
              </div>
            </div>

            <div className="card dash-stat">
              <div className="dash-stat-top">
                <div className="dash-stat-label">Avg ATS Match</div>
                <div className="dash-stat-icon" style={{ background: 'var(--emerald-50)', color: 'var(--emerald-600)' }}>
                  <BrainIcon size={20} />
                </div>
              </div>
              <div className="dash-stat-num">{avgATS}{avgATS !== '—' ? '%' : ''}</div>
              <div className="dash-stat-trend">
                <span>AI qualification score</span>
              </div>
            </div>

            <div className="card dash-stat">
              <div className="dash-stat-top">
                <div className="dash-stat-label">Avg Time to Hire</div>
                <div className="dash-stat-icon" style={{ background: 'var(--amber-50)', color: 'var(--amber-600)' }}>
                  <ClockIcon size={20} />
                </div>
              </div>
              <div className="dash-stat-num">{avgTimeToHire}</div>
              <div className="dash-stat-trend" style={{ color: 'var(--amber-600)' }}>
                <span>Application to Selected</span>
              </div>
            </div>
          </div>

          {/* Active Jobs Pipeline Table */}
          <div className="card dash-table-card">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem' }}>Active Job Pipelines</h3>
                <p className="hint">Overview of applications, views, expiry dates, and candidate quality.</p>
              </div>
              <Link to="/candidates" className="btn btn-ghost btn-sm">
                View All Candidates
              </Link>
            </div>

            <table className="dash-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Views</th>
                  <th>Applicants</th>
                  <th>Avg ATS</th>
                  <th>Shortlisted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const analytics_for_job = analytics[j.id] || {}
                  const applicantsCount = analytics_for_job.total_applications || 0
                  const avgScore = analytics_for_job.avg_ats_score != null ? analytics_for_job.avg_ats_score.toFixed(0) : '—'
                  const isExp = j.expires_at && new Date(j.expires_at) < new Date()

                  return (
                    <tr key={j.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{j.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)' }}>
                          {j.experience_min}+ yrs exp {j.salary_min ? `· ₹${(j.salary_min / 100000).toFixed(0)}L-₹${(j.salary_max / 100000).toFixed(0)}L` : ''} · Lead: {j.created_by_name || 'HR Team'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${j.status === 'published' ? 'badge-emerald' : 'badge-gray'}`}>
                          {j.status}
                        </span>
                      </td>
                      <td>
                        {j.expires_at ? (
                          isExp ? (
                            <span className="badge badge-rose" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangleIcon size={12} />
                              <span>Expired {new Date(j.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </span>
                          ) : (
                            <span className="badge badge-sky" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CalendarIcon size={12} />
                              <span>{new Date(j.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )
                        ) : (
                          <span className="hint" style={{ fontSize: '0.75rem' }}>No Expiry</span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--ink-700)', fontSize: '0.85rem' }}>
                          <EyeIcon size={13} />
                          <span>{j.views_count || 0}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{applicantsCount}</span>
                      </td>
                      <td>
                        {avgScore !== '—' ? (
                          <span className={`badge ${Number(avgScore) >= 75 ? 'badge-emerald' : Number(avgScore) >= 50 ? 'badge-brand' : 'badge-amber'}`}>
                            {avgScore}%
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{analytics_for_job.funnel_by_stage?.shortlisted || 0}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => navigate('/jobs/new', { state: { duplicateJob: j } })}
                            className="btn btn-ghost btn-sm"
                            title="Duplicate this job posting"
                            style={{ padding: '4px 8px' }}
                          >
                            <CopyIcon size={13} />
                            <span>Duplicate</span>
                          </button>
                          <Link to={`/jobs/${j.id}/candidates`} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                            <span>Pipeline</span>
                            <ArrowRightIcon size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Hiring Funnel Analytics */}
          <HiringFunnel analytics={analytics} />

          {/* Sourcing & Location Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <SourceBreakdown analytics={analytics} />
            <LocationBreakdown analytics={analytics} />
          </div>
        </>
      )}
    </div>
  )
}

function HiringFunnel({ analytics }) {
  const buckets = [
    { label: '1. Applied', stages: ['applied'] },
    { label: '2. Screened & Review', stages: ['screened', 'under_review'] },
    { label: '3. Shortlisted', stages: ['shortlisted'] },
    { label: '4. Interview Rounds', stages: ['interview_scheduled', 'technical_round', 'hr_round'] },
    { label: '5. Selected & Joined', stages: ['selected', 'joined'] },
  ]

  const combined = {}
  Object.values(analytics).forEach((a) => {
    if (!a?.funnel_by_stage) return
    Object.entries(a.funnel_by_stage).forEach(([stage, count]) => {
      combined[stage] = (combined[stage] || 0) + count
    })
  })

  const bucketCounts = buckets.map((b) => ({
    label: b.label,
    count: b.stages.reduce((sum, s) => sum + (combined[s] || 0), 0),
  }))
  const maxCount = Math.max(...bucketCounts.map((b) => b.count), 1)

  if (bucketCounts.every((b) => b.count === 0)) return null

  return (
    <div className="card funnel-card">
      <h3 className="funnel-title">Recruitment Pipeline Funnel</h3>
      <p className="hint" style={{ marginBottom: 20 }}>
        Live distribution of candidates across the 5 primary pipeline milestones.
      </p>
      {bucketCounts.map((b) => {
        const percent = ((b.count / maxCount) * 100).toFixed(0)
        return (
          <div key={b.label} className="funnel-row">
            <div className="funnel-label">{b.label}</div>
            <div className="funnel-bar-track">
              <div className="funnel-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="funnel-count">{b.count}</div>
          </div>
        )
      })}
    </div>
  )
}

function SourceBreakdown({ analytics }) {
  const combined = {}
  Object.values(analytics).forEach((a) => {
    if (!a?.source_breakdown) return
    Object.entries(a.source_breakdown).forEach(([src, count]) => {
      combined[src] = (combined[src] || 0) + count
    })
  })

  const entries = Object.entries(combined).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null

  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div className="card funnel-card" style={{ marginBottom: 0 }}>
      <h3 className="funnel-title">Candidate Acquisition Sources</h3>
      <p className="hint" style={{ marginBottom: 18 }}>Where top applications are coming from.</p>
      {entries.map(([src, count]) => {
        const percent = ((count / total) * 100).toFixed(0)
        return (
          <div key={src} className="funnel-row">
            <div className="funnel-label">{src}</div>
            <div className="funnel-bar-track">
              <div className="funnel-bar-fill" style={{ width: `${percent}%`, background: 'var(--brand-500)' }} />
            </div>
            <div className="funnel-count">{count}</div>
          </div>
        )
      })}
    </div>
  )
}

function LocationBreakdown({ analytics }) {
  const combined = {}
  Object.values(analytics).forEach((a) => {
    if (!a?.location_breakdown) return
    Object.entries(a.location_breakdown).forEach(([loc, count]) => {
      combined[loc] = (combined[loc] || 0) + count
    })
  })

  const entries = Object.entries(combined).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null

  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div className="card funnel-card" style={{ marginBottom: 0 }}>
      <h3 className="funnel-title">Candidate Geographic Spread</h3>
      <p className="hint" style={{ marginBottom: 18 }}>Applicant locations across active roles.</p>
      {entries.map(([loc, count]) => {
        const percent = ((count / total) * 100).toFixed(0)
        return (
          <div key={loc} className="funnel-row">
            <div className="funnel-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPinIcon size={13} />
              <span>{loc}</span>
            </div>
            <div className="funnel-bar-track">
              <div className="funnel-bar-fill" style={{ width: `${percent}%`, background: 'var(--emerald-500)' }} />
            </div>
            <div className="funnel-count">{count}</div>
          </div>
        )
      })}
    </div>
  )
}