import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  BriefcaseIcon,
  ClockIcon,
  DollarSignIcon,
  UploadCloudIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  EyeIcon,
  CalendarIcon,
  CopyIcon
} from '../components/Icons'

const HIRING_ROLES = ['super_admin', 'hr_manager', 'recruiter']

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', source: 'Direct', location: '' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    client.get(`/api/jobs/${id}`)
      .then((res) => setJob(res.data))
      .catch(() => setError('This job posting could not be located.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleApply = async (e) => {
    e.preventDefault()
    setApplyError('')
    if (!file) {
      setApplyError('Please attach your resume in PDF, DOCX, or TXT format.')
      return
    }
    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('job_id', id)
      data.append('full_name', form.full_name)
      data.append('email', form.email)
      data.append('phone', form.phone)
      data.append('source', form.source)
      data.append('location', form.location)
      data.append('resume', file)
      const res = await client.post('/api/candidates/apply', data)
      setResult(res.data)
    } catch (err) {
      setApplyError(err.response?.data?.detail || 'Could not submit your application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page container">
        <div className="empty-state">
          <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 14 }}>Loading role details…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page container">
        <div className="alert alert-error">{error}</div>
      </div>
    )
  }

  if (!job) return null

  const isExpired = job.expires_at && new Date(job.expires_at) < new Date()

  return (
    <div className="page container">
      <div className="job-detail-grid">
        {/* Job Information Card */}
        <div className="card job-detail-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h1>{job.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${job.status === 'published' ? 'badge-emerald' : 'badge-gray'}`}>{job.status}</span>
              <span className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <EyeIcon size={14} />
                <span>{job.views_count || 1} views</span>
              </span>
              {job.expires_at && (
                isExpired ? (
                  <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <AlertTriangleIcon size={13} />
                    <span>Expired {new Date(job.expires_at).toLocaleDateString()}</span>
                  </span>
                ) : (
                  <span className="badge badge-sky" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <CalendarIcon size={13} />
                    <span>Expires {new Date(job.expires_at).toLocaleDateString()}</span>
                  </span>
                )
              )}
            </div>
          </div>

          <div className="job-card-meta" style={{ marginTop: 12 }}>
            <span>
              <ClockIcon size={14} />
              {job.experience_min}+ yrs experience required
            </span>
            {job.salary_min && job.salary_max && (
              <span>
                <DollarSignIcon size={14} />
                ₹{(job.salary_min / 100000).toFixed(0)}L – ₹{(job.salary_max / 100000).toFixed(0)}L per annum
              </span>
            )}
            {job.expires_at && (
              <span>
                <CalendarIcon size={14} />
                Application Deadline: {new Date(job.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="hint" style={{ fontWeight: 600, marginBottom: 8, color: 'var(--ink-700)' }}>Required Tech Stack &amp; Skills:</div>
            <div className="job-card-skills">
              {job.skills_required && job.skills_required.map((s) => (
                <span key={s} className="badge badge-indigo">{s}</span>
              ))}
            </div>
          </div>

          <div className="job-detail-desc">
            <h3 style={{ fontSize: '1.125rem', marginBottom: 12, color: 'var(--ink-900)' }}>Role Description &amp; Responsibilities</h3>
            {job.description}
          </div>

          {user && HIRING_ROLES.includes(user.role) && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link to={`/jobs/${job.id}/candidates`} className="btn btn-primary">
                <BriefcaseIcon size={16} />
                <span>Open Recruiter Pipeline ({job.title})</span>
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/jobs/new', { state: { duplicateJob: job } })}
              >
                <CopyIcon size={15} />
                <span>Duplicate Job Posting</span>
              </button>
            </div>
          )}
        </div>

        {/* Application Card / ATS Result */}
        <div className="card apply-card">
          {result ? (
            <div className="ats-result-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--emerald-600)', marginBottom: 12 }}>
                <CheckCircleIcon size={24} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--emerald-700)' }}>Application Submitted!</h3>
              </div>

              {result.is_duplicate && (
                <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                  <AlertTriangleIcon size={16} />
                  <span>Existing application updated for this email/phone.</span>
                </div>
              )}

              <p className="hint" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
                Thanks, <strong>{result.full_name}</strong>! Your resume has been parsed and scored against the job requirements.
              </p>

              {result.ats_score != null && (
                <>
                  <div className="ats-score-box">
                    <div className="ats-score-gauge">{result.ats_score.toFixed(0)}%</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>ATS Match Score</div>
                      <div className="hint">Computed based on required skills &amp; experience</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    {result.ats_score >= 80 ? (
                      <div className="alert alert-success" style={{ padding: '10px 14px', fontSize: '0.8125rem', marginBottom: 0 }}>
                        <CheckCircleIcon size={16} />
                        <div>
                          <strong>High Match (≥ 80%):</strong> Auto-routed to <strong>Shortlisted</strong> section for priority team review!
                        </div>
                      </div>
                    ) : result.ats_score >= 60 ? (
                      <div className="alert alert-ai" style={{ padding: '10px 14px', fontSize: '0.8125rem', marginBottom: 0 }}>
                        <SparklesIcon size={16} />
                        <div>
                          <strong>Qualified Match (60–79%):</strong> Auto-routed to <strong>Screened</strong> section for recruiter review.
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-error" style={{ padding: '10px 14px', fontSize: '0.8125rem', marginBottom: 0 }}>
                        <AlertTriangleIcon size={16} />
                        <div>
                          <strong>Below Threshold (&lt; 60%):</strong> Does not meet the minimum skill criteria for this opening. Auto-routed to <strong>Rejected</strong>.
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}


              {result.extracted_skills && result.extracted_skills.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="hint" style={{ fontWeight: 600, marginBottom: 8 }}>Skills Detected from Your Resume:</div>
                  <div className="job-card-skills">
                    {result.extracted_skills.map((s) => (
                      <span key={s} className="badge badge-gray">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <Link to="/track-application" className="btn btn-primary btn-block">
                  <span>Track Application Status</span>
                  <ArrowRightIcon size={15} />
                </Link>
              </div>
            </div>
          ) : job.status !== 'published' ? (
            <div className="alert alert-warning">
              <AlertTriangleIcon size={16} />
              <span>This position is currently not accepting new applications.</span>
            </div>
          ) : isExpired ? (
            <div className="alert alert-warning" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>
                <AlertTriangleIcon size={18} />
                <span>Job Posting Expired</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-700)' }}>
                The application deadline for this role was <strong>{new Date(job.expires_at).toLocaleDateString()}</strong>. This opening is no longer accepting new submissions.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link to="/jobs" className="btn btn-secondary btn-block">
                  Browse Active Positions
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h3>Apply for this Position</h3>
              <p className="hint" style={{ marginBottom: 20 }}>
                Instant AI resume screening — no lengthy sign-up required.
              </p>

              {applyError && <div className="alert alert-error">{applyError}</div>}

              <form onSubmit={handleApply}>
                <div className="field">
                  <label htmlFor="full_name">Full Name *</label>
                  <input
                    id="full_name"
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="field">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="field">
                  <label htmlFor="location">Current Location / City</label>
                  <input
                    id="location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Bengaluru, Mumbai, Remote"
                  />
                </div>

                <div className="field">
                  <label htmlFor="source">How did you discover this role?</label>
                  <select
                    id="source"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  >
                    <option value="Direct">Company Careers Portal</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Naukri">Naukri.com</option>
                    <option value="Referral">Employee Referral</option>
                    <option value="Other">Other Channel</option>
                  </select>
                </div>

                <div
                  className={`file-drop ${file ? 'has-file' : ''}`}
                  onClick={() => fileInput.current?.click()}
                >
                  <UploadCloudIcon size={24} />
                  {file ? (
                    <div>
                      <div style={{ fontWeight: 700 }}>{file.name}</div>
                      <div className="hint" style={{ fontSize: '0.75rem' }}>{(file.size / 1024).toFixed(1)} KB · Ready to upload</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600 }}>Click or Drag Resume Here</div>
                      <div className="hint">Supports PDF, DOCX, or TXT (Max 5MB)</div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      <span>Parsing &amp; Scoring with AI…</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={16} />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}