# B2World — AI Recruitment & Workforce Intelligence Platform 🚀

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.0-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg?style=flat&logo=PostgreSQL&logoColor=white)](https://supabase.com)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI%20Screening-8E75B2.svg?style=flat&logo=Google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Developed by Khushi during internship at B2World.**  
> An intelligent, end-to-end recruitment platform that automates candidate screening, computes real-time ATS match scores using **Google Gemini AI**, routes candidates through dynamic Kanban pipelines, and provides self-service application tracking.

---

## 🌟 Key Highlights & Features

### 🧠 1. AI-Powered Resume Screening & ATS Scorer
- **Multimodal Parser**: Extracts and analyzes text from **PDF, DOCX, and TXT** resume uploads.
- **Google Gemini Integration**: Uses state-of-the-art Gemini LLMs to evaluate candidate qualifications, match required skills, and generate an executive AI summary with actionable recommendations.
- **Automated Score-Based Pipeline Routing**:
  - 🟢 **Score ≥ 80%**: Automatically routed to **Shortlisted**
  - 🟡 **60% ≤ Score < 80%**: Automatically routed to **Screened**
  - 🔴 **Score < 60%**: Automatically routed to **Rejected** (with constructive feedback)

### 📊 2. Interactive Recruiter Kanban Pipeline
- **Visual Drag-and-Drop / Stage Selectors**: Move candidates seamlessly across recruitment stages (`Applied` ➔ `Screened` ➔ `Shortlisted` ➔ `Interview Scheduled` ➔ `Technical Round` ➔ `HR Round` ➔ `Selected` ➔ `Joined`).
- **Feedback & Notes Log**: Multi-user feedback timeline allowing recruiters, hiring managers, and team leads to log timestamped evaluation notes.
- **Custom Candidate Tagging**: Add custom labels (e.g., *Top Talent*, *Referral*, *Remote*, *Follow Up*) for fast filtering.

### 🔎 3. Public Application Tracker (`/track-application`)
- **Self-Service Candidate Portal**: Candidates can search by their email address to view real-time application progress, stage updates, and interview timelines without logging in.

### 🔐 4. Enterprise-Grade Role-Based Access Control (RBAC)
- **Granular Permissions**: Strict backend authorization guards protecting candidate data and administrative actions across 6 roles:
  - **Super Admin**: Full administrative control and user management.
  - **HR Manager**: Job approvals, candidate offers, and pipeline oversight.
  - **Recruiter**: Job posting, resume parsing, candidate communications, and Kanban management.
  - **Project Manager / Team Lead / Developer**: Interview evaluations and team notes.
- **JWT + Bcrypt Security**: Secure cryptographic tokens, salted password hashing, and single-use time-limited password reset tokens.

### 🎨 5. Modern Obsidian Dark UI & Mobile Responsiveness
- **High-End Design System**: Crafted with glassmorphism, tailored gradients, and smooth micro-animations.
- **Mobile First**: Full responsive navigation with animated mobile drawer menu tested across smartphone, tablet, and desktop viewports.

---

## 🛠️ Architecture & Tech Stack

```
b2world-recruitment/
├── backend/                  # FastAPI REST API Backend
│   ├── app/
│   │   ├── main.py           # Application entrypoint & CORS middleware
│   │   ├── config.py         # Pydantic environment configuration
│   │   ├── database.py       # SQLAlchemy engine (Supabase PostgreSQL / SQLite)
│   │   ├── models.py         # Relational database models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── security.py       # Bcrypt hashing & JWT token handling
│   │   ├── deps.py           # RBAC dependency guards
│   │   ├── routers/
│   │   │   ├── auth.py       # Login, register, password reset, /me
│   │   │   ├── jobs.py       # Job CRUD & public listings
│   │   │   └── candidates.py # Resume uploads, AI ATS routing, notes, tags
│   │   └── utils/
│   │       ├── ai_screening.py   # Google Gemini API & fallback engine
│   │       ├── resume_parser.py  # PDF/DOCX/TXT text extractor
│   │       └── email.py          # Email notification service
│   ├── seed.py               # Demo data seeder
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React 18 + Vite SPA Frontend
    ├── src/
    │   ├── pages/            # Home, Jobs, JobDetail, Candidates, Dashboard, TrackApplication
    │   ├── components/       # Navbar, AuthLayout, ProtectedRoute, Icons
    │   ├── context/          # Global AuthContext & state management
    │   ├── api/              # Axios client with interceptors
    │   └── styles/           # Obsidian dark CSS design system
    ├── vercel.json           # SPA rewrite rules
    └── package.json          # Node dependencies
```

---

## 🔑 Demo Accounts for Review

The platform includes pre-seeded demo accounts (Password: `Demo@1234`):

| Role | Email | Capabilities |
| :--- | :--- | :--- |
| **Super Admin** | `admin@b2world.demo` | Full system control, analytics & user management |
| **Recruiter** | `recruiter@b2world.demo` | Job posting, AI resume screening, Kanban pipeline, candidate notes |
| **HR Manager** | `hr@b2world.demo` | Candidate offers, hiring analytics, interview scheduling |
| **Candidate** | *Public / No login* | Explore job board, apply with resume, public tracking |

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Git**

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed sample data (users, jobs, candidates)
python seed.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
API Documentation (Swagger UI) available at: **http://localhost:8000/docs**

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: **http://localhost:5173**

---

## ☁️ Deployment Guide

### Backend on [Render](https://render.com) (or Railway)
1. Create a **New Web Service** linked to this repo.
2. Root Directory: `backend` (or `b2world_mvp_recruitment/backend`)
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set Environment Variables:
   - `DATABASE_URL`: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`
   - `GEMINI_API_KEY`: `your_gemini_api_key`
   - `SECRET_KEY`: `your_secret_key`
   - `FRONTEND_ORIGIN`: `*`

### Frontend on [Vercel](https://vercel.com)
1. Import GitHub repository into Vercel.
2. Root Directory: `frontend` (or `b2world_mvp_recruitment/frontend`)
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Set Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com`

---

## 👩‍💻 Author & Internship Credits
- **Developer**: Khushi
- **Internship**: AI/ML Internship at B2World
- **Repository**: [github.com/khushi1-debug/b2world-recruitment](https://github.com/khushi1-debug/b2world-recruitment.git)
