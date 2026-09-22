import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Text, DateTime, ForeignKey, Enum, Boolean
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    hr_manager = "hr_manager"
    recruiter = "recruiter"
    project_manager = "project_manager"
    team_lead = "team_lead"
    developer = "developer"
    candidate = "candidate"


class JobStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"


class CandidateStage(str, enum.Enum):
    applied = "applied"
    under_review = "under_review"
    screened = "screened"
    shortlisted = "shortlisted"
    interview_scheduled = "interview_scheduled"
    technical_round = "technical_round"
    hr_round = "hr_round"
    selected = "selected"
    rejected = "rejected"
    joined = "joined"
    withdrawn = "withdrawn"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.candidate)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs_created = relationship("Job", back_populates="creator")
    candidate_profile = relationship("Candidate", back_populates="user", uselist=False)
    notes_authored = relationship("CandidateNote", back_populates="author")
    reset_tokens = relationship("PasswordResetToken", back_populates="user")
    email_logs_sent = relationship("CandidateEmailLog", back_populates="sender")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reset_tokens")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    skills_required = Column(Text, default="[]")  # JSON-encoded list
    experience_min = Column(Integer, default=0)
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.draft)
    expires_at = Column(DateTime, nullable=True)
    views_count = Column(Integer, default=0, nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="jobs_created")
    candidates = relationship("Candidate", back_populates="job")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)

    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    resume_path = Column(String, nullable=True)
    resume_text = Column(Text, nullable=True)
    ats_score = Column(Float, nullable=True)
    extracted_skills = Column(Text, default="[]")  # JSON-encoded list
    experience_years = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)
    source = Column(String, nullable=True, default="Direct")
    tags = Column(Text, default="[]")  # JSON-encoded list of custom tag labels

    stage = Column(Enum(CandidateStage), default=CandidateStage.applied)

    voice_call_transcript = Column(Text, nullable=True)
    communication_score = Column(Float, nullable=True)

    applied_at = Column(DateTime, default=datetime.utcnow)
    stage_updated_at = Column(DateTime, default=datetime.utcnow)
    interview_datetime = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    offer_released = Column(Boolean, default=False)
    offer_accepted = Column(Boolean, nullable=True)  # None = not yet responded, True/False once known

    user = relationship("User", back_populates="candidate_profile")
    job = relationship("Job", back_populates="candidates")
    notes = relationship("CandidateNote", back_populates="candidate", cascade="all, delete-orphan", order_by="desc(CandidateNote.created_at)")
    email_logs = relationship("CandidateEmailLog", back_populates="candidate", cascade="all, delete-orphan", order_by="desc(CandidateEmailLog.sent_at)")


class CandidateNote(Base):
    __tablename__ = "candidate_notes"

    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="notes")
    author = relationship("User", back_populates="notes_authored")


class CandidateEmailLog(Base):
    __tablename__ = "candidate_email_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True)  # Null if automated by system
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    email_type = Column(String, nullable=False, default="custom")  # interview_invitation, rejection, under_review, custom, status_update, offer_letter
    status = Column(String, default="sent")  # sent, delivered, failed
    sent_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="email_logs")
    sender = relationship("User", back_populates="email_logs_sent")