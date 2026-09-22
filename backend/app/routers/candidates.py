import json
import os
import re
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.config import settings
from app.utils.resume_parser import extract_text
from app.utils.ai_screening import score_resume, generate_interview_questions, check_resume_red_flags, suggest_offer, predict_candidate_success, ask_about_candidate, compare_candidates, suggest_skill_gap_training
from app.utils.email import (
    send_email,
    send_interview_invitation_email,
    send_rejection_email,
    send_under_review_email,
)

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

HIRING_ROLES = ("super_admin", "hr_manager", "recruiter")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE_MB = 5


def _extract_contact_info(resume_text: str, filename: str) -> dict:
    """Used only by bulk upload (Step 11), where there's no application form
    to type name/email into - so we pull it from the resume text itself.
    Regex-based, not AI, since email/phone patterns are reliable to match
    directly and don't need an AI call. Name extraction is a best-effort
    guess (first non-empty line) - deliberately falls back to the filename
    if that line looks wrong, since a bad guess here would misfile a real
    person's application under the wrong name."""
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", resume_text)
    email = email_match.group(0) if email_match else None

    phone_match = re.search(r"(\+?\d[\d\s\-\(\)]{8,14}\d)", resume_text)
    phone = phone_match.group(0).strip() if phone_match else None

    name = None
    for line in resume_text.strip().split("\n")[:5]:
        line = line.strip()
        # A plausible name line: short, no @ symbol, no digits, not empty
        if line and len(line) < 60 and "@" not in line and not any(ch.isdigit() for ch in line):
            name = line
            break
    if not name:
        name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()

    return {"name": name, "email": email, "phone": phone}


def _auto_stage_from_score(ats_score: float) -> models.CandidateStage:
    """
    Automatic ATS Stage Routing Rules:
    - Score >= 80%: Automatically moved to 'shortlisted' (Top tier candidates)
    - 60% <= Score < 80%: Automatically moved to 'screened' (Qualified candidates)
    - Score < 60%: Automatically moved to 'rejected' (Does not meet minimum requirements)
    """
    if ats_score is None:
        return models.CandidateStage.applied
    if ats_score >= 80:
        return models.CandidateStage.shortlisted
    if ats_score >= 60:
        return models.CandidateStage.screened
    return models.CandidateStage.rejected



def _recommendation_label(ats_score) -> str:
    """AI Recommendation (Step 10)."""
    if ats_score is None:
        return "Needs Review"
    if ats_score >= 85:
        return "Highly Recommended"
    if ats_score >= 70:
        return "Recommended"
    if ats_score >= 50:
        return "Needs Review"
    return "Not Suitable"


def _missing_skills(candidate: models.Candidate) -> List[str]:
    """Skill Gap Analysis (Step 8)."""
    if not candidate.job:
        return []
    required = json.loads(candidate.job.skills_required or "[]")
    extracted = {s.lower() for s in json.loads(candidate.extracted_skills or "[]")}
    return [s for s in required if s.lower() not in extracted]


def _candidate_to_out(c: models.Candidate, is_duplicate: bool = False) -> schemas.CandidateOut:
    tags_list = []
    try:
        if c.tags:
            tags_list = json.loads(c.tags)
    except Exception:
        tags_list = []

    notes_cnt = len(c.notes) if hasattr(c, "notes") and c.notes else 0
    emails_cnt = len(c.email_logs) if hasattr(c, "email_logs") and c.email_logs else 0

    return schemas.CandidateOut(
        id=c.id,
        job_id=c.job_id,
        full_name=c.full_name,
        email=c.email,
        phone=c.phone,
        ats_score=c.ats_score,
        extracted_skills=json.loads(c.extracted_skills or "[]"),
        experience_years=c.experience_years,
        stage=c.stage,
        applied_at=c.applied_at,
        job_title=c.job.title if c.job else None,
        recommendation=_recommendation_label(c.ats_score),
        missing_skills=_missing_skills(c),
        ai_summary=c.ai_summary,
        is_duplicate=is_duplicate,
        source=c.source,
        interview_datetime=c.interview_datetime,
        location=c.location,
        offer_released=c.offer_released or False,
        offer_accepted=c.offer_accepted,
        tags=tags_list,
        notes_count=notes_cnt,
        emails_count=emails_cnt,
    )


@router.post("/apply", response_model=schemas.CandidateOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    job_id: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(None),
    source: str = Form("Direct"),
    location: str = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Public endpoint: a candidate applies to a job and uploads their resume."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != models.JobStatus.published:
        raise HTTPException(status_code=400, detail="This job is not currently accepting applications")

    # Step 9 — Duplicate Candidate Detection
    existing = db.query(models.Candidate).filter(
        models.Candidate.job_id == job_id,
        (models.Candidate.email == email.lower()) | (models.Candidate.phone == phone)
    ).first()
    is_duplicate = existing is not None

    ext = os.path.splitext(resume.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Resume must be a PDF, DOCX, or TXT file")

    contents = await resume.read()
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Resume must be under {MAX_FILE_SIZE_MB}MB")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        resume_text = extract_text(file_path)
    except Exception:
        resume_text = ""

    skills_required = json.loads(job.skills_required or "[]")
    result, engine = score_resume(resume_text, job.description, skills_required)

    initial_tags = ["Referral"] if source and "referral" in source.lower() else []

    candidate = models.Candidate(
        job_id=job.id,
        full_name=full_name,
        email=email.lower(),
        phone=phone,
        resume_path=file_path,
        resume_text=resume_text[:20000],
        ats_score=result["ats_score"],
        extracted_skills=json.dumps(result["extracted_skills"]),
        experience_years=result["experience_years"],
        ai_summary=result.get("summary", ""),
        source=source,
        location=location,
        tags=json.dumps(initial_tags),
        stage=_auto_stage_from_score(result["ats_score"]),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _candidate_to_out(candidate, is_duplicate=is_duplicate)


@router.post("/bulk-apply", response_model=dict)
async def bulk_apply_to_job(
    job_id: str = Form(...),
    source: str = Form("Bulk Upload"),
    resumes: List[UploadFile] = File(...),
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Step 11 — Bulk Screening. A recruiter uploads multiple resumes at
    once (e.g. from a career fair or a batch received over email), and each
    one is parsed, scored, and added to the pipeline automatically - same
    scoring and duplicate-detection logic as a normal application, just
    looped. Recruiter-only, since this bypasses the public apply form."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    skills_required = json.loads(job.skills_required or "[]")
    created, duplicates, failed = [], [], []

    for resume in resumes:
        try:
            ext = os.path.splitext(resume.filename or "")[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                failed.append({"filename": resume.filename, "reason": "Unsupported file type"})
                continue

            contents = await resume.read()
            if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
                failed.append({"filename": resume.filename, "reason": "File too large"})
                continue

            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            safe_filename = f"{uuid.uuid4()}{ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
            with open(file_path, "wb") as f:
                f.write(contents)

            try:
                resume_text = extract_text(file_path)
            except Exception:
                resume_text = ""

            contact = _extract_contact_info(resume_text, resume.filename or "candidate")
            if not contact["email"]:
                failed.append({"filename": resume.filename, "reason": "Could not find an email address in this resume"})
                continue

            existing = db.query(models.Candidate).filter(
                models.Candidate.job_id == job_id,
                models.Candidate.email == contact["email"].lower(),
            ).first()
            if existing:
                duplicates.append({"filename": resume.filename, "email": contact["email"]})
                continue

            result, engine = score_resume(resume_text, job.description, skills_required)
            candidate = models.Candidate(
                job_id=job.id,
                full_name=contact["name"],
                email=contact["email"].lower(),
                phone=contact["phone"],
                resume_path=file_path,
                resume_text=resume_text[:20000],
                ats_score=result["ats_score"],
                extracted_skills=json.dumps(result["extracted_skills"]),
                experience_years=result["experience_years"],
                ai_summary=result.get("summary", ""),
                source=source,
                tags=json.dumps(["Referral"] if source and "referral" in source.lower() else []),
                stage=_auto_stage_from_score(result["ats_score"]),
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)
            created.append({"filename": resume.filename, "name": contact["name"], "ats_score": result["ats_score"]})
        except Exception as e:
            failed.append({"filename": resume.filename, "reason": "Unexpected error processing this file"})

    return {
        "total_uploaded": len(resumes),
        "created": created,
        "duplicates": duplicates,
        "failed": failed,
    }


@router.get("", response_model=List[schemas.CandidateOut])
def list_all_candidates(
    search: str = None,
    min_score: float = None,
    stage: str = None,
    tag: str = None,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """All-candidates view across every job."""
    query = db.query(models.Candidate)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            (models.Candidate.full_name.ilike(like)) | (models.Candidate.email.ilike(like))
        )
    if min_score is not None:
        query = query.filter(models.Candidate.ats_score >= min_score)
    if stage:
        query = query.filter(models.Candidate.stage == stage)
    if tag:
        tag_like = f"%\"{tag.strip()}\"%"
        query = query.filter(models.Candidate.tags.ilike(tag_like))
    candidates = query.order_by(models.Candidate.applied_at.desc()).all()
    return [_candidate_to_out(c) for c in candidates]


@router.get("/job/{job_id}", response_model=List[schemas.CandidateOut])
def list_candidates_for_job(
    job_id: str,
    search: str = None,
    min_score: float = None,
    tag: str = None,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Candidate Ranking Dashboard / Kanban board data source."""
    query = db.query(models.Candidate).filter(models.Candidate.job_id == job_id)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            (models.Candidate.full_name.ilike(like)) | (models.Candidate.email.ilike(like))
        )
    if min_score is not None:
        query = query.filter(models.Candidate.ats_score >= min_score)
    if tag:
        tag_like = f"%\"{tag.strip()}\"%"
        query = query.filter(models.Candidate.tags.ilike(tag_like))

    candidates = query.order_by(models.Candidate.ats_score.desc().nullslast()).all()
    return [_candidate_to_out(c) for c in candidates]


@router.get("/track", response_model=List[schemas.CandidateStatusOut])
def track_applications(
    email: str,
    db: Session = Depends(get_db),
):
    """Public: track application status by email."""
    candidates = (
        db.query(models.Candidate)
        .filter(models.Candidate.email == email.strip().lower())
        .order_by(models.Candidate.applied_at.desc())
        .all()
    )
    if not candidates:
        raise HTTPException(status_code=404, detail="No applications found for that email.")
    return [
        schemas.CandidateStatusOut(
            candidate_id=c.id,
            job_id=c.job_id,
            job_title=c.job.title if c.job else "(job removed)",
            full_name=c.full_name,
            stage=c.stage,
            applied_at=c.applied_at,
        )
        for c in candidates
    ]


@router.post("/{candidate_id}/withdraw", response_model=dict)
def withdraw_application(
    candidate_id: str,
    email: str,
    db: Session = Depends(get_db),
):
    """Public: a candidate can withdraw their own application, verified by
    re-entering the email they applied with (no login system for
    candidates, so this is the same verification pattern as /track).
    Can't withdraw an application already in a final decided state -
    that's the recruiter's call at that point, not something to silently
    undo from the candidate side."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate or candidate.email != email.strip().lower():
        raise HTTPException(status_code=404, detail="Application not found for that email")
    if candidate.stage in (models.CandidateStage.selected, models.CandidateStage.joined):
        raise HTTPException(status_code=400, detail="This application has already been decided and can't be withdrawn")
    candidate.stage = models.CandidateStage.withdrawn
    db.commit()
    return {"message": "Application withdrawn successfully"}


@router.get("/{candidate_id}/interview-questions", response_model=List[str])
def get_interview_questions(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — generates interview questions tailored to this
    candidate's resume + the job, on demand. Nothing is stored; this is
    computed fresh every time the recruiter clicks the button."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = candidate.job
    skills_required = json.loads(job.skills_required or "[]") if job else []
    job_description = job.description if job else ""
    return generate_interview_questions(candidate.resume_text or "", job_description, skills_required)


@router.get("/{candidate_id}/red-flags", response_model=dict)
def get_resume_red_flags(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — AI review flagging potential resume red flags.
    This is a signal for a human to look closer, never an automatic
    rejection. Nothing is stored; computed fresh on each click."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return check_resume_red_flags(candidate.resume_text or "")


@router.get("/{candidate_id}/suggested-offer", response_model=dict)
def get_suggested_offer(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — AI Offer Recommendation, constrained to the job's
    own posted salary range. A starting point for the recruiter, not a
    final decision."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = candidate.job
    if not job or job.salary_min is None or job.salary_max is None:
        raise HTTPException(status_code=400, detail="This job has no salary range set, so an offer can't be suggested")
    return suggest_offer(
        candidate_name=candidate.full_name,
        ats_score=candidate.ats_score or 0,
        experience_years=candidate.experience_years or 0,
        extracted_skills=json.loads(candidate.extracted_skills or "[]"),
        salary_min=job.salary_min,
        salary_max=job.salary_max,
    )


@router.get("/{candidate_id}/ask", response_model=dict)
def ask_candidate_question(
    candidate_id: str,
    question: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — lightweight Recruiter Copilot. Ask a free-text
    question about this specific candidate's resume."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    answer = ask_about_candidate(candidate.resume_text or "", question)
    return {"answer": answer}


@router.get("/{candidate_id}/success-prediction", response_model=dict)
def get_success_prediction(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — a transparent, formula-based fit estimate (not an
    opaque AI call, on purpose - see the function docstring for why)."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job = candidate.job
    required_skills = json.loads(job.skills_required or "[]") if job else []
    missing = _missing_skills(candidate)
    return predict_candidate_success(
        ats_score=candidate.ats_score or 0,
        experience_years=candidate.experience_years or 0,
        experience_min_required=job.experience_min if job else 0,
        missing_skills_count=len(missing),
        total_required_skills=len(required_skills),
    )


@router.get("/{candidate_id}/resume-text", response_model=dict)
def get_resume_text(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Inline resume preview - lets a recruiter skim the parsed resume text
    without downloading the file. Fetched on demand (not included in the
    main candidate list) so the Kanban board stays fast to load."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"resume_text": candidate.resume_text or "No resume text available."}


@router.get("/{candidate_id}/skill-gap-training", response_model=dict)
def get_skill_gap_training(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Extends Skill Gap Analysis (Step 8) with actionable suggestions for
    how a candidate could close their gap - optional feedback, not a
    rejection signal."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    missing = _missing_skills(candidate)
    job_title = candidate.job.title if candidate.job else "this role"
    return suggest_skill_gap_training(candidate.full_name, missing, job_title)


@router.get("/compare", response_model=dict)
def compare_two_candidates(
    candidate_a_id: str,
    candidate_b_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — AI Candidate Comparison. Compares two candidates
    (usually for the same job) and suggests the stronger fit, with a reason."""
    a = db.query(models.Candidate).filter(models.Candidate.id == candidate_a_id).first()
    b = db.query(models.Candidate).filter(models.Candidate.id == candidate_b_id).first()
    if not a or not b:
        raise HTTPException(status_code=404, detail="One or both candidates not found")

    candidate_a = {
        "name": a.full_name, "ats_score": a.ats_score, "experience_years": a.experience_years,
        "skills": json.loads(a.extracted_skills or "[]"), "summary": a.ai_summary,
    }
    candidate_b = {
        "name": b.full_name, "ats_score": b.ats_score, "experience_years": b.experience_years,
        "skills": json.loads(b.extracted_skills or "[]"), "summary": b.ai_summary,
    }
    return compare_candidates(candidate_a, candidate_b)


@router.patch("/{candidate_id}/offer-status", response_model=schemas.CandidateOut)
def update_offer_status(
    candidate_id: str,
    payload: schemas.OfferStatusUpdate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Step 13 — tracks the two counts his HR Dashboard spec listed that
    we hadn't built yet: Offer Released and Offer Accepted."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if payload.offer_released is not None:
        candidate.offer_released = payload.offer_released
    if payload.offer_accepted is not None:
        candidate.offer_accepted = payload.offer_accepted
    db.commit()
    db.refresh(candidate)
    return _candidate_to_out(candidate)


@router.patch("/{candidate_id}/stage", response_model=schemas.CandidateOut)
def update_candidate_stage(
    candidate_id: str,
    payload: schemas.CandidateStageUpdate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Drag-and-drop Kanban stage update."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.stage = payload.stage
    candidate.stage_updated_at = datetime.utcnow()
    if payload.interview_datetime:
        candidate.interview_datetime = payload.interview_datetime
    db.commit()
    db.refresh(candidate)

    # Step 12 — Automatic Email Workflow. Wrapped in try/except on purpose:
    # if email sending fails for any reason, the stage update itself must
    # still succeed - we never want a broken inbox setting to break the app.
    try:
        job_title = candidate.job.title if candidate.job else "this role"
        subject, body, email_type = None, None, None
        if payload.stage == models.CandidateStage.interview_scheduled:
            subject, body = send_interview_invitation_email(candidate.email, candidate.full_name, job_title, candidate.interview_datetime)
            email_type = "interview_invitation"
        elif payload.stage == models.CandidateStage.rejected:
            subject, body = send_rejection_email(candidate.email, candidate.full_name, job_title)
            email_type = "rejection"
        elif payload.stage == models.CandidateStage.under_review:
            subject, body = send_under_review_email(candidate.email, candidate.full_name, job_title)
            email_type = "under_review"

        if subject and body and email_type:
            log_entry = models.CandidateEmailLog(
                candidate_id=candidate.id,
                sender_id=current_user.id if current_user else None,
                recipient_email=candidate.email,
                subject=subject,
                body=body,
                email_type=email_type,
                status="sent",
                sent_at=datetime.utcnow(),
            )
            db.add(log_entry)
            db.commit()
            db.refresh(candidate)
    except Exception:
        pass  # email is a nice-to-have here, never worth failing the request over

    return _candidate_to_out(candidate)


# ---------- Candidate Notes History Endpoints ----------

@router.get("/{candidate_id}/notes", response_model=List[schemas.CandidateNoteOut])
def get_candidate_notes(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieve the running chronological feedback log for a candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    notes = (
        db.query(models.CandidateNote)
        .filter(models.CandidateNote.candidate_id == candidate_id)
        .order_by(models.CandidateNote.created_at.desc())
        .all()
    )
    return [
        schemas.CandidateNoteOut(
            id=n.id,
            candidate_id=n.candidate_id,
            author_id=n.author_id,
            author_name=n.author.name if n.author else "Recruiter",
            author_role=n.author.role if n.author else models.RoleEnum.recruiter,
            content=n.content,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.post("/{candidate_id}/notes", response_model=schemas.CandidateNoteOut, status_code=status.HTTP_201_CREATED)
def add_candidate_note(
    candidate_id: str,
    payload: schemas.CandidateNoteCreate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Add a timestamped feedback note to the candidate's running log."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Note content cannot be empty")

    note = models.CandidateNote(
        candidate_id=candidate_id,
        author_id=current_user.id,
        content=content,
        created_at=datetime.utcnow(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return schemas.CandidateNoteOut(
        id=note.id,
        candidate_id=note.candidate_id,
        author_id=note.author_id,
        author_name=current_user.name,
        author_role=current_user.role,
        content=note.content,
        created_at=note.created_at,
    )


@router.delete("/{candidate_id}/notes/{note_id}", response_model=dict)
def delete_candidate_note(
    candidate_id: str,
    note_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Delete a note from the candidate's feedback log."""
    note = db.query(models.CandidateNote).filter(
        models.CandidateNote.id == note_id,
        models.CandidateNote.candidate_id == candidate_id
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Allow super_admin, hr_manager, or the note's original author to delete
    if current_user.role not in (models.RoleEnum.super_admin, models.RoleEnum.hr_manager) and note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this note")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}


# ---------- Candidate Tagging / Labels Endpoints ----------

@router.post("/{candidate_id}/tags", response_model=schemas.CandidateOut)
def add_candidate_tag(
    candidate_id: str,
    payload: schemas.CandidateTagAdd,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Add a custom label/tag to a candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    tag = payload.tag.strip()
    if not tag:
        raise HTTPException(status_code=400, detail="Tag cannot be empty")

    existing_tags = []
    try:
        if candidate.tags:
            existing_tags = json.loads(candidate.tags)
    except Exception:
        existing_tags = []

    if not any(t.lower() == tag.lower() for t in existing_tags):
        existing_tags.append(tag)
        candidate.tags = json.dumps(existing_tags)
        db.commit()
        db.refresh(candidate)

    return _candidate_to_out(candidate)


@router.delete("/{candidate_id}/tags/{tag}", response_model=schemas.CandidateOut)
def remove_candidate_tag(
    candidate_id: str,
    tag: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Remove a custom label/tag from a candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    existing_tags = []
    try:
        if candidate.tags:
            existing_tags = json.loads(candidate.tags)
    except Exception:
        existing_tags = []

    updated_tags = [t for t in existing_tags if t.lower() != tag.strip().lower()]
    candidate.tags = json.dumps(updated_tags)
    db.commit()
    db.refresh(candidate)

    return _candidate_to_out(candidate)


@router.put("/{candidate_id}/tags", response_model=schemas.CandidateOut)
def update_candidate_tags(
    candidate_id: str,
    payload: schemas.CandidateTagsUpdate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Replace candidate's full list of tags."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    clean_tags = []
    seen = set()
    for t in payload.tags:
        cleaned = t.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            clean_tags.append(cleaned)

    candidate.tags = json.dumps(clean_tags)
    db.commit()
    db.refresh(candidate)

    return _candidate_to_out(candidate)


# ---------- Candidate Email History Log Endpoints ----------

@router.get("/{candidate_id}/emails", response_model=List[schemas.CandidateEmailLogOut])
def get_candidate_email_history(
    candidate_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Retrieve the chronological sent email history log for a candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    email_logs = (
        db.query(models.CandidateEmailLog)
        .filter(models.CandidateEmailLog.candidate_id == candidate_id)
        .order_by(models.CandidateEmailLog.sent_at.desc())
        .all()
    )
    return [
        schemas.CandidateEmailLogOut(
            id=log.id,
            candidate_id=log.candidate_id,
            sender_id=log.sender_id,
            sender_name=log.sender.name if log.sender else "System Automated",
            sender_role=log.sender.role if log.sender else None,
            recipient_email=log.recipient_email,
            subject=log.subject,
            body=log.body,
            email_type=log.email_type,
            status=log.status or "sent",
            sent_at=log.sent_at,
        )
        for log in email_logs
    ]


@router.post("/{candidate_id}/emails", response_model=schemas.CandidateEmailLogOut, status_code=status.HTTP_201_CREATED)
def send_candidate_email(
    candidate_id: str,
    payload: schemas.CandidateEmailCreate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Send a custom or templated email directly to the candidate and record it in the history log."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    subject = payload.subject.strip()
    body = payload.body.strip()
    if not subject:
        raise HTTPException(status_code=400, detail="Email subject cannot be empty")
    if not body:
        raise HTTPException(status_code=400, detail="Email body cannot be empty")

    try:
        send_email(candidate.email, subject, body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to deliver email: {str(exc)}")

    log_entry = models.CandidateEmailLog(
        candidate_id=candidate.id,
        sender_id=current_user.id,
        recipient_email=candidate.email,
        subject=subject,
        body=body,
        email_type=payload.email_type or "custom",
        status="sent",
        sent_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return schemas.CandidateEmailLogOut(
        id=log_entry.id,
        candidate_id=log_entry.candidate_id,
        sender_id=log_entry.sender_id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        recipient_email=log_entry.recipient_email,
        subject=log_entry.subject,
        body=log_entry.body,
        email_type=log_entry.email_type,
        status=log_entry.status or "sent",
        sent_at=log_entry.sent_at,
    )