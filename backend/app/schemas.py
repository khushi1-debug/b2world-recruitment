from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import RoleEnum, JobStatus, CandidateStage


# ---------- Auth ----------

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: RoleEnum = RoleEnum.candidate

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: RoleEnum
    created_at: datetime

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()


# ---------- Jobs ----------

class JobCreate(BaseModel):
    title: str
    description: str
    skills_required: List[str] = []
    experience_min: int = 0
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    status: JobStatus = JobStatus.draft
    expires_at: Optional[datetime] = None


class JobDescriptionDraftRequest(BaseModel):
    title: str
    skills_required: List[str] = []
    experience_min: int = 0


class JobOut(BaseModel):
    id: str
    title: str
    description: str
    skills_required: List[str]
    experience_min: int
    salary_min: Optional[int]
    salary_max: Optional[int]
    status: JobStatus
    expires_at: Optional[datetime] = None
    views_count: int = 0
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Candidates ----------

class CandidateApply(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class CandidateOut(BaseModel):
    id: str
    job_id: str
    full_name: str
    email: EmailStr
    phone: Optional[str]
    ats_score: Optional[float]
    extracted_skills: List[str]
    experience_years: Optional[float]
    stage: CandidateStage
    applied_at: datetime
    job_title: Optional[str] = None
    recommendation: Optional[str] = None
    missing_skills: List[str] = []
    ai_summary: Optional[str] = None
    is_duplicate: bool = False
    source: Optional[str] = None
    interview_datetime: Optional[datetime] = None
    location: Optional[str] = None
    offer_released: bool = False
    offer_accepted: Optional[bool] = None
    tags: List[str] = []
    notes_count: int = 0
    emails_count: int = 0

    class Config:
        from_attributes = True


class CandidateStageUpdate(BaseModel):
    stage: CandidateStage
    interview_datetime: Optional[datetime] = None


class OfferStatusUpdate(BaseModel):
    offer_released: Optional[bool] = None
    offer_accepted: Optional[bool] = None


# ---------- Candidate Notes ----------

class CandidateNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CandidateNoteOut(BaseModel):
    id: str
    candidate_id: str
    author_id: str
    author_name: str
    author_role: RoleEnum
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Candidate Email History Logs ----------

class CandidateEmailCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=10000)
    email_type: str = "custom"


class CandidateEmailLogOut(BaseModel):
    id: str
    candidate_id: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = "System Automated"
    sender_role: Optional[RoleEnum] = None
    recipient_email: str
    subject: str
    body: str
    email_type: str
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True


# ---------- Candidate Tags ----------

class CandidateTagAdd(BaseModel):
    tag: str = Field(min_length=1, max_length=50)


class CandidateTagsUpdate(BaseModel):
    tags: List[str] = []


class CandidateStatusOut(BaseModel):
    """Public-safe subset for the 'track my application' lookup - deliberately
    excludes phone/resume_text/extracted_skills/ats_score so a stranger with
    just an email can't pull a candidate's full profile or internal scoring."""
    candidate_id: str
    job_id: str
    job_title: str
    full_name: str
    stage: CandidateStage
    applied_at: datetime

    class Config:
        from_attributes = True