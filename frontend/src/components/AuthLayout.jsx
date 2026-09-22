import React from 'react'
import { SparklesIcon, ShieldCheckIcon, AwardIcon } from './Icons'

const STAGES = [
  'Applied & Ingested',
  'Screened & Ranked by AI',
  'Recruiter Shortlisted',
  'Interview Scheduled',
  'Offer Released & Joined'
]

export default function AuthLayout({ eyebrow, title, blurb, activeStage = 1, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div>
          <div className="auth-visual-eyebrow">
            <SparklesIcon size={14} />
            <span>{eyebrow}</span>
          </div>
          <h2>{title}</h2>
          <p>{blurb}</p>

          <div className="pipeline-track">
            {STAGES.map((stage, i) => (
              <div key={stage} className={`pipeline-step ${i === activeStage ? 'is-active' : ''}`}>
                <span className="pipeline-dot">{i + 1}</span>
                <span className="pipeline-label">{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-visual-foot">
          <ShieldCheckIcon size={16} />
          <span>Enterprise-grade JWT Authentication &amp; Encrypted Storage</span>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-box">{children}</div>
      </div>
    </div>
  )
}
