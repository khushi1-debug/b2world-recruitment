import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import {
  UsersIcon,
  SearchIcon,
  DownloadIcon,
  ArrowRightIcon,
  ClockIcon,
  BriefcaseIcon,
  MessageSquareIcon,
  TagIcon,
  Trash2Icon,
  XIcon,
  MailIcon,
  SendIcon,
  CheckCircleIcon,
  CopyIcon
} from '../components/Icons'

const STAGE_LABELS = {
  applied: 'Applied',
  under_review: 'Under Review',
  screened: 'Screened',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  technical_round: 'Technical Round',
  hr_round: 'HR Round',
  selected: 'Selected',
  rejected: 'Rejected',
  joined: 'Joined',
  withdrawn: 'Withdrawn',
}

const STAGE_BADGE = {
  selected: 'badge-emerald',
  joined: 'badge-emerald',
  rejected: 'badge-rose',
  applied: 'badge-gray',
  shortlisted: 'badge-brand',
  interview_scheduled: 'badge-sky',
  technical_round: 'badge-purple',
  hr_round: 'badge-purple',
  under_review: 'badge-amber',
  screened: 'badge-indigo',
  withdrawn: 'badge-gray',
}

function getTagColorClass(tag) {
  const normalized = (tag || '').toLowerCase().trim()
  if (normalized.includes('referral')) return 'cand-tag-emerald'
  if (normalized.includes('follow')) return 'cand-tag-amber'
  if (normalized.includes('culture') || normalized.includes('fit')) return 'cand-tag-indigo'
  if (normalized.includes('urgent') || normalized.includes('hot')) return 'cand-tag-rose'
  if (normalized.includes('top') || normalized.includes('talent') || normalized.includes('lead')) return 'cand-tag-purple'
  if (normalized.includes('review') || normalized.includes('screen')) return 'cand-tag-cyan'
  if (normalized.includes('offer') || normalized.includes('remote')) return 'cand-tag-sky'

  const colors = ['cand-tag-emerald', 'cand-tag-amber', 'cand-tag-indigo', 'cand-tag-purple', 'cand-tag-cyan', 'cand-tag-sky', 'cand-tag-rose']
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function isStale(dateString, stage) {
  const FINAL_STAGES = ['selected', 'rejected', 'joined']
  if (FINAL_STAGES.includes(stage)) return false
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
  return days >= 7
}

const PRESET_TAGS = [
  'Referral',
  'Follow up',
  'Strong culture fit',
  'Top Talent',
  'Urgent',
  'Needs Review',
  'Offer Candidate',
  'Remote'
]

export default function AllCandidates() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [minScore, setMinScore] = useState('')
  const [stage, setStage] = useState('')
  const [tag, setTag] = useState('')

  // Tag Management state
  const [openTagPopover, setOpenTagPopover] = useState(null)
  const [customTagInput, setCustomTagInput] = useState({})

  // Notes Modal state
  const [notesModalCandidate, setNotesModalCandidate] = useState(null)
  const [candidateNotes, setCandidateNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)

  // Email History Log Modal state
  const [emailModalCandidate, setEmailModalCandidate] = useState(null)
  const [candidateEmails, setCandidateEmails] = useState([])
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [emailModalTab, setEmailModalTab] = useState('history') // 'history' | 'compose'
  const [newEmailSubject, setNewEmailSubject] = useState('')
  const [newEmailBody, setNewEmailBody] = useState('')
  const [newEmailType, setNewEmailType] = useState('custom')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSearchFilter, setEmailSearchFilter] = useState('')
  const [emailTypeFilter, setEmailTypeFilter] = useState('all')
  const [expandedEmailIds, setExpandedEmailIds] = useState(new Set())
  const [emailCopiedId, setEmailCopiedId] = useState(null)
  const [emailSuccessMessage, setEmailSuccessMessage] = useState('')

  const load = () => {
    const params = {}
    if (search.trim()) params.search = search.trim()
    if (minScore !== '') params.min_score = minScore
    if (stage) params.stage = stage
    if (tag) params.tag = tag

    client
      .get('/api/candidates', { params })
      .then((res) => setCandidates(res.data))
      .catch(() => setError('Could not load candidate registry. You may lack permissions.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search, minScore, stage, tag])

  // Notes Handlers
  const handleOpenNotes = async (candidate) => {
    setNotesModalCandidate(candidate)
    setNewNoteText('')
    setLoadingNotes(true)
    try {
      const res = await client.get(`/api/candidates/${candidate.id}/notes`)
      setCandidateNotes(res.data)
    } catch {
      setCandidateNotes([])
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleAddNote = async (e) => {
    if (e) e.preventDefault()
    if (!newNoteText.trim() || !notesModalCandidate) return
    setSubmittingNote(true)
    try {
      const res = await client.post(`/api/candidates/${notesModalCandidate.id}/notes`, {
        content: newNoteText.trim()
      })
      setCandidateNotes((prev) => [res.data, ...prev])
      setNewNoteText('')
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === notesModalCandidate.id ? { ...c, notes_count: (c.notes_count || 0) + 1 } : c
        )
      )
    } catch {
      alert('Could not save note. Please try again.')
    } finally {
      setSubmittingNote(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note from the candidate feedback log?')) return
    setDeletingNoteId(noteId)
    try {
      await client.delete(`/api/candidates/${notesModalCandidate.id}/notes/${noteId}`)
      setCandidateNotes((prev) => prev.filter((n) => n.id !== noteId))
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === notesModalCandidate.id ? { ...c, notes_count: Math.max(0, (c.notes_count || 1) - 1) } : c
        )
      )
    } catch {
      alert('Could not delete note. You may lack permission.')
    } finally {
      setDeletingNoteId(null)
    }
  }

  // Email History Log actions
  const handleOpenEmails = async (candidate) => {
    setEmailModalCandidate(candidate)
    setEmailModalTab('history')
    setNewEmailSubject(`Update regarding your application for ${candidate.job_title || 'the role'} at B2World`)
    setNewEmailBody(`Hi ${candidate.full_name},\n\n`)
    setNewEmailType('custom')
    setEmailSuccessMessage('')
    setEmailSearchFilter('')
    setEmailTypeFilter('all')
    setExpandedEmailIds(new Set())
    setLoadingEmails(true)
    try {
      const res = await client.get(`/api/candidates/${candidate.id}/emails`)
      setCandidateEmails(res.data)
      if (res.data.length > 0) {
        setExpandedEmailIds(new Set([res.data[0].id]))
      }
    } catch {
      setCandidateEmails([])
    } finally {
      setLoadingEmails(false)
    }
  }

  const toggleExpandEmail = (emailId) => {
    setExpandedEmailIds((prev) => {
      const next = new Set(prev)
      if (next.has(emailId)) next.delete(emailId)
      else next.add(emailId)
      return next
    })
  }

  const handleCopyEmail = (email) => {
    const text = `Subject: ${email.subject}\nDate: ${new Date(email.sent_at).toLocaleString()}\nTo: ${email.recipient_email}\n\n${email.body}`
    navigator.clipboard.writeText(text)
    setEmailCopiedId(email.id)
    setTimeout(() => setEmailCopiedId(null), 2000)
  }

  const applyEmailTemplate = (templateKey) => {
    if (!emailModalCandidate) return
    const candidateName = emailModalCandidate.full_name
    const roleTitle = emailModalCandidate.job_title || 'Open Position'

    if (templateKey === 'interview_invite') {
      setNewEmailType('interview_invitation')
      setNewEmailSubject(`Interview Invitation: ${roleTitle} at B2World`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `Great news — based on our team's initial evaluation, we would love to invite you to an interview for the ${roleTitle} position at B2World.\n\n` +
        `Meeting Format: Google Meet (Calendar invitation with video link to follow)\n\n` +
        `Please let us know your availability over the next few business days. We look forward to speaking with you!\n\n` +
        `Warm regards,\nB2World Hiring Team`
      )
    } else if (templateKey === 'status_update') {
      setNewEmailType('status_update')
      setNewEmailSubject(`Application Update: ${roleTitle} at B2World`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `We wanted to share a quick update regarding your application for the ${roleTitle} role. Your profile is currently under active review with our hiring committee.\n\n` +
        `We aim to finalize our next-round decisions shortly and will follow up with you promptly.\n\n` +
        `Thank you for your patience and interest in B2World!\n\n` +
        `Best regards,\nB2World Recruitment`
      )
    } else if (templateKey === 'request_info') {
      setNewEmailType('custom')
      setNewEmailSubject(`Action Required: Additional Details for ${roleTitle}`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `Thank you for applying for the ${roleTitle} position. To help our evaluation team, could you please reply with:\n\n` +
        `1. Links to any relevant GitHub repositories, technical blogs, or portfolio projects\n` +
        `2. Your current notice period or earliest available start date\n` +
        `3. Your preferred location / remote work preferences\n\n` +
        `We appreciate your time and look forward to your response.\n\n` +
        `Best,\nB2World Talent Acquisition`
      )
    } else if (templateKey === 'offer_discussion') {
      setNewEmailType('offer_letter')
      setNewEmailSubject(`Offer of Employment & Next Steps — ${roleTitle} at B2World`)
      setNewEmailBody(
        `Dear ${candidateName},\n\n` +
        `On behalf of B2World, we are thrilled to extend an offer of employment for the ${roleTitle} role!\n\n` +
        `The entire interview panel was deeply impressed by your background and problem-solving ability. We would love to schedule a brief call this week to review the compensation package and start date details.\n\n` +
        `Congratulations!\n\n` +
        `Warm regards,\nB2World Leadership Team`
      )
    } else if (templateKey === 'custom') {
      setNewEmailType('custom')
      setNewEmailSubject(`Regarding your application for ${roleTitle} at B2World`)
      setNewEmailBody(`Hi ${candidateName},\n\n`)
    }
  }

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault()
    if (!newEmailSubject.trim() || !newEmailBody.trim() || !emailModalCandidate) return
    setSendingEmail(true)
    setEmailSuccessMessage('')
    try {
      const res = await client.post(`/api/candidates/${emailModalCandidate.id}/emails`, {
        subject: newEmailSubject.trim(),
        body: newEmailBody.trim(),
        email_type: newEmailType || 'custom',
      })
      setCandidateEmails((prev) => [res.data, ...prev])
      setExpandedEmailIds((prev) => new Set([res.data.id, ...prev]))
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === emailModalCandidate.id ? { ...c, emails_count: (c.emails_count || 0) + 1 } : c
        )
      )
      setEmailSuccessMessage('Email successfully dispatched & logged to candidate record!')
      setEmailModalTab('history')
      setNewEmailSubject(`Regarding your application for ${emailModalCandidate.job_title || 'the role'} at B2World`)
      setNewEmailBody(`Hi ${emailModalCandidate.full_name},\n\n`)
      setNewEmailType('custom')
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send email. Please try again.')
    } finally {
      setSendingEmail(false)
    }
  }

  // Tags actions
  const handleAddTag = async (candidateId, tag) => {
    if (!tag || !tag.trim()) return
    const cleanTag = tag.trim()
    try {
      const res = await client.post(`/api/candidates/${candidateId}/tags`, { tag: cleanTag })
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? res.data : c)))
      setCustomTagInput({ ...customTagInput, [candidateId]: '' })
      setOpenTagPopover(null)
    } catch {
      alert('Could not add tag.')
    }
  }

  const handleRemoveTag = async (candidateId, tag) => {
    try {
      const res = await client.delete(`/api/candidates/${candidateId}/tags/${encodeURIComponent(tag)}`)
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? res.data : c)))
    } catch {
      alert('Could not remove tag.')
    }
  }

  const handleExportCSV = () => {
    if (candidates.length === 0) return
    const headers = ['Name', 'Email', 'Phone', 'Job Title', 'ATS Score', 'Stage', 'Tags', 'Notes Count', 'Experience Years', 'Source', 'Location', 'Applied Date']
    const rows = candidates.map((c) => [
      c.full_name,
      c.email,
      c.phone || '',
      c.job_title || '',
      c.ats_score != null ? Math.round(c.ats_score) : '',
      STAGE_LABELS[c.stage] || c.stage,
      (c.tags || []).join('; '),
      c.notes_count || 0,
      c.experience_years ?? '',
      c.source || '',
      c.location || '',
      new Date(c.applied_at).toLocaleDateString(),
    ])
    const escapeCell = (val) => `"${String(val).replace(/"/g, '""')}"`
    const csvContent = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `b2world-candidates-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getInitials = (name) => {
    if (!name) return 'C'
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  // Extract all tags across loaded candidates for filter dropdown
  const allCandidateTags = Array.from(new Set(candidates.flatMap((c) => c.tags || []))).sort()

  return (
    <div className="page container">
      <div className="page-head">
        <div>
          <h1>Global Candidate Registry</h1>
          <p>Search, filter, and inspect applicant profiles across all posted roles.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={handleExportCSV} disabled={candidates.length === 0}>
            <DownloadIcon size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="kanban-filters" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="jobs-search-input" style={{ flex: 1, minWidth: 240 }}>
          <SearchIcon size={16} />
          <input
            type="text"
            placeholder="Filter by name, email, or keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <input
          type="number"
          min="0"
          max="100"
          placeholder="Min ATS %"
          style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)' }}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
        />

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-surface)', color: 'var(--ink-white)' }}
        >
          <option value="">All Pipeline Stages</option>
          {Object.entries(STAGE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-surface)', color: 'var(--ink-white)' }}
        >
          <option value="">All Candidate Tags</option>
          {allCandidateTags.map((t) => (
            <option key={t} value={t}>🏷️ {t}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 14 }}>Loading candidate records…</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <UsersIcon size={26} />
          </div>
          <h3>No candidate records match your filters</h3>
          <p>Try resetting the search terms, tag, or minimum ATS score filter.</p>
        </div>
      ) : (
        <div className="card dash-table-card">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Applied Position</th>
                <th>ATS Match</th>
                <th>Current Stage</th>
                <th>Applied Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const score = c.ats_score != null ? Math.round(c.ats_score) : null
                const isStaleCand = isStale(c.applied_at, c.stage)

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="candidate-avatar">{getInitials(c.full_name)}</div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{c.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-500)' }}>
                            {c.email} {c.location ? `· ${c.location}` : ''}
                          </div>
                          {/* Candidate Custom Tags / Labels & Notes Row */}
                          <div className="cand-tags-row" style={{ marginTop: 4 }}>
                            {(c.tags || []).map((t, idx) => (
                              <span key={idx} className={`cand-tag-chip ${getTagColorClass(t)}`}>
                                <TagIcon size={10} />
                                <span>{t}</span>
                                <button
                                  type="button"
                                  className="cand-tag-delete-btn"
                                  title={`Remove ${t}`}
                                  onClick={() => handleRemoveTag(c.id, t)}
                                >
                                  <XIcon size={10} />
                                </button>
                              </span>
                            ))}

                            <div className="tag-popover-wrapper">
                              <button
                                type="button"
                                className="add-tag-trigger"
                                onClick={() => setOpenTagPopover(openTagPopover === c.id ? null : c.id)}
                                title="Add label"
                              >
                                <TagIcon size={10} />
                                <span>+ Tag</span>
                              </button>

                              {openTagPopover === c.id && (
                                <>
                                  <div className="popover-backdrop" onClick={() => setOpenTagPopover(null)} />
                                  <div className="tag-popover">
                                    <div className="tag-popover-title">Suggested Labels</div>
                                    <div className="quick-tags-list">
                                      {PRESET_TAGS.filter((p) => !(c.tags || []).includes(p)).map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          className="quick-tag-btn"
                                          onClick={() => handleAddTag(c.id, preset)}
                                        >
                                          + {preset}
                                        </button>
                                      ))}
                                    </div>

                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault()
                                        handleAddTag(c.id, customTagInput[c.id])
                                      }}
                                      className="custom-tag-form"
                                    >
                                      <input
                                        type="text"
                                        className="custom-tag-input"
                                        placeholder="Custom tag…"
                                        value={customTagInput[c.id] || ''}
                                        onChange={(e) => setCustomTagInput({ ...customTagInput, [c.id]: e.target.value })}
                                        autoFocus
                                      />
                                      <button type="submit" className="btn btn-primary btn-xs">
                                        Add
                                      </button>
                                    </form>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <Link
                        to={`/jobs/${c.job_id}`}
                        style={{ fontWeight: 600, color: 'var(--brand-600)' }}
                      >
                        {c.job_title || 'Unassigned Position'}
                      </Link>
                    </td>

                    <td>
                      {score !== null ? (
                        <span
                          className={`ats-pill ${
                            score >= 75
                              ? 'ats-pill-high'
                              : score >= 50
                              ? 'ats-pill-mid'
                              : 'ats-pill-low'
                          }`}
                        >
                          {score}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      <span className={`badge ${STAGE_BADGE[c.stage] || 'badge-gray'}`}>
                        {STAGE_LABELS[c.stage] || c.stage}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                        {isStaleCand && <span title="Waiting 7+ days">⚠️</span>}
                        <span>{new Date(c.applied_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className={`btn btn-xs ${(c.emails_count || 0) > 0 ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => handleOpenEmails(c)}
                          title="View candidate email communications history"
                        >
                          <MailIcon size={13} />
                          <span>{(c.emails_count || 0) > 0 ? `${c.emails_count} Email${c.emails_count === 1 ? '' : 's'}` : 'Emails'}</span>
                        </button>

                        <button
                          type="button"
                          className={`btn btn-xs ${(c.notes_count || 0) > 0 ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => handleOpenNotes(c)}
                          title="View recruiter feedback history"
                        >
                          <MessageSquareIcon size={13} />
                          <span>{(c.notes_count || 0) > 0 ? `${c.notes_count} Note${c.notes_count === 1 ? '' : 's'}` : 'Notes'}</span>
                        </button>

                        <Link
                          to={`/jobs/${c.job_id}/candidates`}
                          className="btn btn-ghost btn-sm"
                        >
                          <span>Pipeline</span>
                          <ArrowRightIcon size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes & Feedback History Modal */}
      {notesModalCandidate && (
        <div className="modal-overlay" onClick={() => setNotesModalCandidate(null)}>
          <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MessageSquareIcon size={18} />
                <div>
                  <h3 style={{ margin: 0 }}>Candidate Notes &amp; Feedback History</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)', marginTop: 2 }}>
                    {notesModalCandidate.full_name} · {notesModalCandidate.job_title || 'Applicant'}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setNotesModalCandidate(null)}>
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Running Notes Log */}
              {loadingNotes ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <span className="spinner spinner-dark" />
                  <p style={{ marginTop: 12 }}>Loading feedback history…</p>
                </div>
              ) : candidateNotes.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0', border: '1px dashed var(--line)', borderRadius: 8, marginBottom: 18 }}>
                  <MessageSquareIcon size={24} style={{ color: 'var(--ink-500)', marginBottom: 6 }} />
                  <p style={{ fontWeight: 600, color: 'var(--ink-300)', margin: 0 }}>No feedback notes yet</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--ink-500)', marginTop: 4 }}>
                    Start the running log below with your interview feedback or screening notes.
                  </p>
                </div>
              ) : (
                <div className="notes-timeline">
                  {candidateNotes.map((note) => (
                    <div key={note.id} className="note-entry-card">
                      <div className="note-entry-header">
                        <div className="note-author-info">
                          <div className="note-author-avatar">
                            {getInitials(note.author_name)}
                          </div>
                          <div>
                            <span className="note-author-name">{note.author_name}</span>
                            <span className="note-role-badge" style={{ marginLeft: 6 }}>
                              {note.author_role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="note-time-info">
                          <span>
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            type="button"
                            className="cand-tag-delete-btn"
                            title="Delete note"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                          >
                            <Trash2Icon size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="note-content-text">
                        {note.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Compose New Note */}
              <form onSubmit={handleAddNote} className="note-compose-container">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ink-200)', marginBottom: 6 }}>
                  Add Recruiter Note / Feedback Entry
                </label>
                <textarea
                  className="note-compose-textarea"
                  placeholder={`Write feedback for ${notesModalCandidate.full_name}...`}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      handleAddNote(e)
                    }
                  }}
                  rows={3}
                />
                <div className="note-compose-footer">
                  <span className="note-compose-hint">Press Ctrl+Enter to submit note</span>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!newNoteText.trim() || submittingNote}
                  >
                    {submittingNote ? 'Saving…' : 'Add Note'}
                  </button>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setNotesModalCandidate(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Email History Log Modal */}
      {emailModalCandidate && (
        <div className="modal-overlay" onClick={() => setEmailModalCandidate(null)}>
          <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(14, 165, 233, 0.15)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <MailIcon size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Candidate Email History &amp; Communications</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)', marginTop: 2 }}>
                    {emailModalCandidate.full_name} ({emailModalCandidate.email}) · {emailModalCandidate.job_title || 'Applicant'}
                  </div>
                </div>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setEmailModalCandidate(null)}>
                <XIcon size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="email-tabs-nav" style={{ padding: '0 24px' }}>
              <button
                type="button"
                className={`email-tab-btn ${emailModalTab === 'history' ? 'active' : ''}`}
                onClick={() => setEmailModalTab('history')}
              >
                <ClockIcon size={14} />
                <span>Sent History Log ({candidateEmails.length})</span>
              </button>
              <button
                type="button"
                className={`email-tab-btn ${emailModalTab === 'compose' ? 'active' : ''}`}
                onClick={() => setEmailModalTab('compose')}
              >
                <SendIcon size={14} />
                <span>Compose &amp; Send Email</span>
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {emailSuccessMessage && (
                <div className="alert alert-success" style={{ marginBottom: 14 }}>
                  <CheckCircleIcon size={16} />
                  <span>{emailSuccessMessage}</span>
                </div>
              )}

              {/* TAB 1: Sent Email History Log */}
              {emailModalTab === 'history' && (
                <div>
                  {/* Quick Filters / Search Bar */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div className="jobs-search-input" style={{ flex: 1, minWidth: 200, padding: '6px 12px' }}>
                      <SearchIcon size={14} />
                      <input
                        type="text"
                        placeholder="Search emails by subject or content…"
                        value={emailSearchFilter}
                        onChange={(e) => setEmailSearchFilter(e.target.value)}
                        style={{ fontSize: '0.8125rem' }}
                      />
                    </div>

                    <select
                      value={emailTypeFilter}
                      onChange={(e) => setEmailTypeFilter(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--line-strong)', background: 'var(--bg-surface)', color: 'var(--ink-white)', fontSize: '0.75rem' }}
                    >
                      <option value="all">All Email Types</option>
                      <option value="interview_invitation">Interview Invitations</option>
                      <option value="offer_letter">Offer Letters</option>
                      <option value="under_review">Under Review</option>
                      <option value="rejection">Rejections</option>
                      <option value="custom">Direct Recruiter Emails</option>
                    </select>

                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => setEmailModalTab('compose')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <SendIcon size={12} />
                      <span>New Email</span>
                    </button>
                  </div>

                  {loadingEmails ? (
                    <div className="empty-state" style={{ padding: '30px 0' }}>
                      <span className="spinner spinner-dark" />
                      <p style={{ marginTop: 12 }}>Loading email history log…</p>
                    </div>
                  ) : candidateEmails.length === 0 ? (
                    <div className="empty-state" style={{ padding: '28px 0', border: '1px dashed var(--line)', borderRadius: 8 }}>
                      <MailIcon size={26} style={{ color: 'var(--ink-500)', marginBottom: 8 }} />
                      <p style={{ fontWeight: 600, color: 'var(--ink-300)', margin: 0 }}>No emails recorded yet</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--ink-500)', marginTop: 4, maxWidth: 360, margin: '4px auto 14px' }}>
                        Automated emails sent on stage transitions or direct recruiter communications will appear in this timeline.
                      </p>
                      <button
                        type="button"
                        className="btn btn-gradient-ai btn-xs"
                        onClick={() => setEmailModalTab('compose')}
                      >
                        <SendIcon size={12} />
                        <span>Send First Email to {emailModalCandidate.full_name.split(' ')[0]}</span>
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const filtered = candidateEmails.filter((em) => {
                        if (emailTypeFilter !== 'all' && em.email_type !== emailTypeFilter) return false
                        if (emailSearchFilter.trim()) {
                          const q = emailSearchFilter.toLowerCase()
                          const match = (em.subject || '').toLowerCase().includes(q) || (em.body || '').toLowerCase().includes(q)
                          if (!match) return false
                        }
                        return true
                      })

                      if (filtered.length === 0) {
                        return (
                          <div className="empty-state" style={{ padding: '24px 0' }}>
                            <p style={{ color: 'var(--ink-400)', margin: 0 }}>No email records match your filter criteria.</p>
                          </div>
                        )
                      }

                      return (
                        <div className="email-log-timeline">
                          {filtered.map((email) => {
                            const isExpanded = expandedEmailIds.has(email.id)
                            const isCopied = emailCopiedId === email.id

                            return (
                              <div key={email.id} className="email-entry-card">
                                <div className="email-entry-top">
                                  <div className="email-sender-meta">
                                    <div className={`email-sender-avatar ${!email.sender_id ? 'system' : ''}`}>
                                      {email.sender_id ? getInitials(email.sender_name) : '🤖'}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="email-sender-name">{email.sender_name || 'System Automated'}</span>
                                        {email.sender_role && (
                                          <span className="note-role-badge">
                                            {email.sender_role.replace('_', ' ')}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.71875rem', color: 'var(--ink-500)', marginTop: 1 }}>
                                        To: {email.recipient_email}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className={`email-type-badge email-type-${email.email_type}`}>
                                      {email.email_type.replace('_', ' ')}
                                    </span>
                                    <span className="email-status-tag">
                                      <CheckCircleIcon size={10} />
                                      {email.status || 'Sent'}
                                    </span>
                                    <span style={{ fontSize: '0.71875rem', color: 'var(--ink-500)' }}>
                                      {new Date(email.sent_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                </div>

                                <div className="email-subject-heading">
                                  <MailIcon size={13} style={{ color: '#38bdf8' }} />
                                  <span>{email.subject}</span>
                                </div>

                                {/* Email Content Preview / Expanded View */}
                                {isExpanded ? (
                                  <div className="email-body-box" style={{ marginTop: 8 }}>
                                    {email.body}
                                  </div>
                                ) : (
                                  <div
                                    className="email-body-box"
                                    style={{
                                      marginTop: 8,
                                      maxHeight: 62,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      opacity: 0.85,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => toggleExpandEmail(email.id)}
                                  >
                                    {email.body.slice(0, 180)}…
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                  <button
                                    type="button"
                                    className="link-btn"
                                    style={{ fontSize: '0.75rem', color: '#7dd3fc' }}
                                    onClick={() => toggleExpandEmail(email.id)}
                                  >
                                    {isExpanded ? 'Collapse Message ▲' : 'Read Full Email ▼'}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => handleCopyEmail(email)}
                                    title="Copy raw email text"
                                  >
                                    <CopyIcon size={12} />
                                    <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()
                  )}
                </div>
              )}

              {/* TAB 2: Compose & Send Email */}
              {emailModalTab === 'compose' && (
                <div>
                  <div className="email-meta-strip">
                    <div>
                      <strong>Recipient:</strong> {emailModalCandidate.full_name} &lt;{emailModalCandidate.email}&gt;
                    </div>
                    <div>
                      <strong>Position:</strong> {emailModalCandidate.job_title || 'Applicant'}
                    </div>
                  </div>

                  {/* Preset Template Chips */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-400)', marginBottom: 6 }}>
                      ⚡ Instant Email Templates:
                    </label>
                    <div className="email-template-bar">
                      <button
                        type="button"
                        className="template-pill-btn"
                        onClick={() => applyEmailTemplate('interview_invite')}
                      >
                        📅 Interview Invite
                      </button>
                      <button
                        type="button"
                        className="template-pill-btn"
                        onClick={() => applyEmailTemplate('status_update')}
                      >
                        ⏱️ Status Check-in
                      </button>
                      <button
                        type="button"
                        className="template-pill-btn"
                        onClick={() => applyEmailTemplate('request_info')}
                      >
                        📁 Request Portfolio/Links
                      </button>
                      <button
                        type="button"
                        className="template-pill-btn"
                        onClick={() => applyEmailTemplate('offer_discussion')}
                      >
                        🎉 Offer Discussion
                      </button>
                      <button
                        type="button"
                        className="template-pill-btn"
                        onClick={() => applyEmailTemplate('custom')}
                      >
                        ✏️ Custom
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSendEmail}>
                    <div className="email-compose-group">
                      <label>Subject Line</label>
                      <input
                        type="text"
                        className="email-compose-input"
                        placeholder="e.g., Interview Confirmation — Senior AI Engineer at B2World"
                        value={newEmailSubject}
                        onChange={(e) => setNewEmailSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div className="email-compose-group">
                      <label>Email Body</label>
                      <textarea
                        className="note-compose-textarea"
                        style={{ minHeight: 180, lineHeight: 1.6 }}
                        placeholder="Compose message to candidate..."
                        value={newEmailBody}
                        onChange={(e) => setNewEmailBody(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                      <span className="hint" style={{ fontSize: '0.75rem' }}>
                        Delivered to {emailModalCandidate.email} and recorded in audit log.
                      </span>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEmailModalTab('history')}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={!newEmailSubject.trim() || !newEmailBody.trim() || sendingEmail}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          {sendingEmail ? (
                            <>
                              <span className="spinner" />
                              <span>Dispatching Email…</span>
                            </>
                          ) : (
                            <>
                              <SendIcon size={14} />
                              <span>Send Email</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setEmailModalCandidate(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}