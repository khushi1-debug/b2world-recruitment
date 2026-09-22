"""
Module 3: AI Resume Screening & Multi-Agent Recruitment Intelligence.

If GEMINI_API_KEY is set in .env, resumes and recruiter workflows are powered
by Google's Gemini API (structured JSON output: skills, experience_years, ats_score).

If no key is set or the API is unreachable, transparent rule-based fallback
scorers are used instead so the whole platform works out of the box with zero paid setup.
"""
import json
import logging
import re
from typing import Tuple, List, Optional

from app.config import settings

logger = logging.getLogger("b2world.ai")

STOPWORDS = {
    "the", "and", "a", "an", "to", "of", "in", "on", "for", "with", "is",
    "are", "we", "you", "our", "will", "be", "as", "at", "by", "or", "this",
    "that", "have", "has", "from", "years", "year", "experience", "work",
    "working", "strong", "good", "knowledge", "team", "role", "job",
}

AVAILABLE_GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
]


def _get_gemini_model():
    """Initializes and returns a configured Gemini GenerativeModel instance."""
    if not settings.GEMINI_API_KEY:
        return None
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    for model_name in AVAILABLE_GEMINI_MODELS:
        try:
            return genai.GenerativeModel(model_name)
        except Exception as e:
            logger.warning(f"Could not load model {model_name}: {e}")
            continue
    return genai.GenerativeModel("gemini-3.6-flash")


def _clean_json_text(raw: str) -> str:
    """Strips markdown code blocks, backticks, and extra whitespace to extract valid JSON."""
    raw = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _parse_json(raw: str):
    """Safely parse JSON from LLM response text."""
    cleaned = _clean_json_text(raw)
    try:
        return json.loads(cleaned)
    except Exception:
        # Fallback: find first { ... } or [ ... ]
        obj_match = re.search(r"(\{.*\}|\[.*\])", cleaned, flags=re.DOTALL)
        if obj_match:
            return json.loads(obj_match.group(1))
        raise


def _tokenize(text: str) -> List[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+.#]{1,}", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def _local_score(resume_text: str, job_description: str, skills_required: List[str]) -> dict:
    """A transparent, dependency-free fallback ATS scorer based on keyword overlap."""
    resume_tokens = set(_tokenize(resume_text))
    jd_tokens = set(_tokenize(job_description))
    required_skills = [s.lower().strip() for s in skills_required if s.strip()]

    matched_required = [s for s in required_skills if s.lower() in resume_text.lower()]
    skill_ratio = (len(matched_required) / len(required_skills)) if required_skills else 0.5

    overlap = resume_tokens & jd_tokens
    jd_ratio = (len(overlap) / len(jd_tokens)) if jd_tokens else 0.5

    score = round((0.7 * skill_ratio + 0.3 * jd_ratio) * 100, 1)
    score = max(0.0, min(100.0, score))

    # crude experience-years guess: look for patterns like "3 years", "5+ years"
    exp_match = re.search(r"(\d+)\+?\s*(?:years|yrs)", resume_text.lower())
    experience_years = float(exp_match.group(1)) if exp_match else 0.0

    extracted_skills = matched_required if matched_required else list(resume_tokens & jd_tokens)[:10]

    summary = (
        f"{experience_years:.0f} yrs experience. "
        f"Key skills: {', '.join(extracted_skills[:5]) or 'not clearly detected'}. "
        f"{'Matches most' if skill_ratio >= 0.6 else 'Matches some'} required skills for this role."
    )

    return {
        "ats_score": score,
        "extracted_skills": extracted_skills[:15],
        "experience_years": experience_years,
        "summary": summary,
    }


def _gemini_score(resume_text: str, job_description: str, skills_required: List[str]) -> dict:
    model = _get_gemini_model()
    if not model:
        raise ValueError("Gemini API key is not configured")

    prompt = f"""Read this resume and job description. Extract: skills, experience, education,
certifications. Calculate an ATS score from 0-100 based on how well the resume matches
the job description and required skills. Also write a short 2-3 sentence summary of the
candidate (their experience, key skills, and fit for this role) that a recruiter can read
instead of the full resume. Return ONLY valid JSON with keys exactly:
"ats_score" (number 0-100), "extracted_skills" (array of strings), "experience_years" (number),
"summary" (a 2-3 sentence string).

Job Description:
{job_description}

Required Skills: {', '.join(skills_required)}

Resume:
{resume_text[:6000]}
"""
    response = model.generate_content(prompt)
    data = _parse_json(response.text)
    return {
        "ats_score": float(data.get("ats_score", 0)),
        "extracted_skills": data.get("extracted_skills", []),
        "experience_years": float(data.get("experience_years", 0)),
        "summary": data.get("summary", ""),
    }


def score_resume(resume_text: str, job_description: str, skills_required: List[str]) -> Tuple[dict, str]:
    """
    Returns (result_dict, engine_used) where engine_used is "gemini" or "local_fallback".
    Never raises — always falls back to the local scorer on any error so the
    application flow is never blocked by an AI provider issue.
    """
    if settings.GEMINI_API_KEY:
        try:
            return _gemini_score(resume_text, job_description, skills_required), "gemini"
        except Exception as e:
            logger.warning(f"Gemini resume scoring error: {e}")
    return _local_score(resume_text, job_description, skills_required), "local_fallback"


def _generic_interview_questions(job_description: str, skills_required: List[str]) -> List[str]:
    """Fallback question set when no Gemini key is set."""
    questions = [
        f"Can you walk me through a project where you used {skills_required[0]}?"
        if skills_required else "Can you walk me through a recent project you're proud of?",
        "What's the most challenging technical problem you've solved recently, and how did you approach it?",
        "How do you stay updated with new tools and technologies in your field?",
        "Tell me about a time you disagreed with a teammate's technical approach. How did you handle it?",
    ]
    if len(skills_required) > 1:
        questions.append(f"How comfortable are you with {skills_required[1]}? Can you give an example of using it?")
    return questions


def generate_interview_questions(resume_text: str, job_description: str, skills_required: List[str]) -> List[str]:
    """AI Interview Question Generator tailored to this candidate's resume + job."""
    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Based on this candidate's resume and the job description below, generate
5 specific interview questions a recruiter should ask this candidate. Focus on their
actual experience mentioned in the resume, and on the required skills for the job.
Return ONLY a JSON array of 5 question strings, nothing else.

Job Description:
{job_description}

Required Skills: {', '.join(skills_required)}

Candidate Resume:
{resume_text[:4000]}
"""
            response = model.generate_content(prompt)
            questions = _parse_json(response.text)
            if isinstance(questions, list) and len(questions) > 0:
                return questions[:5]
        except Exception as e:
            logger.warning(f"Gemini question generation error: {e}")
    return _generic_interview_questions(job_description, skills_required)


def check_resume_red_flags(resume_text: str) -> dict:
    """AI Resume Fraud & Red-Flag Detection."""
    if not resume_text or len(resume_text.strip()) < 30:
        return {"flags": [], "note": "Resume text too short to analyze."}

    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Read this resume critically, the way an experienced recruiter would when
double-checking a candidate before an interview. Look for genuine red flags such as:
vague or generic claims with no specifics, unrealistic experience-to-seniority jumps,
buzzword-stuffing without concrete examples, skills listed once with no supporting
context elsewhere, inconsistent dates or timelines.

Be conservative - only flag things that are genuinely suspicious, not just informal
writing or minor typos. If nothing stands out, say so plainly.

Return ONLY valid JSON with this exact shape:
{{"flags": ["short specific flag 1", "short specific flag 2"], "note": "one sentence overall impression"}}
If there is nothing concerning, return {{"flags": [], "note": "No notable red flags found."}}

Resume:
{resume_text[:6000]}
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            return {
                "flags": data.get("flags", [])[:5],
                "note": data.get("note", ""),
            }
        except Exception as e:
            logger.warning(f"Gemini red flag check error: {e}")
    return {"flags": [], "note": "AI review unavailable right now - showing no flags rather than guessing."}


def suggest_offer(
    candidate_name: str,
    ats_score: float,
    experience_years: float,
    extracted_skills: List[str],
    salary_min: int,
    salary_max: int,
) -> dict:
    """AI Offer Recommendation constrained to the approved budget range."""
    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""A recruiter is deciding what salary to offer a candidate, within an
already-approved budget range for this role. Suggest a specific number within that
range based on how strong this candidate's profile is, and give a one-sentence reason.

Candidate: {candidate_name}
ATS match score: {ats_score}/100
Experience: {experience_years} years
Skills found on resume: {', '.join(extracted_skills) or 'none clearly detected'}

Approved salary range for this role: {salary_min} to {salary_max} (same currency as posted)

Return ONLY valid JSON: {{"suggested_salary": <number within the range>, "reason": "one sentence"}}
The suggested_salary MUST be between {salary_min} and {salary_max} inclusive.
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            suggested = float(data.get("suggested_salary", 0))
            suggested = max(salary_min, min(salary_max, suggested))
            return {"suggested_salary": suggested, "reason": data.get("reason", "")}
        except Exception as e:
            logger.warning(f"Gemini offer suggestion error: {e}")

    # Fallback: scale within range based on ATS score
    mid_point = salary_min + (salary_max - salary_min) * (ats_score / 100)
    return {
        "suggested_salary": round(mid_point),
        "reason": "Estimated from ATS score position within the approved range.",
    }


def _generic_skill_questions(skills_required: List[str]) -> List[dict]:
    """Fallback MCQs when no Gemini key is set."""
    if not skills_required:
        return []
    questions = []
    for skill in skills_required[:4]:
        questions.append({
            "question": f"How would you rate your hands-on experience with {skill}?",
            "options": ["No experience", "Basic/learning", "Comfortable, used in projects", "Expert level"],
            "correct_index": None,
        })
    return questions


def generate_skill_assessment(job_title: str, job_description: str, skills_required: List[str]) -> List[dict]:
    """AI Skill Assessment Generator creating multiple-choice questions."""
    if settings.GEMINI_API_KEY and skills_required:
        try:
            model = _get_gemini_model()
            prompt = f"""Create 4 multiple-choice technical screening questions for candidates
applying to this role. Base the questions on the required skills. Each question should
have 4 options with exactly one correct answer, testing real practical knowledge
(not trivia). Keep questions clear and job-relevant, medium difficulty.

Job Title: {job_title}
Required Skills: {', '.join(skills_required)}
Job Description: {job_description[:1000]}

Return ONLY a valid JSON array with exactly this shape for each item:
{{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0}}
correct_index is 0-based (0 = first option is correct).
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            if isinstance(data, list) and len(data) > 0:
                return data[:5]
        except Exception as e:
            logger.warning(f"Gemini skill assessment error: {e}")
    return _generic_skill_questions(skills_required)


_BIAS_PHRASES = [
    "young and energetic", "digital native", "recent graduate only",
    "native english speaker", "native speaker", "culture fit",
    "rockstar", "ninja", "guru", "young team", "energetic team",
    "able-bodied", "no visible disabilities", "must be male", "must be female",
]


def check_job_description_bias(job_description: str) -> dict:
    """AI Hiring Bias Detection on job description text."""
    text_lower = (job_description or "").lower()
    rule_based_flags = [p for p in _BIAS_PHRASES if p in text_lower]

    ai_flags = []
    if settings.GEMINI_API_KEY and job_description:
        try:
            model = _get_gemini_model()
            prompt = f"""Review this job description for language that could unintentionally
discourage qualified candidates from applying - age-coded phrases, gendered wording,
ability-related assumptions, or unnecessary exclusionary requirements. Be conservative:
only flag genuine concerns, not standard job posting phrasing.

Job Description:
{job_description[:3000]}

Return ONLY valid JSON: {{"flags": ["short specific flag with the phrase quoted"]}}
If nothing concerning, return {{"flags": []}}
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            ai_flags = data.get("flags", [])[:5]
        except Exception as e:
            logger.warning(f"Gemini bias check error: {e}")

    all_flags = list(dict.fromkeys(rule_based_flags + ai_flags))
    return {
        "flags": all_flags,
        "note": "No concerning language detected." if not all_flags else f"{len(all_flags)} thing(s) worth reviewing.",
    }


def predict_candidate_success(
    ats_score: float,
    experience_years: float,
    experience_min_required: float,
    missing_skills_count: int,
    total_required_skills: int,
) -> dict:
    """Estimates candidate pipeline progress likelihood."""
    ats_component = (ats_score or 0) / 100

    if experience_min_required and experience_min_required > 0:
        exp_ratio = min((experience_years or 0) / experience_min_required, 1.5) / 1.5
    else:
        exp_ratio = 1.0 if experience_years else 0.5

    if total_required_skills > 0:
        skill_match_ratio = max(0, (total_required_skills - missing_skills_count) / total_required_skills)
    else:
        skill_match_ratio = 1.0

    likelihood = (ats_component * 0.5 + skill_match_ratio * 0.3 + exp_ratio * 0.2) * 100
    likelihood = round(min(max(likelihood, 0), 100))

    if likelihood >= 75:
        label = "Strong fit"
    elif likelihood >= 50:
        label = "Reasonable fit"
    else:
        label = "Uncertain fit"

    return {
        "likelihood_percent": likelihood,
        "label": label,
        "note": "Estimate based on ATS score, skill match, and experience alignment.",
    }


def suggest_unbiased_rewrite(job_description: str, flags: List[str]) -> dict:
    """Rewrites job description to remove biased phrases while preserving requirements."""
    if not flags:
        return {"rewritten": job_description, "changed": False}

    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Rewrite this job description to remove the specific biased/exclusionary
phrases listed below, while keeping every actual requirement, skill, and detail intact.
Only change the flagged wording - do not add new requirements or remove real ones.

Phrases to remove or neutralize: {', '.join(flags)}

Original Job Description:
{job_description}

Return ONLY the rewritten job description text, nothing else - no JSON, no quotes, no preamble.
"""
            response = model.generate_content(prompt)
            rewritten = response.text.strip()
            if rewritten:
                return {"rewritten": rewritten, "changed": True}
        except Exception as e:
            logger.warning(f"Gemini bias rewrite error: {e}")
    return {"rewritten": job_description, "changed": False}


def ask_about_candidate(resume_text: str, question: str) -> str:
    """AI Recruiter Copilot: answers questions from candidate's resume."""
    if not resume_text or not question:
        return "Not enough information to answer that."

    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Answer the recruiter's question using ONLY information found in this
resume. If the resume doesn't mention something relevant to the question, say so plainly
instead of guessing or inventing details. Keep the answer to 2-3 sentences.

Resume:
{resume_text[:6000]}

Question: {question}

Answer:"""
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini copilot error: {e}")
    return "AI copilot is unavailable right now — check the resume directly or the summary."


def compare_candidates(candidate_a: dict, candidate_b: dict) -> dict:
    """AI Candidate Comparison evaluating strengths and relative fit."""
    def _fallback():
        score_a = candidate_a.get("ats_score") or 0
        score_b = candidate_b.get("ats_score") or 0
        if abs(score_a - score_b) < 3:
            winner = "Too close to call"
            reason = f"Both candidates have very similar ATS scores ({score_a} vs {score_b})."
        else:
            winner = candidate_a["name"] if score_a > score_b else candidate_b["name"]
            reason = f"Based on ATS score: {candidate_a['name']} ({score_a}%) vs {candidate_b['name']} ({score_b}%)."
        return {"stronger_candidate": winner, "reasoning": reason}

    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Compare these two candidates for the same role and say which one seems
like the stronger overall fit, with a brief specific reason. Be balanced - if it's genuinely
close, say so rather than forcing a winner.

Candidate A: {candidate_a['name']}
ATS Score: {candidate_a.get('ats_score')}
Experience: {candidate_a.get('experience_years')} years
Skills: {', '.join(candidate_a.get('skills', []))}
Summary: {candidate_a.get('summary', 'N/A')}

Candidate B: {candidate_b['name']}
ATS Score: {candidate_b.get('ats_score')}
Experience: {candidate_b.get('experience_years')} years
Skills: {', '.join(candidate_b.get('skills', []))}
Summary: {candidate_b.get('summary', 'N/A')}

Return ONLY valid JSON: {{"stronger_candidate": "name or 'Too close to call'", "reasoning": "1-2 sentences"}}
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            return {
                "stronger_candidate": data.get("stronger_candidate", "Too close to call"),
                "reasoning": data.get("reasoning", ""),
            }
        except Exception as e:
            logger.warning(f"Gemini comparison error: {e}")
    return _fallback()


def suggest_skill_gap_training(candidate_name: str, missing_skills: List[str], job_title: str) -> dict:
    """Suggests practical ways to close identified skill gaps."""
    if not missing_skills:
        return {"suggestions": [], "note": "No skill gaps to address."}

    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""A candidate is being considered for a {job_title} role but is missing
these skills: {', '.join(missing_skills)}. Suggest one concrete, practical way to close each
skill gap - a specific course, certification, or project type. Keep each suggestion to one
short sentence. This is optional constructive feedback a recruiter might share, not a
rejection - keep the tone encouraging.

Return ONLY valid JSON: {{"suggestions": [{{"skill": "...", "suggestion": "..."}}]}}
"""
            response = model.generate_content(prompt)
            data = _parse_json(response.text)
            suggestions = data.get("suggestions", [])
            if suggestions:
                return {"suggestions": suggestions[:5], "note": ""}
        except Exception as e:
            logger.warning(f"Gemini skill gap error: {e}")

    return {
        "suggestions": [
            {"skill": s, "suggestion": f"Consider a short online course or hands-on project involving {s}."}
            for s in missing_skills[:5]
        ],
        "note": "",
    }


def generate_job_description(title: str, skills_required: List[str], experience_min) -> dict:
    """Drafts starting job description using Gemini."""
    if settings.GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prompt = f"""Write a clear, professional job description draft for this role.
Include: a short intro paragraph, key responsibilities (3-4 bullet-style sentences woven
into prose, not markdown bullets), and what makes a good fit. Keep it to 4-6 sentences
total, plain language, no buzzwords like "rockstar" or "ninja". This is a draft for a
recruiter to review and edit, not a final posting.

Job Title: {title}
Required Skills: {', '.join(skills_required)}
Minimum Experience: {experience_min} years

Return ONLY the description text, nothing else - no JSON, no quotes, no preamble.
"""
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text:
                return {"description": text, "ai_generated": True}
        except Exception as e:
            logger.warning(f"Gemini job description draft error: {e}")

    skills_text = ', '.join(skills_required) if skills_required else "the required skills"
    fallback = (
        f"We're looking for a {title} to join our team. The ideal candidate has "
        f"{experience_min}+ years of experience and is skilled in {skills_text}. "
        f"You'll work closely with the team on real projects, contributing your expertise "
        f"in {skills_text}. We value clear communication, ownership, and a willingness to learn."
    )
    return {"description": fallback, "ai_generated": False}