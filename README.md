# B2World — AI Recruitment & Workforce Management Platform (MVP)

This is a working build of the **"Must Have" modules** from your project understanding
document: Auth (Module 1), Job Management (Module 2), AI Resume Screening (Module 3),
and the Candidate Pipeline (Module 6). It runs end-to-end on your machine with a real
database, real password hashing, real JWT auth, and a real (optionally AI-powered)
resume screener.

Modules 4, 5, 7–11 (Voice AI/Twilio, Calendar/Zoom scheduling, Project & Sprint
management, Analytics) are **not built** — they need paid third-party accounts
(Twilio, Google Cloud, Zoom) that only you can set up, and Project/Sprint management
is a large separate build. See "What's next" at the bottom for how to extend this.

---

## 1. What's included

```
b2world/
├── backend/          FastAPI + SQLAlchemy + JWT auth + SQLite (or Postgres)
│   ├── app/
│   │   ├── main.py           FastAPI app entrypoint
│   │   ├── config.py         Settings (reads .env)
│   │   ├── database.py       DB engine/session
│   │   ├── models.py         User, Job, Candidate, PasswordResetToken tables
│   │   ├── schemas.py        Request/response validation
│   │   ├── security.py       Password hashing + JWT
│   │   ├── deps.py           Auth dependencies / role guards
│   │   ├── routers/
│   │   │   ├── auth.py       register, login, forgot/reset password, /me
│   │   │   ├── jobs.py       job CRUD + public listing
│   │   │   └── candidates.py resume upload, ATS scoring, candidate tags/labels, notes log, Kanban stage updates
│   │   └── utils/
│   │       ├── email.py          SendGrid or console-print fallback
│   │       ├── resume_parser.py  PDF/DOCX/TXT text extraction
│   │       └── ai_screening.py   Gemini scoring or local fallback scorer
│   ├── seed.py            Creates one demo user per role
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/         React + Vite
    └── src/
        ├── pages/     Login, Register, ForgotPassword, ResetPassword,
        │              Home, Jobs, JobDetail, PostJob, Candidates, Dashboard
        ├── components/Navbar, AuthLayout, ProtectedRoute
        ├── context/AuthContext.jsx
        └── api/client.js
```

## 2. Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) A Gemini API key for real AI resume scoring
- (Optional) A SendGrid API key for real emails

Nothing else is required — the app runs with zero paid accounts using SQLite and
local fallbacks.

## 3. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # edit if you want Postgres / Gemini / SendGrid
python3 seed.py                 # creates demo users for every role (optional but recommended)

uvicorn app.main:app --reload --port 8000
```

Backend is now at **http://localhost:8000**. Interactive API docs (Swagger, as your
plan called for) are auto-generated at **http://localhost:8000/docs**.

### Demo accounts (created by `seed.py`), all with password `Demo@1234`
| Email | Role |
|---|---|
| admin@b2world.demo | Super Admin |
| hr@b2world.demo | HR Manager |
| recruiter@b2world.demo | Recruiter |
| pm@b2world.demo | Project Manager |
| lead@b2world.demo | Team Lead |
| dev@b2world.demo | Developer |

Candidates aren't seeded — register one from the app's Register page.

## 4. Run the frontend

Open a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env            # only needed if backend isn't on localhost:8000
npm run dev
```

Frontend is now at **http://localhost:5173**.

## 5. Try it out

1. Go to `http://localhost:5173/register` and create an account, or log in with
   `hr@b2world.demo` / `Demo@1234`.
2. As HR/Recruiter/Super Admin: **Post a job** → publish it.
3. Log out, go to **Jobs**, open the job, and **apply** with a resume (PDF/DOCX/TXT).
   You'll immediately see the AI-computed ATS score.
4. Log back in as HR and open **Dashboard → View pipeline** to see the candidate on
   the Kanban board. Move them between stages with the dropdown on each card.
5. Try **Forgot password** on the login page — since no email provider is configured
   by default, the reset link is printed straight to the **backend terminal**. Copy
   it into your browser to complete the reset.

## 6. Turning on real AI scoring and real email (optional)

In `backend/.env`:
- Set `GEMINI_API_KEY` to score resumes with Gemini 1.5 Flash instead of the local
  keyword-matching fallback. No code changes needed — it's used automatically once set.
- Set `SENDGRID_API_KEY` and `FROM_EMAIL` to send real password-reset emails instead
  of printing them to the console.

## 7. Moving to Postgres / Neon (for deployment)

In `backend/.env`, change:
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```
Then reinstall requirements (psycopg2-binary is already included) and restart —
`Base.metadata.create_all` will create the tables on first run. For a real
production rollout, replace this with Alembic migrations.

## 8. Security notes (what's actually implemented)

- Passwords are hashed with **bcrypt** (via passlib) — never stored in plain text.
- Auth uses **JWT** access tokens (1 hour expiry by default, configurable).
- Login and forgot-password return **identical generic responses** whether or not
  the email exists, so neither endpoint can be used to enumerate registered users.
- Password reset tokens are **single-use, time-limited, cryptographically random**,
  and stored server-side so a token can be invalidated after use.
- All job/candidate mutation endpoints are **role-gated** on the backend (not just
  hidden in the UI) — tested that a `candidate`-role token gets a 403 on job creation.
- File uploads are restricted to `.pdf/.docx/.txt`, size-capped at 5MB, and saved
  under a randomly generated filename (the original filename is never trusted).

## 9. What's next (matches your own Phase 3–5 roadmap)

- **Module 4 (Voice AI)**: needs a Twilio (or Exotel) account + webhook setup.
- **Module 5 (Scheduling)**: needs Google Calendar OAuth + Zoom/Teams API keys.
- **Modules 7–10 (Project/Sprint mgmt)**: new tables + endpoints, same patterns as
  Jobs/Candidates here — Gemini can generate tasks and suggest assignments the same
  way it scores resumes.
- **Module 11 (Analytics)**: once there's real usage data, add aggregation endpoints
  and chart them with Recharts on the frontend.
- **Deployment**: frontend → Vercel (`npm run build`, deploy `dist/`), backend →
  Render/VPS (`uvicorn app.main:app`), database → Neon Postgres.
