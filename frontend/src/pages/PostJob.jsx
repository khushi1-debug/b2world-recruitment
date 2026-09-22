import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { SparklesIcon, BriefcaseIcon, PlusIcon, CopyIcon, CalendarIcon } from '../components/Icons'

const INITIAL_FORM = {
  title: '',
  description: '',
  skills: '',
  experience_min: 0,
  salary_min: '',
  salary_max: '',
  status: 'published',
  expires_at: '',
}

export default function PostJob() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatingDesc, setGeneratingDesc] = useState(false)
  const [duplicatedFrom, setDuplicatedFrom] = useState('')

  // Handle duplicating from location state or query parameter
  useEffect(() => {
    const stateJob = location.state?.duplicateJob
    if (stateJob) {
      applyJobData(stateJob)
      setDuplicatedFrom(stateJob.title)
      return
    }

    const duplicateId = searchParams.get('duplicate_from')
    if (duplicateId) {
      client.get(`/api/jobs/${duplicateId}`)
        .then((res) => {
          applyJobData(res.data)
          setDuplicatedFrom(res.data.title)
        })
        .catch(() => {
          setError('Could not fetch the source job to duplicate.')
        })
    }
  }, [location.state, searchParams])

  const applyJobData = (job) => {
    setForm({
      title: job.title ? `${job.title} (Copy)` : '',
      description: job.description || '',
      skills: Array.isArray(job.skills_required) ? job.skills_required.join(', ') : (job.skills_required || ''),
      experience_min: job.experience_min ?? 0,
      salary_min: job.salary_min != null ? job.salary_min : '',
      salary_max: job.salary_max != null ? job.salary_max : '',
      status: job.status || 'published',
      expires_at: job.expires_at ? job.expires_at.slice(0, 10) : '',
    })
  }

  const handleReset = () => {
    setForm(INITIAL_FORM)
    setDuplicatedFrom('')
  }

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleGenerateDescription = async () => {
    if (!form.title.trim()) {
      setError('Please enter a Job Title first so AI knows what role to draft.')
      return
    }
    setError('')
    setGeneratingDesc(true)
    try {
      const skills_required = form.skills.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await client.post('/api/jobs/generate-description', {
        title: form.title,
        skills_required,
        experience_min: Number(form.experience_min) || 0,
      })
      setForm({ ...form, description: res.data.description })
    } catch {
      setError('Could not generate a draft description at the moment — please enter manually.')
    } finally {
      setGeneratingDesc(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/api/jobs', {
        title: form.title,
        description: form.description,
        skills_required: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        experience_min: Number(form.experience_min) || 0,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        status: form.status,
        expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59Z`).toISOString() : null,
      })
      navigate(`/jobs/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create the job posting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="page container" style={{ maxWidth: 740 }}>
      <div className="page-head">
        <div>
          <h1>{duplicatedFrom ? 'Duplicate Job Posting' : 'Create New Position'}</h1>
          <p>
            {duplicatedFrom
              ? 'Review and customize the duplicated job details before publishing.'
              : 'Publish an open role to start receiving and screening AI-ranked applications.'}
          </p>
        </div>
      </div>

      {duplicatedFrom && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CopyIcon size={16} />
            <span>
              Pre-filled with data from <strong>{duplicatedFrom}</strong>.
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset} style={{ padding: '4px 10px' }}>
            Start from scratch
          </button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 36 }}>
        <div className="field">
          <label htmlFor="title">Job Title *</label>
          <input
            id="title"
            required
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Senior Frontend Engineer, DevOps Specialist"
          />
        </div>

        <div className="field">
          <label htmlFor="skills">Required Tech Skills (comma separated)</label>
          <input
            id="skills"
            value={form.skills}
            onChange={update('skills')}
            placeholder="e.g. React, TypeScript, GraphQL, Tailwind CSS"
          />
        </div>

        <div className="field">
          <label htmlFor="description" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Job Description &amp; Responsibilities *</span>
            <button
              type="button"
              className="link-btn"
              onClick={handleGenerateDescription}
              disabled={generatingDesc}
            >
              <SparklesIcon size={14} />
              <span>{generatingDesc ? 'Generating with AI…' : 'Draft with AI'}</span>
            </button>
          </label>
          <textarea
            id="description"
            required
            rows={7}
            value={form.description}
            onChange={update('description')}
            placeholder="Outline role expectations, day-to-day impact, and team requirements..."
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="experience_min">Min Experience (Years)</label>
            <input
              id="experience_min"
              type="number"
              min="0"
              value={form.experience_min}
              onChange={update('experience_min')}
            />
          </div>

          <div className="field">
            <label htmlFor="status">Publishing Status</label>
            <select id="status" value={form.status} onChange={update('status')}>
              <option value="published">Published (Visible to Candidates)</option>
              <option value="draft">Draft (Save Internally)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="salary_min">Salary Min (₹ / year)</label>
            <input
              id="salary_min"
              type="number"
              min="0"
              value={form.salary_min}
              onChange={update('salary_min')}
              placeholder="e.g. 800000"
            />
          </div>

          <div className="field">
            <label htmlFor="salary_max">Salary Max (₹ / year)</label>
            <input
              id="salary_max"
              type="number"
              min="0"
              value={form.salary_max}
              onChange={update('salary_max')}
              placeholder="e.g. 1500000"
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor="expires_at" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={14} />
            <span>Posting Expiry Date (Optional)</span>
          </label>
          <input
            id="expires_at"
            type="date"
            min={todayStr}
            value={form.expires_at}
            onChange={update('expires_at')}
          />
          <span className="hint" style={{ marginTop: 4, display: 'block', fontSize: '0.8rem' }}>
            Job posting will automatically be hidden from public candidate browsing after this date.
          </span>
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : (
              <>
                <PlusIcon size={16} />
                <span>{duplicatedFrom ? 'Publish Duplicated Job' : 'Publish Job Opening'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}