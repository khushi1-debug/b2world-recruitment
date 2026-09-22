# B2World MVP Recruitment Platform — Setup Instructions

This zip already includes a working database (`backend/b2world.db`) pre-loaded with
demo accounts, 3 sample jobs, and 6 sample candidates — so you can see everything
working immediately without applying/posting anything yourself first.

## What's included / working right now

- User auth (register/login/roles)
- Job posting (recruiter/HR/admin) — org-wide dashboard visibility
- Public job browsing + candidate application (resume upload)
- AI resume screening via Gemini API (with automatic fallback scorer if no API key)
- **#1 — Candidate Notes History** (running chronological feedback log per candidate with author attribution, role badges, timestamps, and note deletion instead of a single overwritable note)
- **#2 — Candidate Custom Tags & Labels** (color-coded custom tags like "Referral", "Follow up", "Top Talent", "Urgent", "Needs Review", "Remote" with instant add/remove popovers, preset suggestions, tag-based filtering on both the Kanban board and Global Registry, and CSV export)
- **Step 6** — Automatic Shortlisting (candidates auto-placed by ATS score)
- **Step 7** — AI Candidate Summary (2-3 sentence AI summary per candidate)
- **Step 8** — Skill Gap Analysis (shows missing required skills per candidate)
- **Step 9** — Duplicate Candidate Detection (flags repeat applications)
- **Step 10** — AI Recommendation labels (Highly Recommended / Recommended / etc.)
- **Step 13** — HR Analytics Dashboard (avg score, common skills, funnel, experience distribution)
- Kanban-style candidate pipeline per job with Notes count badges, tag chips & interactive timeline
- "All Candidates" cross-job view with full Notes & Tags management
- "Track my application" (candidate self-service, by email only)

## Demo accounts (all use password: Demo@1234)

| Email | Role |
|---|---|
| admin@b2world.demo | super_admin |
| hr@b2world.demo | hr_manager |
| recruiter@b2world.demo | recruiter |
| pm@b2world.demo | project_manager |
| lead@b2world.demo | team_lead |
| dev@b2world.demo | developer |

## Setup — Backend

```powershell
cd backend
python3 -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Open `backend/.env` (copy from `.env.example` if it doesn't exist) and optionally add
your Gemini API key for real AI-generated summaries/scores:
```
GEMINI_API_KEY=your_key_here
```
(If left empty, the app automatically uses a working keyword-based fallback scorer —
nothing breaks either way.)

Then start the backend:
```powershell
uvicorn app.main:app --reload --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000` with no errors.

**DO NOT delete `b2world.db`** — it already has your demo data. If you ever do
delete it by mistake, run `python3 seed.py` to recreate demo accounts (jobs/candidates
won't come back unless you re-apply/re-post manually).

## Setup — Frontend

Open a new terminal:
```powershell
cd frontend
npm install
npm run dev
```

You should see: `Local: http://localhost:5173/`

## Try it out

1. Open http://localhost:5173
2. Login as `recruiter@b2world.demo` / `Demo@1234`
3. Go to **Dashboard** — see 3 jobs with live analytics (applicant counts, avg ATS score)
4. Click **View pipeline** on "AI/ML Engineer" — see 2 candidates with AI summaries,
   recommendation badges, and auto-assigned stages
5. Click **All candidates** in the navbar — see all 6 candidates across all 3 jobs in one table
6. Log out, go to **Track application**, enter `priya.sharma@example.com` — see her
   application status without logging in

## Verified working (tested end-to-end before packaging)

- ✅ Login/auth
- ✅ Job creation
- ✅ Resume upload + AI scoring
- ✅ Duplicate detection (flags repeat applications correctly)
- ✅ Kanban pipeline per job
- ✅ Analytics endpoint (avg score, common skills, funnel, experience buckets)
- ✅ Public application tracking by email
- ✅ All-candidates cross-job view

Every one of these was tested with real HTTP requests against the actual running
server before this zip was created — not just code review.
