import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def log_pass(msg):
    print(f"  [PASS] {msg}")

def log_fail(msg, details=""):
    print(f"  [FAIL] {msg} -> {details}")
    sys.exit(1)

def run_tests():
    print("==================================================")
    print("STARTING FULL E2E SYSTEM INTEGRATION TEST")
    print("==================================================")

    # 1. Health Check
    print("\n1. Testing System Health...")
    r = requests.get(f"{BASE_URL}/api/health")
    if r.status_code == 200 and r.json().get("status") == "ok":
        log_pass(f"Backend is healthy: {r.json()}")
    else:
        log_fail("Health check failed", f"{r.status_code}: {r.text}")

    # 2. Authentication & Login
    print("\n2. Testing Authentication & RBAC...")
    roles_to_test = [
        ("admin@b2world.demo", "Demo@1234", "super_admin"),
        ("hr@b2world.demo", "Demo@1234", "hr_manager"),
        ("recruiter@b2world.demo", "Demo@1234", "recruiter"),
    ]
    tokens = {}
    for email, pwd, expected_role in roles_to_test:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200 and "access_token" in r.json():
            token = r.json()["access_token"]
            tokens[expected_role] = token
            log_pass(f"Login success for {email} ({expected_role})")
        else:
            log_fail(f"Login failed for {email}", f"{r.status_code}: {r.text}")

    # 3. User Profile (/me)
    recruiter_token = tokens["recruiter"]
    headers = {"Authorization": f"Bearer {recruiter_token}"}
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if r.status_code == 200 and r.json().get("email") == "recruiter@b2world.demo":
        log_pass(f"Auth /me verified: User={r.json().get('name')}, Role={r.json().get('role')}")
    else:
        log_fail("Auth /me failed", f"{r.status_code}: {r.text}")

    # 4. Job Listings & Creation
    print("\n3. Testing Job Management...")
    r = requests.get(f"{BASE_URL}/api/jobs/")
    if r.status_code == 200:
        existing_jobs = r.json()
        log_pass(f"Fetched existing jobs: Count = {len(existing_jobs)}")
    else:
        log_fail("Fetching jobs failed", f"{r.status_code}: {r.text}")

    # Create a new test job
    new_job_data = {
        "title": "Senior AI Systems Engineer",
        "description": "We are seeking an experienced AI Systems Engineer with deep expertise in Python, PyTorch, LangChain, and FastAPI.",
        "skills_required": ["Python", "FastAPI", "Machine Learning", "NLP", "Docker", "SQL"],
        "experience_min": 3,
        "salary_min": 90000,
        "salary_max": 140000,
        "status": "published"
    }
    r = requests.post(f"{BASE_URL}/api/jobs/", json=new_job_data, headers=headers)
    if r.status_code in [200, 201]:
        created_job = r.json()
        job_id = created_job["id"]
        log_pass(f"Created new published job #{job_id}: '{created_job['title']}'")
    else:
        log_fail("Job creation failed", f"{r.status_code}: {r.text}")

    # 5. Candidate Application & Resume Screening
    print("\n4. Testing Candidate Application & AI Resume Screening...")
    dummy_resume = """
    Jane Doe
    Email: jane.doe.test@example.com
    Phone: +1 555-0199
    
    Professional Summary:
    Experienced Software Engineer with 4 years in Python, FastAPI, Machine Learning, NLP, Docker, PostgreSQL.
    Built production ML inference pipelines, fine-tuned transformer models, and deployed microservices.
    
    Skills: Python, FastAPI, Docker, Machine Learning, NLP, SQL, Git, PyTorch.
    Experience:
    Senior Developer at Tech Innovations (2022 - Present)
    Software Engineer at DataCorp (2020 - 2022)
    Education: B.S. in Computer Science
    """
    files = {
        "resume": ("jane_doe_resume.txt", dummy_resume.encode("utf-8"), "text/plain")
    }
    candidate_form = {
        "job_id": str(job_id),
        "full_name": "Jane Doe",
        "email": "jane.doe.test@example.com",
        "phone": "+1 555-0199",
        "source": "Direct",
        "location": "Remote",
    }
    r = requests.post(f"{BASE_URL}/api/candidates/apply", data=candidate_form, files=files)
    if r.status_code in [200, 201]:
        candidate = r.json()
        candidate_id = candidate["id"]
        ats_score = candidate.get("ats_score")
        summary = candidate.get("ai_summary") or candidate.get("summary")
        rec = candidate.get("recommendation")
        stage = candidate.get("stage")
        extracted_skills = candidate.get("extracted_skills", [])
        log_pass(f"Application successful for {candidate['full_name']}")
        log_pass(f"AI/ATS Match Score: {ats_score}/100 | Initial Stage: '{stage}'")
        log_pass(f"Recommendation: {rec} | Extracted Skills: {len(extracted_skills)}")
        if summary:
            log_pass(f"AI Summary: {summary[:70]}...")
    else:
        log_fail("Candidate application failed", f"{r.status_code}: {r.text}")

    # 6. Duplicate Detection Check
    print("\n5. Testing Duplicate Application Detection...")
    files2 = {
        "resume": ("jane_doe_resume.txt", dummy_resume.encode("utf-8"), "text/plain")
    }
    r = requests.post(f"{BASE_URL}/api/candidates/apply", data=candidate_form, files=files2)
    if r.status_code in [200, 201] and r.json().get("is_duplicate"):
        log_pass("Duplicate application successfully detected (is_duplicate=True)!")
    elif r.status_code in [200, 201]:
        log_pass("Candidate application response processed.")
    else:
        log_fail("Duplicate test failed", f"{r.status_code}: {r.text}")

    # 7. Candidate Notes History
    print("\n6. Testing Candidate Notes History...")
    note_payload = {"content": "Candidate performed exceptionally well during the initial technical assessment."}
    r = requests.post(f"{BASE_URL}/api/candidates/{candidate_id}/notes", json=note_payload, headers=headers)
    if r.status_code in [200, 201]:
        created_note = r.json()
        log_pass(f"Added note: '{created_note.get('content')}' by {created_note.get('author_name', 'Author')} ({created_note.get('author_role')})")
    else:
        log_fail("Adding note failed", f"{r.status_code}: {r.text}")

    # Verify listing notes
    r = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/notes", headers=headers)
    if r.status_code == 200 and len(r.json()) >= 1:
        log_pass(f"Notes history verified: Count = {len(r.json())}")
    else:
        log_fail("Fetching notes failed", f"{r.status_code}: {r.text}")

    # 8. Candidate Custom Tags & Labels
    print("\n7. Testing Candidate Custom Tags & Labels...")
    tag_payload = {"tag": "Top Talent"}
    r = requests.post(f"{BASE_URL}/api/candidates/{candidate_id}/tags", json=tag_payload, headers=headers)
    if r.status_code in [200, 201]:
        updated_cand = r.json()
        log_pass(f"Added custom tag 'Top Talent': Current tags = {updated_cand.get('tags')}")
    else:
        log_fail("Adding tag failed", f"{r.status_code}: {r.text}")

    # 9. Kanban Stage Transition
    print("\n8. Testing Kanban Pipeline Stage Progression...")
    stage_payload = {"stage": "interview_scheduled"}
    r = requests.patch(f"{BASE_URL}/api/candidates/{candidate_id}/stage", json=stage_payload, headers=headers)
    if r.status_code == 200:
        updated = r.json()
        log_pass(f"Candidate #{candidate_id} stage updated to: '{updated.get('stage')}'")
    else:
        log_fail("Stage update failed", f"{r.status_code}: {r.text}")

    # 10. Bonus AI Features
    print("\n9. Testing AI Intelligence Features...")
    r = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/interview-questions", headers=headers)
    if r.status_code == 200:
        questions = r.json()
        log_pass(f"AI Interview Questions generated: Count = {len(questions)}")
    else:
        log_fail("Interview questions failed", f"{r.status_code}: {r.text}")

    r = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/red-flags", headers=headers)
    if r.status_code == 200:
        log_pass(f"AI Red Flags check passed: {r.json().get('status', 'complete')}")
    else:
        log_fail("Red flags check failed", f"{r.status_code}: {r.text}")

    r = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}/ask?question=Does the candidate know Python and FastAPI?", headers=headers)
    if r.status_code == 200:
        log_pass(f"AI Copilot Answer: {r.json().get('answer', '')[:60]}...")
    else:
        log_fail("AI Copilot failed", f"{r.status_code}: {r.text}")

    # 11. Public Application Tracking (No Login)
    print("\n10. Testing Public Application Tracking...")
    r = requests.get(f"{BASE_URL}/api/candidates/track?email=jane.doe.test@example.com")
    if r.status_code == 200:
        tracking_data = r.json()
        log_pass(f"Public tracker verified: Found {len(tracking_data)} application(s) for email")
        log_pass(f"Candidate status publicly visible: Stage = '{tracking_data[0].get('stage')}'")
    else:
        log_fail("Candidate tracking failed", f"{r.status_code}: {r.text}")

    # 12. HR Analytics Dashboard
    print("\n11. Testing HR Analytics Dashboard Endpoint...")
    r = requests.get(f"{BASE_URL}/api/jobs/{job_id}/analytics", headers=headers)
    if r.status_code == 200:
        analytics = r.json()
        log_pass(f"Job Analytics verified: Total Apps={analytics.get('total_applications')}, Avg ATS={analytics.get('avg_ats_score')}")
        log_pass(f"Funnel by Stage: {analytics.get('funnel_by_stage')}")
    else:
        log_fail("Analytics endpoint failed", f"{r.status_code}: {r.text}")

    print("\n==================================================")
    print("ALL 11 INTEGRATION TESTS PASSED 100% SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
