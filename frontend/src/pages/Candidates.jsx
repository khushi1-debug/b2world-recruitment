import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import {
  BrainIcon,
  BriefcaseIcon,
  UsersIcon,
  ScaleIcon,
  AwardIcon,
  UploadCloudIcon,
  CalendarIcon,
  SearchIcon,
  FileTextIcon,
  EyeIcon,
  XIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  SparklesIcon,
  DollarSignIcon,
  MessageSquareIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
  Trash2Icon,
  SendIcon,
  MailIcon,
  CopyIcon
} from '../components/Icons'

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

const STAGES = [
  ['applied', 'Applied'],
  ['under_review', 'Under Review'],
  ['screened', 'Screened'],
  ['shortlisted', 'Shortlisted'],
  ['interview_scheduled', 'Interview Scheduled'],
  ['technical_round', 'Technical Round'],
  ['hr_round', 'HR Round'],
  ['selected', 'Selected'],
  ['rejected', 'Rejected'],
  ['joined', 'Joined'],
  ['withdrawn', 'Withdrawn'],
]

function daysSince(dateString) {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function isStale(dateString, stage) {
  const FINAL_STAGES = ['selected', 'rejected', 'joined']
  if (FINAL_STAGES.includes(stage)) return false
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
  return days >= 7
}

export default function Candidates() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals state
  const [showBiasModal, setShowBiasModal] = useState(false)
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [resumePreview, setResumePreview] = useState(null)

  // Candidate comparison
  const [compareSelection, setCompareSelection] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [loadingCompare, setLoadingCompare] = useState(false)

  // AI tools state per candidate
  const [activeAITabs, setActiveAITabs] = useState({}) // { candidateId: 'questions' | 'flags' | 'offer' | 'fit' | 'ask' }
  const [questions, setQuestions] = useState({})
  const [loadingQuestions, setLoadingQuestions] = useState(null)
  const [redFlags, setRedFlags] = useState({})
  const [loadingFlags, setLoadingFlags] = useState(null)
  const [offers, setOffers] = useState({})
  const [loadingOffer, setLoadingOffer] = useState(null)
  const [prediction, setPrediction] = useState({})
  const [loadingPrediction, setLoadingPrediction] = useState(null)
  const [questionInput, setQuestionInput] = useState({})
  const [askAnswers, setAskAnswers] = useState({})
  const [loadingAsk, setLoadingAsk] = useState(null)
  const [skillGapSuggestions, setSkillGapSuggestions] = useState({})
  const [loadingSkillGap, setLoadingSkillGap] = useState(null)

  // Role-level AI features
  const [biasCheck, setBiasCheck] = useState(null)
  const [loadingBias, setLoadingBias] = useState(false)
  const [rewrite, setRewrite] = useState(null)
  const [loadingRewrite, setLoadingRewrite] = useState(false)
  const [assessment, setAssessment] = useState([])
  const [loadingAssessment, setLoadingAssessment] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [bulkFiles, setBulkFiles] = useState(null)
  const [bulkResult, setBulkResult] = useState(null)
  const [loadingBulk, setLoadingBulk] = useState(false)

  // Interview scheduling
  const [pendingInterview, setPendingInterview] = useState(null)
  const [loadingOfferStatus, setLoadingOfferStatus] = useState(null)
  const [loadingResumePreview, setLoadingResumePreview] = useState(null)

  // Filtering on board
  const [searchFilter, setSearchFilter] = useState('')
  const [minScoreFilter, setMinScoreFilter] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState('')

  // Notes Modal state
  const [notesModalCandidate, setNotesModalCandidate] = useState(null)
  const [candidateNotes, setCandidateNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)

  // Candidate Email History Log Modal state
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

  // Tags state
  const [openTagPopover, setOpenTagPopover] = useState(null)
  const [customTagInput, setCustomTagInput] = useState({})

  const load = () => {
    Promise.all([
      client.get(`/api/jobs/${id}`),
      client.get(`/api/candidates/job/${id}`),
    ])
      .then(([jobRes, candRes]) => {
        setJob(jobRes.data)
        setCandidates(candRes.data)
      })
      .catch(() => setError('Could not load this candidate pipeline. You may lack permissions.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStageChange = async (candidateId, stage) => {
    if (stage === 'interview_scheduled') {
      setPendingInterview({ candidateId, datetime: '' })
      return
    }
    await saveStageChange(candidateId, stage, null)
  }

  const saveStageChange = async (candidateId, stage, interview_datetime) => {
    const prev = candidates
    setCandidates(candidates.map((c) => (c.id === candidateId ? { ...c, stage } : c)))
    try {
      const payload = { stage }
      if (interview_datetime) payload.interview_datetime = interview_datetime
      await client.patch(`/api/candidates/${candidateId}/stage`, payload)
      load()
    } catch {
      setCandidates(prev)
    }
  }

  const confirmInterviewSchedule = async () => {
    if (!pendingInterview) return
    await saveStageChange(pendingInterview.candidateId, 'interview_scheduled', pendingInterview.datetime || null)
    setPendingInterview(null)
  }

  // Notes actions
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
    setNewEmailSubject(`Update regarding your application for ${job?.title || 'the role'} at B2World`)
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
      // Auto-expand the most recent email if available
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
    const roleTitle = job?.title || 'Open Position'
    const scheduleStr = emailModalCandidate.interview_datetime
      ? new Date(emailModalCandidate.interview_datetime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : '[Date & Time]'

    if (templateKey === 'interview_invite') {
      setNewEmailType('interview_invitation')
      setNewEmailSubject(`Interview Invitation: ${roleTitle} at B2World`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `Great news — based on our team's initial evaluation, we would love to invite you to an interview for the ${roleTitle} position at B2World.\n\n` +
        `Scheduled Date/Time: ${scheduleStr}\n` +
        `Meeting Format: Google Meet (Calendar invitation with video link to follow)\n\n` +
        `Please let us know if you have any questions or need to reschedule. We look forward to speaking with you!\n\n` +
        `Warm regards,\nB2World Hiring Team`
      )
    } else if (templateKey === 'status_update') {
      setNewEmailType('status_update')
      setNewEmailSubject(`Application Update: ${roleTitle} at B2World`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `We wanted to share a quick update regarding your application for the ${roleTitle} role. Your profile is currently under active review with our engineering leadership team.\n\n` +
        `We aim to finalize our next-round decisions by early next week and will follow up with you promptly.\n\n` +
        `Thank you for your patience and enthusiasm for B2World!\n\n` +
        `Best regards,\nB2World Recruitment`
      )
    } else if (templateKey === 'request_info') {
      setNewEmailType('custom')
      setNewEmailSubject(`Action Required: Additional Details for ${roleTitle}`)
      setNewEmailBody(
        `Hi ${candidateName},\n\n` +
        `Thank you for applying for the ${roleTitle} position. To help our interviewers prepare, could you please reply with:\n\n` +
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
        `The entire interview panel was deeply impressed by your experience, problem-solving ability, and alignment with our mission. We would love to schedule a brief call this week to review the compensation package, benefits, and start date details.\n\n` +
        `Please let us know your availability over the next couple of days.\n\n` +
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
      // Reset compose form
      setNewEmailSubject(`Regarding your application for ${job?.title || 'the role'} at B2World`)
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

  const toggleCompareSelection = (candidateId) => {
    setCompareResult(null)
    setCompareSelection((prev) => {
      if (prev.includes(candidateId)) return prev.filter((i) => i !== candidateId)
      if (prev.length >= 2) return [prev[1], candidateId]
      return [...prev, candidateId]
    })
  }

  const handleCompare = async () => {
    if (compareSelection.length !== 2) return
    setLoadingCompare(true)
    setShowCompareModal(true)
    try {
      const res = await client.get('/api/candidates/compare', {
        params: { candidate_a_id: compareSelection[0], candidate_b_id: compareSelection[1] },
      })
      setCompareResult(res.data)
    } catch {
      setCompareResult({ stronger_candidate: '—', reasoning: 'Could not perform comparison at this moment.' })
    } finally {
      setLoadingCompare(false)
    }
  }

  const toggleAITab = (candidateId, tabName) => {
    setActiveAITabs((prev) => ({
      ...prev,
      [candidateId]: prev[candidateId] === tabName ? null : tabName,
    }))

    // Auto trigger data load on tab open
    if (tabName === 'questions' && !questions[candidateId]) handleGenerateQuestions(candidateId)
    if (tabName === 'flags' && !redFlags[candidateId]) handleCheckRedFlags(candidateId)
    if (tabName === 'offer' && !offers[candidateId]) handleSuggestOffer(candidateId)
    if (tabName === 'fit' && !prediction[candidateId]) handlePredictSuccess(candidateId)
  }

  const handleViewResume = async (candidateId, candidateName) => {
    setLoadingResumePreview(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/resume-text`)
      setResumePreview({ name: candidateName, text: res.data.resume_text })
    } catch {
      setResumePreview({ name: candidateName, text: 'Could not load formatted resume text.' })
    } finally {
      setLoadingResumePreview(null)
    }
  }

  const handleGenerateQuestions = async (candidateId) => {
    setLoadingQuestions(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/interview-questions`)
      setQuestions((prev) => ({ ...prev, [candidateId]: res.data }))
    } catch {
      setQuestions((prev) => ({ ...prev, [candidateId]: ['Could not generate questions. Please try again.'] }))
    } finally {
      setLoadingQuestions(null)
    }
  }

  const handleCheckRedFlags = async (candidateId) => {
    setLoadingFlags(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/red-flags`)
      setRedFlags((prev) => ({ ...prev, [candidateId]: res.data }))
    } catch {
      setRedFlags((prev) => ({ ...prev, [candidateId]: { flags: [], note: 'Error analyzing red flags.' } }))
    } finally {
      setLoadingFlags(null)
    }
  }

  const handleSuggestOffer = async (candidateId) => {
    setLoadingOffer(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/suggested-offer`)
      setOffers((prev) => ({ ...prev, [candidateId]: res.data }))
    } catch (err) {
      setOffers((prev) => ({
        ...prev,
        [candidateId]: { error: err.response?.data?.detail || 'Could not compute offer recommendation.' },
      }))
    } finally {
      setLoadingOffer(null)
    }
  }

  const handlePredictSuccess = async (candidateId) => {
    setLoadingPrediction(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/success-prediction`)
      setPrediction((prev) => ({ ...prev, [candidateId]: res.data }))
    } catch {
      setPrediction((prev) => ({ ...prev, [candidateId]: null }))
    } finally {
      setLoadingPrediction(null)
    }
  }

  const handleAskCopilot = async (candidateId) => {
    const q = questionInput[candidateId]
    if (!q || !q.trim()) return
    setLoadingAsk(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/ask`, { params: { question: q } })
      setAskAnswers((prev) => ({ ...prev, [candidateId]: res.data.answer }))
    } catch {
      setAskAnswers((prev) => ({ ...prev, [candidateId]: 'Could not query candidate background.' }))
    } finally {
      setLoadingAsk(null)
    }
  }

  const handleSkillGapTraining = async (candidateId) => {
    setLoadingSkillGap(candidateId)
    try {
      const res = await client.get(`/api/candidates/${candidateId}/skill-gap-training`)
      setSkillGapSuggestions((prev) => ({ ...prev, [candidateId]: res.data.suggestions }))
    } catch {
      setSkillGapSuggestions((prev) => ({ ...prev, [candidateId]: [] }))
    } finally {
      setLoadingSkillGap(null)
    }
  }

  const handleOfferStatusToggle = async (candidateId, field, value) => {
    setLoadingOfferStatus(candidateId)
    try {
      await client.patch(`/api/candidates/${candidateId}/offer-status`, { [field]: value })
      load()
    } catch {
      // ignore
    } finally {
      setLoadingOfferStatus(null)
    }
  }

  // Job-level features
  const handleCheckBias = async () => {
    setShowBiasModal(true)
    if (biasCheck) return
    setLoadingBias(true)
    try {
      const res = await client.get(`/api/jobs/${id}/bias-check`)
      setBiasCheck(res.data)
    } catch {
      setBiasCheck({ flags: [], note: 'Could not perform bias scan.' })
    } finally {
      setLoadingBias(false)
    }
  }

  const handleSuggestRewrite = async () => {
    setLoadingRewrite(true)
    try {
      const res = await client.get(`/api/jobs/${id}/bias-rewrite`)
      setRewrite(res.data)
    } catch {
      setRewrite(null)
    } finally {
      setLoadingRewrite(false)
    }
  }

  const handleGenerateAssessment = async () => {
    setShowAssessmentModal(true)
    if (assessment.length > 0) return
    setLoadingAssessment(true)
    try {
      const res = await client.get(`/api/jobs/${id}/skill-assessment`)
      setAssessment(res.data)
    } catch {
      setAssessment([])
    } finally {
      setLoadingAssessment(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return
    setLoadingBulk(true)
    setBulkResult(null)
    try {
      const data = new FormData()
      data.append('job_id', id)
      data.append('source', 'Bulk Ingest')
      for (let i = 0; i < bulkFiles.length; i++) {
        data.append('resumes', bulkFiles[i])
      }
      const res = await client.post('/api/candidates/bulk-apply', data)
      setBulkResult(res.data)
      load()
    } catch {
      setBulkResult({ total_uploaded: 0, created: [], duplicates: [], failed: [{ filename: 'Upload', reason: 'Error processing files' }] })
    } finally {
      setLoadingBulk(false)
    }
  }

  if (loading) {
    return (
      <div className="page container">
        <div className="empty-state">
          <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          <p style={{ marginTop: 14 }}>Loading candidate pipeline…</p>
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

  // Filter candidates on the board
  const allAvailableTags = Array.from(
    new Set(candidates.flatMap((c) => c.tags || []))
  ).sort()

  const filteredCandidates = candidates.filter((c) => {
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const match = c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      if (!match) return false
    }
    if (minScoreFilter !== '') {
      if ((c.ats_score || 0) < Number(minScoreFilter)) return false
    }
    if (selectedTagFilter) {
      if (!c.tags || !c.tags.includes(selectedTagFilter)) return false
    }
    return true
  })

  const getInitials = (name) => {
    if (!name) return 'C'
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="page container" style={{ maxWidth: 1400 }}>
      {/* Pipeline Header */}
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1>{job?.title}</h1>
            <span className="badge badge-emerald">{job?.status}</span>
          </div>
          <p>
            {candidates.length} candidate{candidates.length === 1 ? '' : 's'} in pipeline · Ranked by ATS score
          </p>
        </div>

        <div className="page-actions">
          <Link to={`/jobs/${id}`} className="btn btn-ghost">
            <EyeIcon size={15} />
            <span>View Job Post</span>
          </Link>
          <Link to="/jobs/new" className="btn btn-primary">
            <span>Post Role</span>
          </Link>
        </div>
      </div>

      {/* Recruiter Action Toolbar */}
      <div className="kanban-toolbar">
        <div className="kanban-filters-group">
          <div className="jobs-search-input" style={{ width: 240 }}>
            <SearchIcon size={15} />
            <input
              type="text"
              placeholder="Search candidate name or email…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          <input
            type="number"
            min="0"
            max="100"
            placeholder="Min ATS %"
            style={{ width: 105, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(e.target.value)}
          />

          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'var(--bg-surface)', color: 'var(--ink-white)', fontSize: '0.8125rem' }}
          >
            <option value="">All Tags / Labels</option>
            {allAvailableTags.map((tag) => (
              <option key={tag} value={tag}>🏷️ {tag}</option>
            ))}
          </select>
        </div>

        <div className="kanban-actions-group">
          <button className="btn btn-ghost btn-sm" onClick={handleCheckBias}>
            <ScaleIcon size={14} />
            <span>Bias Scanner</span>
          </button>

          <button className="btn btn-ghost btn-sm" onClick={handleGenerateAssessment}>
            <AwardIcon size={14} />
            <span>Skill Test Gen</span>
          </button>

          <button className="btn btn-ghost btn-sm" onClick={() => setShowBulkModal(true)}>
            <UploadCloudIcon size={14} />
            <span>Bulk Upload</span>
          </button>

          <button
            className="btn btn-gradient-ai btn-sm"
            onClick={handleCompare}
            disabled={compareSelection.length !== 2 || loadingCompare}
          >
            <ScaleIcon size={14} />
            <span>Compare Selected ({compareSelection.length}/2)</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="kanban-scroll">
        {STAGES.map(([key, label]) => {
          const col = filteredCandidates.filter((c) => c.stage === key)
          return (
            <div key={key} className="kanban-col">
              <div className="kanban-col-head">
                <h4>{label}</h4>
                <span className="kanban-count">{col.length}</span>
              </div>

              <div className="kanban-card-container">
                {col.map((c) => {
                  const score = c.ats_score != null ? Math.round(c.ats_score) : null
                  const isStaleCand = isStale(c.applied_at, c.stage)
                  const activeTab = activeAITabs[c.id]

                  return (
                    <div key={c.id} className="kanban-card">
                      {/* Top: Checkbox, Name, Score Pill */}
                      <div className="kanban-card-top">
                        <div className="kanban-card-author">
                          <input
                            type="checkbox"
                            checked={compareSelection.includes(c.id)}
                            onChange={() => toggleCompareSelection(c.id)}
                            title="Select candidate for comparison"
                            style={{ cursor: 'pointer' }}
                          />
                          <div className="candidate-avatar">{getInitials(c.full_name)}</div>
                          <div>
                            <div className="kanban-card-name">{c.full_name}</div>
                            <div className="kanban-card-email">
                              {c.email}
                              <button
                                className="link-btn"
                                style={{ marginLeft: 6 }}
                                onClick={() => handleViewResume(c.id, c.full_name)}
                                disabled={loadingResumePreview === c.id}
                              >
                                {loadingResumePreview === c.id ? '…' : 'View'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {score !== null && (
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
                        )}
                      </div>

                      {/* Applied Time & Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--ink-500)', marginBottom: 6 }}>
                        <span className={isStaleCand ? 'text-amber' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: isStaleCand ? 700 : 500 }}>
                          <ClockIcon size={12} />
                          {isStaleCand && '⚠️ '}
                          {daysSince(c.applied_at)}
                        </span>
                        {c.location && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <MapPinIcon size={12} />
                            {c.location}
                          </span>
                        )}
                        {c.experience_years != null && (
                          <span>· {c.experience_years}y exp</span>
                        )}
                      </div>

                      {/* Candidate Custom Tags / Labels & Notes Row */}
                      <div className="cand-tags-row">
                        {(c.tags || []).map((tag, idx) => (
                          <span key={idx} className={`cand-tag-chip ${getTagColorClass(tag)}`}>
                            <TagIcon size={10} />
                            <span>{tag}</span>
                            <button
                              type="button"
                              className="cand-tag-delete-btn"
                              title={`Remove ${tag}`}
                              onClick={() => handleRemoveTag(c.id, tag)}
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
                                  {PRESET_TAGS.filter((t) => !(c.tags || []).includes(t)).map((preset) => (
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

                        {/* Recruiter Notes History Pill */}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className={`email-pill-badge ${(c.emails_count || 0) > 0 ? 'has-emails' : ''}`}
                            onClick={() => handleOpenEmails(c)}
                            title="Open candidate email communications history"
                          >
                            <MailIcon size={12} />
                            <span>{(c.emails_count || 0) > 0 ? `${c.emails_count} Email${c.emails_count === 1 ? '' : 's'}` : 'Emails'}</span>
                          </button>

                          <button
                            type="button"
                            className={`notes-pill-badge ${(c.notes_count || 0) > 0 ? 'has-notes' : ''}`}
                            onClick={() => handleOpenNotes(c)}
                            title="Open candidate feedback log"
                          >
                            <MessageSquareIcon size={12} />
                            <span>{(c.notes_count || 0) > 0 ? `${c.notes_count} Note${c.notes_count === 1 ? '' : 's'}` : 'Notes'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Scheduled Interview Badge */}
                      {c.interview_datetime && (
                        <div className="interview-time-badge" style={{ marginBottom: 8 }}>
                          📅 {new Date(c.interview_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      )}

                      {/* AI Summary */}
                      {c.ai_summary && (
                        <div className="ai-summary">
                          <SparklesIcon size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--brand-600)' }} />
                          {c.ai_summary}
                        </div>
                      )}

                      {/* Recommendation Badge */}
                      {c.recommendation && (
                        <div className={`ai-recommendation ai-rec-${c.recommendation.replace(/\s+/g, '-').toLowerCase()}`}>
                          {c.recommendation}
                        </div>
                      )}

                      {/* Missing Skills Gap */}
                      {c.missing_skills && c.missing_skills.length > 0 && (
                        <div className="skill-gap">
                          <span>Missing: {c.missing_skills.join(', ')}</span>
                          <button
                            className="link-btn"
                            style={{ marginLeft: 6 }}
                            onClick={() => handleSkillGapTraining(c.id)}
                            disabled={loadingSkillGap === c.id}
                          >
                            {loadingSkillGap === c.id ? 'Analyzing…' : 'Bridge gap'}
                          </button>
                        </div>
                      )}

                      {skillGapSuggestions[c.id] && skillGapSuggestions[c.id].length > 0 && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-surface)', borderRadius: 6, fontSize: '0.75rem', border: '1px solid var(--line)' }}>
                          {skillGapSuggestions[c.id].map((s, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>
                              <strong>{s.skill}:</strong> {s.suggestion}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Collapsible AI Tools Toolbar on Card */}
                      <div className="card-ai-tools">
                        <div className="card-ai-tabs">
                          <button
                            type="button"
                            className={`card-ai-tab ${activeTab === 'questions' ? 'active' : ''}`}
                            onClick={() => toggleAITab(c.id, 'questions')}
                          >
                            💡 Questions
                          </button>
                          <button
                            type="button"
                            className={`card-ai-tab ${activeTab === 'flags' ? 'active' : ''}`}
                            onClick={() => toggleAITab(c.id, 'flags')}
                          >
                            🔍 Flags
                          </button>
                          <button
                            type="button"
                            className={`card-ai-tab ${activeTab === 'offer' ? 'active' : ''}`}
                            onClick={() => toggleAITab(c.id, 'offer')}
                          >
                            💰 Offer
                          </button>
                          <button
                            type="button"
                            className={`card-ai-tab ${activeTab === 'fit' ? 'active' : ''}`}
                            onClick={() => toggleAITab(c.id, 'fit')}
                          >
                            📈 Fit
                          </button>
                          <button
                            type="button"
                            className={`card-ai-tab ${activeTab === 'ask' ? 'active' : ''}`}
                            onClick={() => toggleAITab(c.id, 'ask')}
                          >
                            🤖 Copilot
                          </button>
                        </div>

                        {/* Active AI Tab Content Drawer */}
                        {activeTab === 'questions' && (
                          <div className="card-ai-content">
                            {loadingQuestions === c.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="spinner spinner-dark" />
                                <span>Generating tailored questions…</span>
                              </div>
                            ) : questions[c.id] ? (
                              <ul style={{ paddingLeft: 16, fontSize: '0.75rem', lineHeight: 1.45 }}>
                                {questions[c.id].map((q, i) => (
                                  <li key={i} style={{ marginBottom: 4 }}>{q}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        )}

                        {activeTab === 'flags' && (
                          <div className="card-ai-content">
                            {loadingFlags === c.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="spinner spinner-dark" />
                                <span>Checking for resume red flags…</span>
                              </div>
                            ) : redFlags[c.id] ? (
                              redFlags[c.id].flags.length > 0 ? (
                                <div style={{ color: '#b45309' }}>
                                  <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Verification Notes:</div>
                                  <ul style={{ paddingLeft: 16, fontSize: '0.75rem' }}>
                                    {redFlags[c.id].flags.map((f, i) => (
                                      <li key={i}>{f}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div style={{ color: '#047857' }}>✅ {redFlags[c.id].note || 'No significant red flags detected.'}</div>
                              )
                            ) : null}
                          </div>
                        )}

                        {activeTab === 'offer' && (
                          <div className="card-ai-content">
                            {loadingOffer === c.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="spinner spinner-dark" />
                                <span>Calculating competitive salary band…</span>
                              </div>
                            ) : offers[c.id] ? (
                              offers[c.id].error ? (
                                <div className="hint">{offers[c.id].error}</div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--emerald-600)' }}>
                                    ₹{offers[c.id].suggested_salary?.toLocaleString('en-IN')} / yr
                                  </div>
                                  <div className="hint" style={{ fontSize: '0.75rem', marginTop: 2 }}>{offers[c.id].reason}</div>
                                </div>
                              )
                            ) : null}
                          </div>
                        )}

                        {activeTab === 'fit' && (
                          <div className="card-ai-content">
                            {loadingPrediction === c.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="spinner spinner-dark" />
                                <span>Predicting candidate fit…</span>
                              </div>
                            ) : prediction[c.id] ? (
                              <div>
                                <div className="prediction-bar-track" style={{ marginBottom: 4 }}>
                                  <div
                                    className="prediction-bar-fill"
                                    style={{ width: `${prediction[c.id].likelihood_percent}%` }}
                                  />
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                  {prediction[c.id].likelihood_percent}% — {prediction[c.id].label}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {activeTab === 'ask' && (
                          <div className="card-ai-content">
                            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                              <input
                                type="text"
                                style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--line)' }}
                                placeholder="Ask resume question…"
                                value={questionInput[c.id] || ''}
                                onChange={(e) => setQuestionInput({ ...questionInput, [c.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot(c.id)}
                              />
                              <button
                                className="btn btn-primary btn-xs"
                                onClick={() => handleAskCopilot(c.id)}
                                disabled={loadingAsk === c.id}
                              >
                                {loadingAsk === c.id ? '…' : 'Ask'}
                              </button>
                            </div>
                            {askAnswers[c.id] && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--ink-100)', background: 'var(--bg-card-subtle)', padding: 8, borderRadius: 4, border: '1px solid var(--line-strong)' }}>
                                🤖 {askAnswers[c.id]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stage Selector */}
                      <select
                        className="stage-select"
                        value={c.stage}
                        onChange={(e) => handleStageChange(c.id, e.target.value)}
                      >
                        {STAGES.map(([sKey, sLabel]) => (
                          <option key={sKey} value={sKey}>{sLabel}</option>
                        ))}
                      </select>

                      {/* Inline Interview Date Picker */}
                      {pendingInterview && pendingInterview.candidateId === c.id && (
                        <div style={{ marginTop: 10, padding: 12, background: 'var(--cyan-bg)', borderRadius: 8, border: '1px solid var(--cyan-border)' }}>
                          <label className="hint" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: 'var(--cyan-400)' }}>
                            Select Interview Date &amp; Time:
                          </label>
                          <input
                            type="datetime-local"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--line-strong)', fontSize: '0.8125rem', background: 'var(--bg-surface)', color: '#ffffff' }}
                            value={pendingInterview.datetime}
                            onChange={(e) => setPendingInterview({ ...pendingInterview, datetime: e.target.value })}
                          />
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button className="btn btn-primary btn-xs" onClick={confirmInterviewSchedule}>
                              Schedule Interview
                            </button>
                            <button className="btn btn-ghost btn-xs" onClick={() => setPendingInterview(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Offer Status Toggles */}
                      {(c.stage === 'selected' || c.stage === 'joined' || c.offer_released) && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          <button
                            className={`btn btn-xs ${c.offer_released ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => handleOfferStatusToggle(c.id, 'offer_released', !c.offer_released)}
                            disabled={loadingOfferStatus === c.id}
                          >
                            {c.offer_released ? '✓ Offer Released' : 'Release Offer'}
                          </button>
                          {c.offer_released && (
                            <button
                              className={`btn btn-xs ${c.offer_accepted ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => handleOfferStatusToggle(c.id, 'offer_accepted', !c.offer_accepted)}
                              disabled={loadingOfferStatus === c.id}
                            >
                              {c.offer_accepted ? '✓ Offer Accepted' : 'Mark Accepted'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL 1: Resume Preview */}
      {resumePreview && (
        <div className="modal-overlay" onClick={() => setResumePreview(null)}>
          <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{resumePreview.name}&apos;s Parsed Resume Text</h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setResumePreview(null)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="modal-body">
              <pre className="resume-preview-text" style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {resumePreview.text}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setResumePreview(null)}>
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Candidate Comparison */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ScaleIcon size={18} />
                <h3>AI Candidate Comparison</h3>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowCompareModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="modal-body">
              {loadingCompare ? (
                <div className="empty-state">
                  <span className="spinner spinner-dark" />
                  <p style={{ marginTop: 12 }}>Comparing candidates side-by-side…</p>
                </div>
              ) : compareResult ? (
                <div>
                  <div style={{ background: 'var(--emerald-bg)', padding: 18, borderRadius: 10, border: '1px solid var(--emerald-border)', marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--emerald-400)', marginBottom: 6 }}>
                      🏆 Recommended Winner: {compareResult.stronger_candidate}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--ink-200)', lineHeight: 1.6 }}>
                      {compareResult.reasoning}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCompareModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bias Checker & Rewriter */}
      {showBiasModal && (
        <div className="modal-overlay" onClick={() => setShowBiasModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ScaleIcon size={18} />
                <h3>Inclusive Language &amp; Bias Checker</h3>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowBiasModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="modal-body">
              {loadingBias ? (
                <div className="empty-state">
                  <span className="spinner spinner-dark" />
                  <p style={{ marginTop: 12 }}>Auditing job description for bias…</p>
                </div>
              ) : biasCheck ? (
                <div>
                  {biasCheck.flags.length > 0 ? (
                    <div>
                      <div className="alert alert-warning">
                        <AlertTriangleIcon size={16} />
                        <span>{biasCheck.note}</span>
                      </div>
                      <div className="hint" style={{ fontWeight: 700, marginBottom: 8, color: 'var(--ink-200)' }}>Language Flags Identified:</div>
                      <ul style={{ paddingLeft: 18, fontSize: '0.875rem', marginBottom: 16 }}>
                        {biasCheck.flags.map((f, i) => (
                          <li key={i} style={{ marginBottom: 4, color: 'var(--amber-400)' }}>{f}</li>
                        ))}
                      </ul>

                      <button
                        className="btn btn-gradient-ai btn-sm"
                        onClick={handleSuggestRewrite}
                        disabled={loadingRewrite}
                      >
                        <SparklesIcon size={14} />
                        <span>{loadingRewrite ? 'Rewriting…' : 'Generate Inclusive Rewrite'}</span>
                      </button>

                      {rewrite && (
                        <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--line-strong)' }}>
                          <div className="hint" style={{ fontWeight: 700, marginBottom: 6, color: '#c7d2fe' }}>Suggested Inclusive Revision:</div>
                          <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--ink-200)' }}>{rewrite.rewritten}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="alert alert-success">
                      <CheckCircleIcon size={18} />
                      <span>{biasCheck.note || 'No biased or exclusionary language detected.'}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBiasModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Skill Assessment Generator */}
      {showAssessmentModal && (
        <div className="modal-overlay" onClick={() => setShowAssessmentModal(false)}>
          <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AwardIcon size={18} />
                <h3>Generated Technical Skill Assessment</h3>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowAssessmentModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="modal-body">
              {loadingAssessment ? (
                <div className="empty-state">
                  <span className="spinner spinner-dark" />
                  <p style={{ marginTop: 12 }}>Synthesizing technical question bank…</p>
                </div>
              ) : assessment.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span className="hint">{assessment.length} questions tailored to required tech stack</span>
                    <button className="btn btn-ghost btn-xs" onClick={() => setShowAnswers(!showAnswers)}>
                      {showAnswers ? 'Hide Answer Key' : 'Show Answer Key'}
                    </button>
                  </div>

                  {assessment.map((q, i) => (
                    <div key={i} className="assessment-question-card" style={{ marginBottom: 14, padding: 16, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--line)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--ink-white)' }}>Q{i + 1}. {q.question}</div>
                      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              fontSize: '0.8125rem',
                              marginBottom: 6,
                              background: showAnswers && q.correct_index === oi ? 'var(--emerald-bg)' : 'var(--bg-card)',
                              color: showAnswers && q.correct_index === oi ? 'var(--emerald-400)' : 'var(--ink-200)',
                              fontWeight: showAnswers && q.correct_index === oi ? 700 : 400,
                              border: showAnswers && q.correct_index === oi ? '1px solid var(--emerald-border)' : '1px solid var(--line-strong)',
                            }}
                          >
                            <span style={{ marginRight: 8, fontWeight: 700 }}>{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                            {showAnswers && q.correct_index === oi && ' ✓ (Correct)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No assessment generated yet.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAssessmentModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Bulk Resume Upload */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UploadCloudIcon size={18} />
                <h3>Batch Resume Ingestion &amp; Scoring</h3>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowBulkModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="hint" style={{ marginBottom: 16 }}>
                Select multiple candidate resumes (PDF, DOCX, TXT) to parse and screen simultaneously.
              </p>

              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => setBulkFiles(e.target.files)}
                style={{ marginBottom: 16 }}
              />

              <button
                className="btn btn-primary btn-block"
                onClick={handleBulkUpload}
                disabled={loadingBulk || !bulkFiles}
              >
                {loadingBulk ? (
                  <>
                    <span className="spinner" />
                    <span>Processing Resumes in Parallel…</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon size={16} />
                    <span>Start Batch Screening</span>
                  </>
                )}
              </button>

              {bulkResult && (
                <div style={{ marginTop: 20 }}>
                  <div className="alert alert-success">
                    <CheckCircleIcon size={16} />
                    <span>
                      {bulkResult.total_uploaded} uploaded — {bulkResult.created.length} added, {bulkResult.duplicates.length} duplicates
                    </span>
                  </div>

                  {bulkResult.created.length > 0 && (
                    <ul style={{ paddingLeft: 16, fontSize: '0.8125rem' }}>
                      {bulkResult.created.map((c, i) => (
                        <li key={i}>{c.name} — <strong>{c.ats_score.toFixed(0)}% ATS</strong></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBulkModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Candidate Notes & Feedback History Log */}
      {notesModalCandidate && (
        <div className="modal-overlay" onClick={() => setNotesModalCandidate(null)}>
          <div className="modal-box modal-box-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MessageSquareIcon size={18} />
                <div>
                  <h3 style={{ margin: 0 }}>Candidate Notes &amp; Feedback History</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-400)', marginTop: 2 }}>
                    {notesModalCandidate.full_name} · {job?.title}
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
                  placeholder={`Write feedback for ${notesModalCandidate.full_name}... (e.g., Note on screening, culture fit, or technical round observations)`}
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

      {/* MODAL 7: Candidate Email History & Communications Log */}
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
                    {emailModalCandidate.full_name} ({emailModalCandidate.email}) · {job?.title}
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
                      <strong>Position:</strong> {job?.title}
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