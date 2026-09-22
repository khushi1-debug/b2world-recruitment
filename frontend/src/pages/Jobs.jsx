import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import {
  BriefcaseIcon,
  SearchIcon,
  ClockIcon,
  DollarSignIcon,
  ArrowRightIcon,
  SparklesIcon,
  EyeIcon,
  CalendarIcon
} from '../components/Icons'

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    client.get('/api/jobs')
      .then((res) => {
        setJobs(res.data)
        setFilteredJobs(res.data)
      })
      .catch(() => setError('Could not load jobs. Is the backend service active?'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFilteredJobs(jobs)
    } else {
      const q = search.toLowerCase()
      setFilteredJobs(
        jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q) ||
            (j.skills_required && j.skills_required.some((s) => s.toLowerCase().includes(q)))
        )
      )
    }
  }, [search, jobs])

  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <h1>Open Career Opportunities</h1>
          <p>Explore high-impact positions. Applications are screened and ranked instantly with AI.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="jobs-filter-bar">
        <div className="jobs-search-input">
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Search by job title, keyword, or tech stack (e.g. React, Python)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="badge badge-brand">
          <span>{filteredJobs.length} Positions Available</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 14 }}>Loading open positions…</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <SearchIcon size={26} />
          </div>
          <h3>No matching roles found</h3>
          <p>Try searching for different keywords, or check back soon for newly published openings.</p>
        </div>
      ) : (
        <div className="job-grid">
          {filteredJobs.map((job) => (
            <div key={job.id} className="job-card card card-hover">
              <div className="job-card-main">
                <div className="job-card-header">
                  <h3>{job.title}</h3>
                  <span className="badge badge-emerald">Active Hiring</span>
                </div>

                <div className="job-card-meta">
                  <span>
                    <ClockIcon size={14} />
                    {job.experience_min}+ years experience
                  </span>
                  {job.salary_min && job.salary_max && (
                    <span>
                      <DollarSignIcon size={14} />
                      ₹{(job.salary_min / 100000).toFixed(0)}L – ₹{(job.salary_max / 100000).toFixed(0)}L / yr
                    </span>
                  )}
                  {job.expires_at && (
                    <span>
                      <CalendarIcon size={14} />
                      Closes {new Date(job.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span>
                    <EyeIcon size={14} />
                    {job.views_count || 0} views
                  </span>
                </div>

                <p className="job-card-desc">
                  {job.description.slice(0, 190)}{job.description.length > 190 ? '…' : ''}
                </p>

                <div className="job-card-skills">
                  {job.skills_required && job.skills_required.slice(0, 5).map((s) => (
                    <span key={s} className="badge badge-indigo">{s}</span>
                  ))}
                  {job.skills_required && job.skills_required.length > 5 && (
                    <span className="badge badge-gray">+{job.skills_required.length - 5} more</span>
                  )}
                </div>
              </div>

              <div className="job-card-action">
                <Link to={`/jobs/${job.id}`} className="btn btn-primary">
                  <span>View &amp; Apply</span>
                  <ArrowRightIcon size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

