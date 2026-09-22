from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, require_roles
from app.utils.ai_screening import generate_skill_assessment, check_job_description_bias, suggest_unbiased_rewrite, generate_job_description

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

HIRING_ROLES = ("super_admin", "hr_manager", "recruiter")


def _job_to_out(job: models.Job) -> schemas.JobOut:
    return schemas.JobOut(
        id=job.id,
        title=job.title,
        description=job.description,
        skills_required=json.loads(job.skills_required or "[]"),
        experience_min=job.experience_min,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        status=job.status,
        expires_at=job.expires_at,
        views_count=job.views_count or 0,
        created_by=job.created_by,
        created_by_name=job.creator.name if job.creator else None,
        created_at=job.created_at,
    )


@router.get("", response_model=List[schemas.JobOut])
def list_jobs(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Public endpoint - anyone can browse published active jobs (excluding expired jobs)."""
    query = db.query(models.Job)
    if status_filter:
        query = query.filter(models.Job.status == status_filter)
    else:
        query = query.filter(models.Job.status == models.JobStatus.published)

    # Hide jobs past their expiry date from the public list
    now = datetime.utcnow()
    query = query.filter(
        (models.Job.expires_at == None) | (models.Job.expires_at >= now)
    )

    jobs = query.order_by(models.Job.created_at.desc()).all()
    return [_job_to_out(j) for j in jobs]


@router.get("/mine", response_model=List[schemas.JobOut])
def list_my_jobs(
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """All jobs visible to the hiring team (org-wide view)."""
    jobs = db.query(models.Job).order_by(models.Job.created_at.desc()).all()
    return [_job_to_out(j) for j in jobs]


@router.get("/{job_id}", response_model=schemas.JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get a single job by ID and increment its view counter."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Increment view count by 1 each time someone opens the job detail page
    job.views_count = (job.views_count or 0) + 1
    db.commit()
    db.refresh(job)
    return _job_to_out(job)


@router.post("/generate-description", response_model=dict)
def generate_description_draft(
    payload: schemas.JobDescriptionDraftRequest,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
):
    """Helps with Step 1 — drafts a job description from title + skills,
    for the recruiter to review and edit before posting."""
    return generate_job_description(payload.title, payload.skills_required, payload.experience_min)


@router.post("", response_model=schemas.JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    job: schemas.JobCreate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Create a new job posting."""
    db_job = models.Job(
        title=job.title,
        description=job.description,
        skills_required=json.dumps(job.skills_required),
        experience_min=job.experience_min,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        status=job.status,
        expires_at=job.expires_at,
        views_count=0,
        created_by=current_user.id,
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return _job_to_out(db_job)


@router.patch("/{job_id}", response_model=schemas.JobOut)
def update_job(
    job_id: str,
    payload: schemas.JobCreate,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Update a job posting."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != current_user.id and current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="You can only edit jobs you created")

    job.title = payload.title
    job.description = payload.description
    job.skills_required = json.dumps(payload.skills_required)
    job.experience_min = payload.experience_min
    job.salary_min = payload.salary_min
    job.salary_max = payload.salary_max
    job.status = payload.status
    job.expires_at = payload.expires_at
    db.commit()
    db.refresh(job)
    return _job_to_out(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != current_user.id and current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="You can only delete jobs you created")
    db.delete(job)
    db.commit()
    return None


@router.get("/{job_id}/bias-check", response_model=dict)
def get_bias_check(
    job_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — checks the job description itself for
    exclusionary/biased language before candidates ever see it."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return check_job_description_bias(job.description)


@router.get("/{job_id}/bias-rewrite", response_model=dict)
def get_bias_rewrite(
    job_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Companion to bias-check — suggests a rewritten description with the
    flagged phrases removed. Runs the bias check itself first, then rewrites."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    bias_result = check_job_description_bias(job.description)
    return suggest_unbiased_rewrite(job.description, bias_result["flags"])


@router.get("/{job_id}/skill-assessment", response_model=List[dict])
def get_skill_assessment(
    job_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Bonus AI feature — generates a technical MCQ screening test for this
    job's required skills. Not tied to any one candidate; generated once
    per job and reusable for every applicant."""
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    skills_required = json.loads(job.skills_required or "[]")
    return generate_skill_assessment(job.title, job.description, skills_required)


@router.get("/{job_id}/analytics", response_model=dict)
def get_job_analytics(
    job_id: str,
    current_user: models.User = Depends(require_roles(*HIRING_ROLES)),
    db: Session = Depends(get_db),
):
    """Step 13 — HR Analytics: stats on this job's candidates."""
    candidates = db.query(models.Candidate).filter(models.Candidate.job_id == job_id).all()
    
    if not candidates:
        return {
            "total_applications": 0,
            "avg_ats_score": 0,
            "most_common_skills": [],
            "experience_distribution": {"0-2": 0, "2-5": 0, "5-10": 0, "10+": 0},
            "funnel_by_stage": {},
            "source_breakdown": {},
            "avg_time_to_hire_days": None,
            "location_breakdown": {},
            "offer_released_count": 0,
            "offer_accepted_count": 0,
        }

    # Total applications
    total = len(candidates)

    # Average ATS score
    scores = [c.ats_score for c in candidates if c.ats_score]
    avg_score = sum(scores) / len(scores) if scores else 0

    # Most common skills
    skill_count = {}
    for c in candidates:
        skills = json.loads(c.extracted_skills or "[]")
        for skill in skills:
            skill_count[skill] = skill_count.get(skill, 0) + 1
    most_common = sorted(skill_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_skills = [{"skill": s[0], "count": s[1]} for s in most_common]

    # Experience distribution
    exp_dist = {"0-2": 0, "2-5": 0, "5-10": 0, "10+": 0}
    for c in candidates:
        if c.experience_years:
            if c.experience_years < 2:
                exp_dist["0-2"] += 1
            elif c.experience_years < 5:
                exp_dist["2-5"] += 1
            elif c.experience_years < 10:
                exp_dist["5-10"] += 1
            else:
                exp_dist["10+"] += 1

    # Funnel by stage
    funnel = {}
    for stage in models.CandidateStage:
        count = len([c for c in candidates if c.stage == stage.value])
        if count > 0:
            funnel[stage.value] = count

    # Step 14 (partial) — Source of Application breakdown
    source_count = {}
    for c_ in candidates:
        src = c_.source or "Direct"
        source_count[src] = source_count.get(src, 0) + 1

    # Step 14 (partial) — Time-to-Hire: for candidates who reached Selected or
    # Joined, how many days from applying to that final decision. Uses
    # stage_updated_at (last time their stage changed) as the "hired" moment.
    hire_days = []
    for c_ in candidates:
        if c_.stage in (models.CandidateStage.selected, models.CandidateStage.joined):
            if c_.stage_updated_at and c_.applied_at:
                delta = (c_.stage_updated_at - c_.applied_at).total_seconds() / 86400
                hire_days.append(max(delta, 0))
    avg_time_to_hire = round(sum(hire_days) / len(hire_days), 1) if hire_days else None

    # Step 14 (partial) — Candidate Location breakdown (simplified "heatmap":
    # a count per location string, rather than actual map coordinates)
    location_count = {}
    for c_ in candidates:
        if c_.location:
            location_count[c_.location] = location_count.get(c_.location, 0) + 1

    offer_released_count = len([c_ for c_ in candidates if c_.offer_released])
    offer_accepted_count = len([c_ for c_ in candidates if c_.offer_accepted])

    return {
        "total_applications": total,
        "avg_ats_score": round(avg_score, 1),
        "most_common_skills": most_common_skills,
        "experience_distribution": exp_dist,
        "funnel_by_stage": funnel,
        "source_breakdown": source_count,
        "avg_time_to_hire_days": avg_time_to_hire,
        "location_breakdown": location_count,
        "offer_released_count": offer_released_count,
        "offer_accepted_count": offer_accepted_count,
    }