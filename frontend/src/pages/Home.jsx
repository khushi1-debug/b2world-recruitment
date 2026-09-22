import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  SparklesIcon,
  BrainIcon,
  BriefcaseIcon,
  UsersIcon,
  LayoutDashboardIcon,
  ScaleIcon,
  AwardIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from '../components/Icons'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="container home-hero-grid">
          <div>
            <div className="home-eyebrow">
              <SparklesIcon size={14} />
              <span>Next-Gen Workforce &amp; AI Recruitment</span>
            </div>
            <h1>
              Hire Top Talent. <br />
              <span className="text-gradient">Automate with AI Precision.</span>
            </h1>
            <p className="home-sub">
              B2World reads resumes, extracts structured skill graphs, computes instant ATS compatibility scores, and keeps your entire hiring pipeline moving without manual overhead.
            </p>
            <div className="home-cta-row">
              {user ? (
                <Link to="/dashboard" className="btn btn-primary">
                  <span>Go to Dashboard</span>
                  <ArrowRightIcon size={16} />
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary">
                  <SparklesIcon size={16} />
                  <span>Start Free Trial</span>
                </Link>
              )}
              <Link to="/jobs" className="btn btn-ghost-dark">
                <BriefcaseIcon size={16} />
                <span>Explore Open Roles</span>
              </Link>
            </div>
          </div>

          {/* Interactive Live Hero Widget */}
          <div className="hero-preview-card">
            <div className="preview-candidate-header">
              <div className="preview-candidate-info">
                <div className="preview-avatar">AR</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ananya Rao</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Senior Full Stack Engineer · 5y exp</div>
                </div>
              </div>
              <div className="preview-score-badge">
                <div className="preview-score-num">94%</div>
                <div className="preview-score-label">ATS Match</div>
              </div>
            </div>

            <div className="preview-ai-insight">
              <span style={{ fontWeight: 600, color: '#a5b4fc' }}>🤖 AI Summary:</span> Strong background in React, Python/FastAPI, and PostgreSQL. Demonstrates solid microservices architecture experience with zero critical skill gaps.
            </div>

            <div className="preview-tags-row">
              <span className="badge badge-indigo">React</span>
              <span className="badge badge-indigo">FastAPI</span>
              <span className="badge badge-indigo">SQLAlchemy</span>
              <span className="badge badge-indigo">Docker</span>
              <span className="badge badge-emerald">✓ Highly Recommended</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats Banner */}
      <section className="home-stats-banner">
        <div className="container home-stats-grid">
          <div className="home-stat-item">
            <div className="home-stat-number">&lt; 3.2s</div>
            <div className="home-stat-desc">Instant resume parsing &amp; ATS evaluation</div>
          </div>
          <div className="home-stat-item">
            <div className="home-stat-number">98.4%</div>
            <div className="home-stat-desc">Skill extraction accuracy with AI models</div>
          </div>
          <div className="home-stat-item">
            <div className="home-stat-number">10 Stages</div>
            <div className="home-stat-desc">End-to-end recruitment lifecycle workflow</div>
          </div>
          <div className="home-stat-item">
            <div className="home-stat-number">7 Roles</div>
            <div className="home-stat-desc">Fine-grained RBAC &amp; permission dashboards</div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="home-section">
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Enterprise Capabilities</div>
            <h2>Everything your hiring team needs to scale</h2>
            <p>From initial job creation to offer acceptance, B2World equips recruiters and hiring managers with intelligent workflows.</p>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <BrainIcon size={24} />
              </div>
              <h3>AI Resume Screening</h3>
              <p>Automated deep extraction of experience, hard skills, certifications, and contextual candidate summaries with instant ATS scores.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <LayoutDashboardIcon size={24} />
              </div>
              <h3>Interactive Kanban Pipeline</h3>
              <p>Visual pipeline management across 10 distinct stages with inline interview scheduling, stage transitions, and recruiter notes.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <ScaleIcon size={24} />
              </div>
              <h3>Bias Detection &amp; Rewriting</h3>
              <p>Audit job descriptions for exclusionary language or gender bias and receive instant AI-powered inclusive rewrites.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <AwardIcon size={24} />
              </div>
              <h3>Skill Assessment Generator</h3>
              <p>Automatically generate customized multiple-choice tests and technical interview question banks tailored to each job description.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <TrendingUpIcon size={24} />
              </div>
              <h3>Candidate Comparison &amp; Fit</h3>
              <p>Compare candidates side-by-side to evaluate strengths, weaknesses, and predicted job success probabilities before making decisions.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <ShieldCheckIcon size={24} />
              </div>
              <h3>Role-Based Access Control</h3>
              <p>Secure role gating for Super Admins, HR Managers, Recruiters, Team Leads, and Project Managers with JWT session management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Timeline */}
      <section className="home-section" style={{ background: 'var(--bg-card-subtle)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="section-head">
            <div className="section-eyebrow">Streamlined Workflow</div>
            <h2>How B2World Accelerates Recruitment</h2>
          </div>

          <div className="workflow-grid">
            <div className="workflow-card">
              <div className="workflow-step-num">1</div>
              <h4>Post or Draft Role</h4>
              <p>Create job descriptions or use AI to draft requirements in seconds with custom compensation bands.</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">2</div>
              <h4>Screen &amp; Parse Resumes</h4>
              <p>Candidates apply directly or recruiters bulk-upload PDFs. Resumes are parsed and scored automatically.</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">3</div>
              <h4>Interview &amp; Assess</h4>
              <p>Schedule interviews, generate tailored technical questions, and track stages on the interactive Kanban board.</p>
            </div>

            <div className="workflow-card">
              <div className="workflow-step-num">4</div>
              <h4>Offer &amp; Onboard</h4>
              <p>Calculate recommended salary packages, release offers, and monitor hiring funnel conversion rates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="nav-brand-mark">B2</span>
            <span>World AI Recruitment</span>
          </div>
          <div className="footer-meta">
            © {new Date().getFullYear()} B2World Platform · Enterprise Recruitment &amp; Workforce Management MVP
          </div>
        </div>
      </footer>
    </div>
  )
}
