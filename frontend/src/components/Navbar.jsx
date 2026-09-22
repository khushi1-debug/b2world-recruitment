import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SparklesIcon, LayoutDashboardIcon, BriefcaseIcon, UsersIcon, PlusIcon, MenuIcon, XIcon } from './Icons'

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  recruiter: 'Recruiter',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  developer: 'Developer',
  candidate: 'Candidate',
}

const HIRING_ROLES = ['super_admin', 'hr_manager', 'recruiter']

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="nav-brand" onClick={() => setMobileOpen(false)}>
          <span className="nav-brand-mark">B2</span>
          <span className="nav-brand-text">World</span>
          <span className="nav-brand-ai">AI Platform</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="nav-links">
          <Link to="/jobs" className={`nav-link ${isActive('/jobs') && !location.pathname.includes('/new') ? 'active' : ''}`}>
            <BriefcaseIcon size={15} />
            <span>Jobs</span>
          </Link>

          <Link to="/track-application" className={`nav-link ${isActive('/track-application') ? 'active' : ''}`}>
            <SparklesIcon size={15} />
            <span>Track Application</span>
          </Link>

          {user && HIRING_ROLES.includes(user.role) && (
            <>
              <Link to="/jobs/new" className={`nav-link ${isActive('/jobs/new') ? 'active' : ''}`}>
                <PlusIcon size={15} />
                <span>Post Job</span>
              </Link>

              <Link to="/candidates" className={`nav-link ${isActive('/candidates') ? 'active' : ''}`}>
                <UsersIcon size={15} />
                <span>All Candidates</span>
              </Link>
            </>
          )}

          {user && (
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              <LayoutDashboardIcon size={15} />
              <span>Dashboard</span>
            </Link>
          )}
        </nav>

        {/* Desktop Nav Actions */}
        <div className="nav-actions">
          {user ? (
            <>
              <div className="nav-user-badge">
                <div className="nav-avatar">{getInitials(user.name)}</div>
                <span className="nav-role-tag">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
              <button className="btn btn-ghost-dark btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost-dark btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <SparklesIcon size={14} />
                <span>Get started</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          <div className="container nav-mobile-content">
            <nav className="nav-mobile-links">
              <Link
                to="/jobs"
                className={`nav-mobile-link ${isActive('/jobs') && !location.pathname.includes('/new') ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <BriefcaseIcon size={18} />
                <span>Explore Jobs</span>
              </Link>

              <Link
                to="/track-application"
                className={`nav-mobile-link ${isActive('/track-application') ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <SparklesIcon size={18} />
                <span>Track Application</span>
              </Link>

              {user && HIRING_ROLES.includes(user.role) && (
                <>
                  <Link
                    to="/jobs/new"
                    className={`nav-mobile-link ${isActive('/jobs/new') ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <PlusIcon size={18} />
                    <span>Post New Job</span>
                  </Link>

                  <Link
                    to="/candidates"
                    className={`nav-mobile-link ${isActive('/candidates') ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <UsersIcon size={18} />
                    <span>All Candidates</span>
                  </Link>
                </>
              )}

              {user && (
                <Link
                  to="/dashboard"
                  className={`nav-mobile-link ${isActive('/dashboard') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboardIcon size={18} />
                  <span>Executive Dashboard</span>
                </Link>
              )}
            </nav>

            <div className="nav-mobile-actions">
              {user ? (
                <div className="nav-mobile-user-card">
                  <div className="nav-mobile-user-info">
                    <div className="nav-avatar">{getInitials(user.name)}</div>
                    <div>
                      <div className="nav-mobile-user-name">{user.name}</div>
                      <div className="nav-role-tag">{ROLE_LABELS[user.role] || user.role}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost-dark btn-block btn-sm" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              ) : (
                <div className="nav-mobile-auth-grid">
                  <Link to="/login" className="btn btn-ghost-dark btn-block" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-block" onClick={() => setMobileOpen(false)}>
                    <SparklesIcon size={15} />
                    <span>Get started</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

