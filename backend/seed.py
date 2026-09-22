"""
Optional helper: creates one demo user per role so you can log in and see
every role-based dashboard immediately, without registering manually.

Run with:  python seed.py
"""
from app.database import Base, engine, SessionLocal
from app import models
from app.security import hash_password

Base.metadata.create_all(bind=engine)

DEMO_USERS = [
    ("Aarav Shah", "admin@b2world.demo", "super_admin"),
    ("Priya Mehta", "hr@b2world.demo", "hr_manager"),
    ("Rohan Verma", "recruiter@b2world.demo", "recruiter"),
    ("Ishaan Rao", "pm@b2world.demo", "project_manager"),
    ("Ananya Iyer", "lead@b2world.demo", "team_lead"),
    ("Dev Kapoor", "dev@b2world.demo", "developer"),
]
DEMO_PASSWORD = "Demo@1234"

db = SessionLocal()
try:
    for name, email, role in DEMO_USERS:
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            print(f"Skipping user (already exists): {email}")
            continue
        user = models.User(
            name=name,
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            role=role,
        )
        db.add(user)
        print(f"Created user: {email} / {DEMO_PASSWORD}  (role: {role})")
    db.commit()

    # Seed Sample Jobs if none exist
    admin_user = db.query(models.User).filter(models.User.email == "admin@b2world.demo").first()
    if db.query(models.Job).count() == 0 and admin_user:
        import json
        sample_jobs = [
            models.Job(
                title="Senior AI / ML Engineer",
                description="Looking for an experienced AI engineer skilled in LLMs, Gemini/OpenAI APIs, PyTorch, LangChain, and high-performance FastAPI backends.",
                skills_required=json.dumps(["Python", "Machine Learning", "LLMs", "FastAPI", "PyTorch", "Prompt Engineering"]),
                experience_min=4,
                salary_min=140000,
                salary_max=190000,
                status=models.JobStatus.published,
                created_by=admin_user.id,
                views_count=42,
            ),
            models.Job(
                title="Full Stack React & Node Developer",
                description="Seeking a versatile full-stack engineer proficient in React, Tailwind CSS, TypeScript, modern REST/GraphQL APIs, and cloud deployments.",
                skills_required=json.dumps(["React", "TypeScript", "Node.js", "REST APIs", "Tailwind CSS", "Docker"]),
                experience_min=3,
                salary_min=110000,
                salary_max=155000,
                status=models.JobStatus.published,
                created_by=admin_user.id,
                views_count=28,
            ),
            models.Job(
                title="Technical Product Manager - ATS & AI",
                description="Lead the roadmap for next-generation recruitment intelligence and talent analytics. Strong background in agile delivery and ATS platforms required.",
                skills_required=json.dumps(["Product Management", "Agile", "Roadmap Planning", "User Research", "Data Analytics"]),
                experience_min=5,
                salary_min=130000,
                salary_max=175000,
                status=models.JobStatus.published,
                created_by=admin_user.id,
                views_count=19,
            ),
        ]
        for j in sample_jobs:
            db.add(j)
        db.commit()
        print(f"Seeded {len(sample_jobs)} published demo jobs.")

        # Seed sample candidates for the AI role
        ai_job = db.query(models.Job).filter(models.Job.title == "Senior AI / ML Engineer").first()
        if ai_job:
            demo_candidates = [
                models.Candidate(
                    job_id=ai_job.id,
                    full_name="Priya Mehta",
                    email="priya.talent@example.com",
                    phone="+1 (555) 234-5678",
                    ats_score=88.5,
                    stage=models.CandidateStage.shortlisted,
                    experience_years=5.5,
                    source="Direct",
                    extracted_skills=json.dumps(["Python", "LLMs", "PyTorch", "FastAPI", "Docker"]),
                    ai_summary="Exceptional AI and machine learning background. 5+ years specializing in generative AI agent architectures and distributed backends. Top 5% ATS score match.",
                    tags=json.dumps(["Top Talent", "Referral", "Strong culture fit"]),
                ),
                models.Candidate(
                    job_id=ai_job.id,
                    full_name="Arjun Patel",
                    email="arjun.patel@example.com",
                    phone="+1 (555) 876-5432",
                    ats_score=74.0,
                    stage=models.CandidateStage.screened,
                    experience_years=4.0,
                    source="LinkedIn",
                    extracted_skills=json.dumps(["Python", "Machine Learning", "FastAPI", "SQL"]),
                    ai_summary="Strong software engineering fundamentals with relevant NLP and LLM project experience. Meets all core criteria.",
                    tags=json.dumps(["Follow up", "Remote"]),
                ),
                models.Candidate(
                    job_id=ai_job.id,
                    full_name="Vikram Seth",
                    email="vikram.seth@example.com",
                    phone="+1 (555) 345-6789",
                    ats_score=52.0,
                    stage=models.CandidateStage.rejected,
                    experience_years=1.5,
                    source="Indeed",
                    extracted_skills=json.dumps(["HTML", "CSS", "Basic Python"]),
                    ai_summary="Candidate lacks senior ML/AI system architecture experience required for this role. ATS score below minimum threshold.",
                    tags=json.dumps(["Needs Review"]),
                ),
            ]
            for c in demo_candidates:
                db.add(c)
            db.commit()
            print(f"Seeded {len(demo_candidates)} candidates across automated ATS pipeline stages.")

    # Seed Candidate Feedback Notes (Running Log demonstration)
    recruiter = db.query(models.User).filter(models.User.email == "recruiter@b2world.demo").first()
    hr_mgr = db.query(models.User).filter(models.User.email == "hr@b2world.demo").first()
    lead = db.query(models.User).filter(models.User.email == "lead@b2world.demo").first()

    candidates = db.query(models.Candidate).all()
    if candidates and recruiter and hr_mgr and lead:
        priya = next((c for c in candidates if "priya" in c.email.lower() or "priya" in c.full_name.lower()), candidates[0])
        if priya:
            existing_notes = db.query(models.CandidateNote).filter(models.CandidateNote.candidate_id == priya.id).count()
            if existing_notes < 3:
                sample_notes = [
                    (recruiter.id, "Initial Phone Screen: Candidate has strong background in deep learning & LLMs with 5 years experience. Clear communication and enthusiastic about the role. Recommended moving to Technical Round 1."),
                    (lead.id, "Technical Round 1: Exceptional coding evaluation. Handled system design for distributed vector search and FastAPI caching cleanly. Strong hire recommendation."),
                    (hr_mgr.id, "HR & Cultural Assessment: Great culture fit and team alignment. Discussed compensation expectations and standard 30-day notice period. Approved for Offer stage."),
                ]
                for author_id, content in sample_notes:
                    note = models.CandidateNote(
                        candidate_id=priya.id,
                        author_id=author_id,
                        content=content,
                    )
                    db.add(note)
                print(f"Seeded {len(sample_notes)} feedback notes for candidate {priya.full_name}")

        # Seed Candidate Custom Tags / Labels
        sample_tag_sets = [
            ["Referral", "Top Talent", "Strong culture fit"],
            ["Follow up", "Remote"],
            ["Urgent", "Needs Review"],
            ["Referral", "Offer Candidate"],
            ["Follow up", "Top Talent"],
            ["Needs Review", "Remote"],
        ]

        for idx, cand in enumerate(candidates):
            if not cand.tags or cand.tags == "[]":
                import json
                assigned_tags = sample_tag_sets[idx % len(sample_tag_sets)]
                cand.tags = json.dumps(assigned_tags)
        # Seed Candidate Email History Logs (Visible Record demonstration)
        existing_email_logs = db.query(models.CandidateEmailLog).count()
        if existing_email_logs == 0 and len(candidates) > 0:
            sample_emails = [
                (
                    priya.id,
                    None,
                    priya.email,
                    f"You've been shortlisted for {priya.job.title if priya.job else 'Senior AI Engineer'} at B2World!",
                    f"Hi {priya.full_name},\n\nGreat news — based on our initial screening, you've been shortlisted for the {priya.job.title if priya.job else 'Senior AI Engineer'} role at B2World. Your interview is scheduled for Friday, Oct 24 at 02:30 PM. We'll send calendar details shortly.\n\nCongratulations, and we look forward to speaking with you!",
                    "interview_invitation",
                    "sent",
                ),
                (
                    priya.id,
                    recruiter.id,
                    priya.email,
                    f"Next Steps & Technical Architecture Assessment — B2World",
                    f"Hi {priya.full_name},\n\nThanks again for taking the time to speak with our team during the initial screen. As discussed, we are excited to move forward with your technical evaluation.\n\nPlease review the attached architecture brief beforehand. Feel free to reply directly to this email if you have any questions.\n\nBest regards,\nRohan Verma\nRecruitment Team | B2World",
                    "custom",
                    "sent",
                ),
                (
                    priya.id,
                    hr_mgr.id,
                    priya.email,
                    f"Offer Discussion & Benefits Overview — {priya.job.title if priya.job else 'Senior AI Engineer'}",
                    f"Dear {priya.full_name},\n\nFollowing your outstanding performance in the technical and leadership rounds, the hiring committee has approved your selection for the {priya.job.title if priya.job else 'Senior AI Engineer'} position.\n\nWe would love to schedule a quick 15-minute call to discuss your compensation package, health benefits, and joining date.\n\nWarm regards,\nPriya Mehta\nHead of HR | B2World",
                    "offer_letter",
                    "sent",
                ),
            ]

            # Seed an under-review and a custom email for other candidates if available
            if len(candidates) > 1:
                cand2 = candidates[1]
                sample_emails.append((
                    cand2.id,
                    None,
                    cand2.email,
                    f"Your application for {cand2.job.title if cand2.job else 'Full Stack Engineer'} is under review",
                    f"Hi {cand2.full_name},\n\nJust a quick update — your application for {cand2.job.title if cand2.job else 'Full Stack Engineer'} at B2World is currently under review by our hiring team. We'll be in touch as soon as there's a decision.\n\nThanks for your patience!\n\nHiring Team | B2World",
                    "under_review",
                    "sent",
                ))

            if len(candidates) > 2:
                cand3 = candidates[2]
                sample_emails.append((
                    cand3.id,
                    recruiter.id,
                    cand3.email,
                    f"B2World Application — Portfolio & Project Link Request",
                    f"Hi {cand3.full_name},\n\nWe were impressed by your resume submitted for the {cand3.job.title if cand3.job else 'Software Engineer'} role. Could you please share links to any public GitHub repositories or deployed projects you've worked on recently?\n\nLooking forward to hearing from you.\n\nBest,\nRohan Verma",
                    "custom",
                    "sent",
                ))

            for cand_id, sender_id, to_email, subject, body, email_type, stat in sample_emails:
                email_log = models.CandidateEmailLog(
                    candidate_id=cand_id,
                    sender_id=sender_id,
                    recipient_email=to_email,
                    subject=subject,
                    body=body,
                    email_type=email_type,
                    status=stat,
                )
                db.add(email_log)
            print(f"Seeded {len(sample_emails)} sample email history logs across candidates.")

        db.commit()
finally:
    db.close()

print("\nDone. All demo accounts use the password: Demo@1234")

